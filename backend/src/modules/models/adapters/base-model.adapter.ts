import { Injectable, Logger } from '@nestjs/common';
import {
  ModelAdapter,
  ValidationResult,
  OptimizationRule,
  PromptStructure,
  ModelConfig,
  ValidationError,
  ValidationWarning,
} from '../interfaces/model-adapter.interface';
import { OptimizationRequest, OptimizationResult, Improvement, Suggestion } from '../dto';

/**
 * 基础模型适配器抽象类
 * 提供通用的功能实现和模板方法
 */
@Injectable()
export abstract class BaseModelAdapter implements ModelAdapter {
  protected readonly logger = new Logger(this.constructor.name);
  protected config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  // 抽象属性，子类必须实现
  abstract readonly name: string;
  abstract readonly provider: string;
  abstract readonly version: string;
  abstract readonly maxTokens: number;
  abstract readonly supportedRoles: string[];

  // 抽象方法，子类必须实现
  abstract optimize(request: OptimizationRequest): Promise<OptimizationResult>;
  abstract formatForModel(prompt: PromptStructure): string;
  abstract estimateTokens(text: string): Promise<number>;

  /**
   * 验证提示词 - 提供基础实现，子类可以重写
   */
  async validate(prompt: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // 基础验证
    if (!prompt || prompt.trim().length === 0) {
      errors.push({
        code: 'EMPTY_PROMPT',
        message: '提示词不能为空',
        severity: 'error',
      });
    }

    // 长度验证
    if (prompt.length > this.maxTokens * 4) { // 粗略估算，1 token ≈ 4 characters
      errors.push({
        code: 'PROMPT_TOO_LONG',
        message: `提示词过长，可能超过模型的最大token限制 (${this.maxTokens})`,
        severity: 'error',
      });
    }

    // 基础格式检查
    if (prompt.includes('{{') && prompt.includes('}}')) {
      warnings.push({
        code: 'TEMPLATE_VARIABLES',
        message: '检测到模板变量，请确保在使用前替换',
        suggestion: '使用实际值替换模板变量',
      });
    }

    // 添加通用建议
    if (prompt.length < 10) {
      suggestions.push('考虑添加更多上下文信息以获得更好的结果');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * 获取通用优化规则 - 子类可以扩展
   */
  getModelSpecificRules(): OptimizationRule[] {
    return [
      {
        id: 'clear-instructions',
        name: '明确指令',
        description: '确保指令清晰明确',
        category: 'clarity',
        priority: 1,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => !text.includes('请') && !text.includes('帮我'),
      },
      {
        id: 'context-provision',
        name: '提供上下文',
        description: '为AI提供足够的上下文信息',
        category: 'context',
        priority: 2,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => text.length < 50,
      },
      {
        id: 'specific-format',
        name: '指定输出格式',
        description: '明确指定期望的输出格式',
        category: 'format',
        priority: 3,
        applicableModels: [this.name],
        isActive: true,
        condition: (text: string) => !text.includes('格式') && !text.includes('format'),
      },
    ];
  }

  /**
   * 检查API连接状态 - 提供基础实现
   */
  async checkConnection(): Promise<boolean> {
    try {
      // 子类应该重写此方法以实现具体的连接检查
      this.logger.log(`Checking connection for ${this.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Connection check failed for ${this.name}:`, error);
      return false;
    }
  }

  /**
   * 应用优化规则 - 通用方法
   */
  protected applyOptimizationRules(
    prompt: string,
    rules: OptimizationRule[],
  ): { optimizedPrompt: string; appliedRules: string[]; improvements: Improvement[] } {
    let optimizedPrompt = prompt;
    const appliedRules: string[] = [];
    const improvements: Improvement[] = [];

    for (const rule of rules.filter(r => r.isActive)) {
      if (rule.condition && !rule.condition(optimizedPrompt)) {
        continue;
      }

      const before = optimizedPrompt;
      
      if (rule.pattern && rule.replacement) {
        optimizedPrompt = optimizedPrompt.replace(rule.pattern, rule.replacement);
      }

      if (before !== optimizedPrompt) {
        appliedRules.push(rule.id);
        improvements.push({
          type: rule.category,
          description: rule.description,
          impact: rule.priority <= 2 ? 'high' : rule.priority <= 4 ? 'medium' : 'low',
          before,
          after: optimizedPrompt,
          reasoning: rule.description,
        });
      }
    }

    return { optimizedPrompt, appliedRules, improvements };
  }

  /**
   * 生成通用建议 - 通用方法
   */
  protected generateSuggestions(prompt: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 长度建议
    if (prompt.length < 20) {
      suggestions.push({
        id: 'add-context',
        type: 'context',
        title: '添加更多上下文',
        description: '提示词较短，建议添加更多背景信息和具体要求',
        priority: 1,
        category: 'improvement',
        example: '在原有提示词基础上，添加具体的场景描述和期望的输出格式',
      });
    }

    // 格式建议
    if (!prompt.includes('请') && !prompt.includes('帮助')) {
      suggestions.push({
        id: 'polite-language',
        type: 'tone',
        title: '使用礼貌用语',
        description: '建议使用更礼貌的表达方式',
        priority: 2,
        category: 'tone',
        example: '将"生成一个..."改为"请帮我生成一个..."',
      });
    }

    return suggestions;
  }

  /**
   * 计算置信度 - 通用方法
   */
  protected calculateConfidence(improvements: Improvement[]): number {
    if (improvements.length === 0) return 0.5;

    const highImpactCount = improvements.filter(i => i.impact === 'high').length;
    const mediumImpactCount = improvements.filter(i => i.impact === 'medium').length;
    const lowImpactCount = improvements.filter(i => i.impact === 'low').length;

    const score = (highImpactCount * 0.4) + (mediumImpactCount * 0.3) + (lowImpactCount * 0.1);
    return Math.min(0.95, Math.max(0.1, 0.5 + score));
  }

  /**
   * 记录优化过程 - 通用方法
   */
  protected logOptimization(request: OptimizationRequest, result: OptimizationResult): void {
    this.logger.log(`Optimization completed for ${this.name}`, {
      originalLength: request.prompt.length,
      optimizedLength: result.optimizedPrompt.length,
      improvementsCount: result.improvements.length,
      confidence: result.confidence,
      processingTime: result.processingTime,
    });
  }
}