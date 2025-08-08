import { Injectable, Logger } from '@nestjs/common';
import { BaseModelAdapter } from './base-model.adapter';
import {
  OptimizationRule,
  PromptStructure,
  ModelConfig,
  ValidationResult,
} from '../interfaces/model-adapter.interface';
import { OptimizationRequest, OptimizationResult, Improvement, Suggestion } from '../dto';

/**
 * DeepSeek API响应接口
 */
interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * DeepSeek模型适配器
 * 实现DeepSeek模型的提示词优化功能
 */
@Injectable()
export class DeepSeekAdapter extends BaseModelAdapter {
  private readonly apiUrl: string;
  private readonly headers: Record<string, string>;

  readonly name = 'deepseek-chat';
  readonly provider = 'deepseek';
  readonly version = '1.0';
  readonly maxTokens = 32768;
  readonly supportedRoles = ['system', 'user', 'assistant'];

  constructor(config: ModelConfig) {
    super(config);
    this.apiUrl = config.baseUrl || 'https://api.deepseek.com/v1/chat/completions';
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  /**
   * 优化提示词
   */
  async optimize(request: OptimizationRequest): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting optimization for DeepSeek model: ${request.prompt.substring(0, 100)}...`);

      // 1. 验证输入
      const validation = await this.validate(request.prompt);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 2. 应用基础优化规则
      const rules = this.getModelSpecificRules();
      const { optimizedPrompt: ruleOptimized, appliedRules, improvements } = 
        this.applyOptimizationRules(request.prompt, rules);

      // 3. 使用DeepSeek API进行高级优化
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
      this.logger.error('DeepSeek optimization failed:', error);
      throw new Error(`DeepSeek optimization failed: ${error.message}`);
    }
  }

  /**
   * 使用DeepSeek API进行高级优化
   */
  private async performAIOptimization(prompt: string, request: OptimizationRequest): Promise<string> {
    const systemPrompt = this.buildOptimizationSystemPrompt(request.optimizationLevel);
    
    const requestBody = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请优化以下提示词，使其更适合DeepSeek模型：\n\n${prompt}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: false,
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }

      const data: DeepSeekResponse = await response.json();
      return data.choices[0]?.message?.content || prompt;

    } catch (error) {
      this.logger.error('DeepSeek API call failed:', error);
      throw error;
    }
  }

  /**
   * 构建优化系统提示词
   */
  private buildOptimizationSystemPrompt(level: string): string {
    const basePrompt = `你是一个专业的AI提示词优化专家，专门优化适用于DeepSeek模型的提示词。

DeepSeek模型特点：
1. 强大的代码理解和生成能力
2. 优秀的数学和逻辑推理能力
3. 支持中英文双语处理
4. 擅长复杂问题的分析和解决

优化原则：
1. 保持原意不变
2. 充分利用DeepSeek的推理能力
3. 使用清晰的逻辑结构
4. 适当添加思维链提示
5. 优化代码相关的提示词格式

请直接返回优化后的提示词，不要添加额外的解释。`;

    switch (level) {
      case 'basic':
        return basePrompt + '\n\n进行基础优化，主要关注逻辑清晰度。';
      case 'advanced':
        return basePrompt + '\n\n进行高级优化，包括推理链构建和结构优化。';
      case 'expert':
        return basePrompt + '\n\n进行专家级优化，充分利用DeepSeek的推理和代码能力。';
      default:
        return basePrompt;
    }
  }

  /**
   * 格式化提示词以适应DeepSeek模型
   */
  formatForModel(prompt: PromptStructure): string {
    let formatted = '';

    if (prompt.systemPrompt) {
      formatted += `# 系统指令\n${prompt.systemPrompt}\n\n`;
    }

    // DeepSeek偏好清晰的结构化输入
    formatted += `# 任务\n${prompt.userPrompt}`;

    // 如果是代码相关任务，添加代码块格式提示
    if (prompt.userPrompt.includes('代码') || prompt.userPrompt.includes('code') || 
        prompt.userPrompt.includes('编程') || prompt.userPrompt.includes('program')) {
      formatted += '\n\n请使用适当的代码块格式输出结果。';
    }

