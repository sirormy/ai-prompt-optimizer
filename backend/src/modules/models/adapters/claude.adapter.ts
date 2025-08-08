import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { BaseModelAdapter } from './base-model.adapter';
import {
  OptimizationRule,
  PromptStructure,
  ModelConfig,
  ValidationResult,
} from '../interfaces/model-adapter.interface';
import { OptimizationRequest, OptimizationResult, Improvement, Suggestion } from '../dto';

/**
 * Claude模型适配器
 * 实现Anthropic Claude模型的提示词优化功能
 */
@Injectable()
export class ClaudeAdapter extends BaseModelAdapter {
  private anthropic: Anthropic;

  readonly name = 'claude-3-sonnet';
  readonly provider = 'anthropic';
  readonly version = '3.0';
  readonly maxTokens = 200000;
  readonly supportedRoles = ['user', 'assistant'];

  constructor(config: ModelConfig) {
    super(config);
    this.anthropic = new Anthropic({
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
      this.logger.log(`Starting optimization for Claude model: ${request.prompt.substring(0, 100)}...`);

      // 1. 验证输入
      const validation = await this.validate(request.prompt);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 2. 应用基础优化规则
      const rules = this.getModelSpecificRules();
      const { optimizedPrompt: ruleOptimized, appliedRules, improvements } = 
        this.applyOptimizationRules(request.prompt, rules);

      // 3. 使用Claude API进行高级优化
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
      this.logger.error('Claude optimization failed:', error);
      throw new Error(`Claude optimization failed: ${error.message}`);
    }
  }

  /**
   * 使用Claude API进行高级优化
   */
  private async performAIOptimization(prompt: string, request: OptimizationRequest): Promise<string> {
    const systemPrompt = this.buildOptimizationSystemPrompt(request.optimizationLevel);
    
    try {
      // 对于当前版本的SDK，先返回基于规则的优化结果
      // TODO: 在SDK版本更新后实现完整的API调用
      this.logger.warn('Claude API optimization not fully implemented, using rule-based optimization');
      
      // 应用基础优化规则作为临时解决方案
      const rules = this.getModelSpecificRules();
      const { optimizedPrompt } = this.applyOptimizationRules(prompt, rules);
      
      return optimizedPrompt;
    } catch (error) {
      this.logger.error('Claude API optimization failed:', error);
      return prompt;
    }
  }

  /**
   * 构建优化系统提示词
   */
  private buildOptimizationSystemPrompt(level: string): string {
    const basePrompt = `你是一个专业的AI提示词优化专家，专门优化适用于Claude模型的提示词。

Claude模型特点：
1. 擅长长文本理解和生成
2. 注重安全性和有用性
3. 支持复杂的推理任务
4. 偏好结构化的指令

优化原则：
1. 保持原意不变
2. 使指令更加结构化和逻辑清晰
3. 充分利用Claude的长上下文能力
4. 确保内容安全和有益
5. 使用适合Claude的表达方式

请直接返回优化后的提示词，不要添加额外的解释。`;

    switch (level) {
      case 'basic':
        return basePrompt + '\n\n进行基础优化，主要关注结构化和清晰度。';
      case 'advanced':
        return basePrompt + '\n\n进行高级优化，包括逻辑重组和上下文增强。';
      case 'expert':
        return basePrompt + '\n\n进行专家级优化，充分利用Claude的推理和长文本能力。';
      default:
        return basePrompt;
    }
  }

  /**
   * 格式化提示词以适应Claude模型
   */
  formatForModel(prompt: PromptStructure): string {
    let formatted = '';

    // Claude不支持system role在messages中，需要使用system参数
    if (prompt.systemPrompt) {
      formatted += `<instructions>\n${prompt.systemPrompt}\n</instructions>\n\n`;
    }

    // Claude偏好结构化的输入
    formatted += `<task>\n${prompt.userPrompt}\n</task>`;

    return formatted;
  }

  /**
   * 估算token使用量
   */
  async estimateTokens(text: string): Promise<number> {
    // Claude的token计算与OpenAI类似，但稍有不同
    // 1 token ≈ 3.5 characters for English, ≈ 1.8 characters for Chinese
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 1.8 + otherChars / 3.5);
  }

