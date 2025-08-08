import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { BaseModelAdapter } from './base-model.adapter';
import {
  OptimizationRule,
  PromptStructure,
  ModelConfig,
  ValidationResult,
} from '../interfaces/model-adapter.interface';
import { OptimizationRequest, OptimizationResult, Improvement, Suggestion } from '../dto';

/**
 * OpenAI模型适配器
 * 实现OpenAI GPT模型的提示词优化功能
 */
@Injectable()
export class OpenAIAdapter extends BaseModelAdapter {
  private openai: OpenAI;

  readonly name = 'gpt-4';
  readonly provider = 'openai';
  readonly version = '4.0';
  readonly maxTokens = 8192;
  readonly supportedRoles = ['system', 'user', 'assistant'];

  constructor(config: ModelConfig) {
    super(config);
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    });
  }

  /**
   * 优化提示词
   */
  async optimize(request: OptimizationRequest): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting optimization for OpenAI model: ${request.prompt.substring(0, 100)}...`);

      // 1. 验证输入
      const validation = await this.validate(request.prompt);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 2. 应用基础优化规则
      const rules = this.getModelSpecificRules();
      const { optimizedPrompt: ruleOptimized, appliedRules, improvements } = 
        this.applyOptimizationRules(request.prompt, rules);

      // 3. 使用OpenAI API进行高级优化
      const aiOptimized = await this.performAIOptimization(ruleOptimized, request);

      // 4. 生成建议
      const suggestions = this.generateSuggestions(request.prompt);

      // 5. 估算token使用量
      const originalTokens = await this.estimateTokens(request.prompt);
      const optimizedTokens = await this.estimateTokens(aiOptimized);

      // 6. 计算置信度
      const confidence = this.calculateConfidence(improvements);

      const result: OptimizationResult = {
        id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalPrompt: request.prompt,
        optimizedPrompt: aiOptimized,
        improvements,
        confidence,
        appliedRules,
        suggestions,
        estimatedTokens: {
          original: originalTokens,
          optimized: optimizedTokens,
          saved: originalTokens - optimizedTokens,
        },
        processingTime: Date.now() - startTime,
        modelUsed: this.name,
      };

      this.logOptimization(request, result);
      return result;

    } catch (error) {
      this.logger.error('OpenAI optimization failed:', error);
      throw new Error(`OpenAI optimization failed: ${error.message}`);
    }
  }

  /**
   * 使用OpenAI API进行高级优化
   */
  private async performAIOptimization(prompt: string, request: OptimizationRequest): Promise<string> {
    const systemPrompt = this.buildOptimizationSystemPrompt(request.optimizationLevel);
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请优化以下提示词：\n\n${prompt}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || prompt;
  }

  /**
   * 构建优化系统提示词
   */
  private buildOptimizationSystemPrompt(level: string): string {
    const basePrompt = `你是一个专业的AI提示词优化专家。你的任务是优化用户提供的提示词，使其更加清晰、具体和有效。

优化原则：
1. 保持原意不变
2. 使指令更加明确和具体
3. 添加必要的上下文信息
4. 指定期望的输出格式
5. 使用适合GPT模型的表达方式

请直接返回优化后的提示词，不要添加额外的解释。`;

    switch (level) {
      case 'basic':
        return basePrompt + '\n\n进行基础优化，主要关注清晰度和准确性。';
      case 'advanced':
        return basePrompt + '\n\n进行高级优化，包括结构重组和上下文增强。';
      case 'expert':
        return basePrompt + '\n\n进行专家级优化，全面提升提示词的效果和精确度。';
      default:
        return basePrompt;
    }
  }

  /**
   * 格式化提示词以适应OpenAI模型
   */
  formatForModel(prompt: PromptStructure): string {
    let formatted = '';

    if (prompt.systemPrompt) {
      formatted += `System: ${prompt.systemPrompt}\n\n`;
    }

    formatted += `User: ${prompt.userPrompt}`;

    return formatted;
  }

  /**
   * 估算token使用量
   */
  async estimateTokens(text: string): Promise<number> {
    // 简单的token估算，实际应用中可以使用tiktoken库
    // 1 token ≈ 4 characters for English, ≈ 2 characters for Chinese
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 2 + otherChars / 4);
  }

  /**
   * 获取OpenAI特定的优化规则
   */
  getModelSpecificRules(): OptimizationRule[] {
    const baseRules = super.getModelSpecificRules();
    
    const openaiRules: OptimizationRule[] = [
      {
        id: 'openai-role-clarity',
        name: 'OpenAI角色明确',
        description: '为OpenAI模型明确指定角色和任务',
        category: 'openai-specific',
        priority: 1,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => !text.includes('你是') && !text.includes('作为'),
      },
      {
        id: 'openai-step-by-step',
        name: 'OpenAI分步思考',
        description: '引导模型进行分步思考',
        category: 'reasoning',
        priority: 2,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => text.length > 100 && !text.includes('步骤') && !text.includes('step'),
      },
      {
        id: 'openai-examples',
        name: 'OpenAI示例提供',
        description: '为复杂任务提供示例',
        category: 'examples',
        priority: 3,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => text.length > 50 && !text.includes('例如') && !text.includes('示例'),
      },
    ];

    return [...baseRules, ...openaiRules];
  }

  /**
   * OpenAI特定的验证
   */
  async validate(prompt: string): Promise<ValidationResult> {
    const baseValidation = await super.validate(prompt);
    
    // OpenAI特定的验证规则
    const openaiErrors = [];
    const openaiWarnings = [];

    // 检查是否包含不当内容
    if (prompt.includes('hack') || prompt.includes('破解')) {
      openaiErrors.push({
        code: 'INAPPROPRIATE_CONTENT',
        message: '提示词可能包含不当内容',
        severity: 'error' as const,
      });
    }

    // 检查token限制
    const estimatedTokens = await this.estimateTokens(prompt);
    if (estimatedTokens > this.maxTokens * 0.8) {
      openaiWarnings.push({
        code: 'TOKEN_LIMIT_WARNING',
        message: `提示词接近token限制 (${estimatedTokens}/${this.maxTokens})`,
        suggestion: '考虑缩短提示词或分解为多个请求',
      });
    }

    return {
      isValid: baseValidation.isValid && openaiErrors.length === 0,
      errors: [...baseValidation.errors, ...openaiErrors],
      warnings: [...baseValidation.warnings, ...openaiWarnings],
      suggestions: baseValidation.suggestions,
    };
  }

  /**
   * 检查OpenAI API连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.openai.models.list();
      return response.data.length > 0;
    } catch (error) {
      this.logger.error('OpenAI connection check failed:', error);
      return false;
    }
  }
}