    return formatted;
  }

  /**
   * 估算token使用量
   */
  async estimateTokens(text: string): Promise<number> {
    // DeepSeek的token计算类似于OpenAI
    // 1 token ≈ 4 characters for English, ≈ 2 characters for Chinese
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 2 + otherChars / 4);
  }

  /**
   * 获取DeepSeek特定的优化规则
   */
  getModelSpecificRules(): OptimizationRule[] {
    const baseRules = super.getModelSpecificRules();
    
    const deepseekRules: OptimizationRule[] = [
      {
        id: 'deepseek-reasoning-chain',
        name: 'DeepSeek推理链',
        description: '构建清晰的推理链条以利用DeepSeek的推理能力',
        category: 'deepseek-specific',
        priority: 1,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => text.length > 50 && !text.includes('思考') && !text.includes('推理'),
      },
      {
        id: 'deepseek-code-optimization',
        name: 'DeepSeek代码优化',
        description: '优化代码相关的提示词格式',
        category: 'code',
        priority: 1,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => 
          (text.includes('代码') || text.includes('code') || text.includes('编程')) &&
          !text.includes('```'),
      },
      {
        id: 'deepseek-math-logic',
        name: 'DeepSeek数学逻辑',
        description: '优化数学和逻辑推理相关的提示词',
        category: 'math',
        priority: 2,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => 
          (text.includes('计算') || text.includes('数学') || text.includes('逻辑')) &&
          !text.includes('步骤'),
      },
      {
        id: 'deepseek-bilingual',
        name: 'DeepSeek双语优化',
        description: '优化中英文混合的提示词',
        category: 'language',
        priority: 3,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => {
          const hasEnglish = /[a-zA-Z]/.test(text);
          const hasChinese = /[\u4e00-\u9fff]/.test(text);
          return hasEnglish && hasChinese;
        },
      },
    ];

    return [...baseRules, ...deepseekRules];
  }

  /**
   * DeepSeek特定的验证
   */
  async validate(prompt: string): Promise<ValidationResult> {
    const baseValidation = await super.validate(prompt);
    
    // DeepSeek特定的验证规则
    const deepseekErrors = [];
    const deepseekWarnings = [];

    // 检查代码块格式
    if ((prompt.includes('代码') || prompt.includes('code')) && 
        prompt.includes('```') && !prompt.includes('```\n')) {
      deepseekWarnings.push({
        code: 'CODE_BLOCK_FORMAT',
        message: '代码块格式可能不正确',
        suggestion: '确保代码块使用正确的markdown格式',
      });
    }

    // 检查数学表达式
    if (prompt.includes('$') && !prompt.includes('$$')) {
      deepseekWarnings.push({
        code: 'MATH_EXPRESSION',
        message: '检测到数学表达式，建议使用LaTeX格式',
        suggestion: '使用$$包围数学表达式以获得更好的渲染效果',
      });
    }

    // 检查推理复杂度
    const complexityIndicators = ['分析', '推理', '证明', '解释', '为什么'];
    const hasComplexity = complexityIndicators.some(indicator => prompt.includes(indicator));
    if (hasComplexity && prompt.length < 100) {
      deepseekWarnings.push({
        code: 'INSUFFICIENT_CONTEXT',
        message: '复杂推理任务需要更多上下文信息',
        suggestion: '为复杂任务提供更详细的背景和要求',
      });
    }

    return {
      isValid: baseValidation.isValid && deepseekErrors.length === 0,
      errors: [...baseValidation.errors, ...deepseekErrors],
      warnings: [...baseValidation.warnings, ...deepseekWarnings],
      suggestions: baseValidation.suggestions,
    };
  }

  /**
   * 生成DeepSeek特定的建议
   */
  protected generateSuggestions(prompt: string): Suggestion[] {
    const baseSuggestions = super.generateSuggestions(prompt);
    
    const deepseekSuggestions: Suggestion[] = [];

    // 推理链建议
    if (prompt.length > 50 && !prompt.includes('步骤') && !prompt.includes('思考')) {
      deepseekSuggestions.push({
        id: 'add-reasoning-steps',
        type: 'reasoning',
        title: '添加推理步骤',
        description: 'DeepSeek擅长逐步推理，建议添加思考步骤',
        priority: 1,
        category: 'deepseek-specific',
        example: '添加"请逐步思考"或"分步骤分析"等引导语',
      });
    }

    // 代码格式建议
    if ((prompt.includes('代码') || prompt.includes('code')) && !prompt.includes('```')) {
      deepseekSuggestions.push({
        id: 'use-code-blocks',
        type: 'format',
        title: '使用代码块格式',
        description: '建议使用markdown代码块格式',
        priority: 1,
        category: 'formatting',
        example: '使用```language来包围代码示例',
      });
    }

    // 数学表达式建议
    if (prompt.includes('数学') || prompt.includes('计算')) {
      deepseekSuggestions.push({
        id: 'use-math-notation',
        type: 'math',
        title: '使用数学符号',
        description: 'DeepSeek支持LaTeX数学表达式',
        priority: 2,
        category: 'formatting',
        example: '使用$$包围数学公式，如$$E=mc^2$$',
      });
    }

    return [...baseSuggestions, ...deepseekSuggestions];
  }

  /**
   * 检查DeepSeek API连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      const testRequest = {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(testRequest),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('DeepSeek connection check failed:', error);
      return false;
    }
  }
}