  /**
   * 获取Claude特定的优化规则
   */
  getModelSpecificRules(): OptimizationRule[] {
    const baseRules = super.getModelSpecificRules();
    
    const claudeRules: OptimizationRule[] = [
      {
        id: 'claude-structured-thinking',
        name: 'Claude结构化思考',
        description: '使用结构化标签组织思考过程',
        category: 'claude-specific',
        priority: 1,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => text.length > 100 && !text.includes('<') && !text.includes('>'),
      },
      {
        id: 'claude-safety-first',
        name: 'Claude安全优先',
        description: '确保请求符合Claude的安全准则',
        category: 'safety',
        priority: 1,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => true, // 总是检查安全性
      },
      {
        id: 'claude-long-context',
        name: 'Claude长上下文利用',
        description: '充分利用Claude的长上下文能力',
        category: 'context',
        priority: 2,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => text.length < 200,
      },
      {
        id: 'claude-reasoning-chain',
        name: 'Claude推理链',
        description: '构建清晰的推理链条',
        category: 'reasoning',
        priority: 2,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => !text.includes('思考') && !text.includes('分析'),
      },
    ];

    return [...baseRules, ...claudeRules];
  }

  /**
   * Claude特定的验证
   */
  async validate(prompt: string): Promise<ValidationResult> {
    const baseValidation = await super.validate(prompt);
    
    // Claude特定的验证规则
    const claudeErrors = [];
    const claudeWarnings = [];

    // 检查是否包含有害内容
    const harmfulPatterns = ['暴力', '仇恨', '歧视', '违法'];
    for (const pattern of harmfulPatterns) {
      if (prompt.includes(pattern)) {
        claudeErrors.push({
          code: 'HARMFUL_CONTENT',
          message: `提示词可能包含有害内容: ${pattern}`,
          severity: 'error' as const,
        });
      }
    }

    // 检查是否充分利用长上下文
    if (prompt.length < 100) {
      claudeWarnings.push({
        code: 'UNDERUTILIZED_CONTEXT',
        message: 'Claude支持长上下文，可以提供更多详细信息',
        suggestion: '考虑添加更多背景信息和具体要求',
      });
    }

    // 检查结构化程度
    if (!prompt.includes('\n') && prompt.length > 50) {
      claudeWarnings.push({
        code: 'LACK_STRUCTURE',
        message: '建议使用结构化格式组织提示词',
        suggestion: '使用换行、标签或列表来组织内容',
      });
    }

    return {
      isValid: baseValidation.isValid && claudeErrors.length === 0,
      errors: [...baseValidation.errors, ...claudeErrors],
      warnings: [...baseValidation.warnings, ...claudeWarnings],
      suggestions: baseValidation.suggestions,
    };
  }

  /**
   * 生成Claude特定的建议
   */
  protected generateSuggestions(prompt: string): Suggestion[] {
    const baseSuggestions = super.generateSuggestions(prompt);
    
    const claudeSuggestions: Suggestion[] = [];

    // 结构化建议
    if (!prompt.includes('<') && !prompt.includes('>')) {
      claudeSuggestions.push({
        id: 'use-xml-tags',
        type: 'structure',
        title: '使用XML标签',
        description: 'Claude偏好使用XML标签来结构化内容',
        priority: 1,
        category: 'claude-specific',
        example: '使用<task>、<context>、<instructions>等标签组织内容',
      });
    }

    // 长上下文建议
    if (prompt.length < 200) {
      claudeSuggestions.push({
        id: 'utilize-long-context',
        type: 'context',
        title: '利用长上下文能力',
        description: 'Claude支持长上下文，可以提供更详细的信息',
        priority: 2,
        category: 'optimization',
        example: '添加更多背景信息、示例或详细的要求说明',
      });
    }

    return [...baseSuggestions, ...claudeSuggestions];
  }

  /**
   * 检查Claude API连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      // 对于当前版本的SDK，简单检查API密钥是否存在
      // TODO: 在SDK版本更新后实现完整的连接检查
      this.logger.warn('Claude connection check simplified due to SDK version');
      return !!this.config.apiKey && this.config.apiKey.length > 0;
    } catch (error) {
      this.logger.error('Claude connection check failed:', error);
      return false;
    }
  }
}