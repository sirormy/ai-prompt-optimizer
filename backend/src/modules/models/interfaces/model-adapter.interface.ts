import { OptimizationRequest, OptimizationResult } from '../dto';

/**
 * AI模型适配器接口
 * 定义所有AI模型适配器必须实现的方法
 */
export interface ModelAdapter {
  /**
   * 模型名称
   */
  readonly name: string;

  /**
   * 模型提供商
   */
  readonly provider: string;

  /**
   * 模型版本
   */
  readonly version: string;

  /**
   * 最大token数量
   */
  readonly maxTokens: number;

  /**
   * 支持的消息角色
   */
  readonly supportedRoles: string[];

  /**
   * 优化提示词
   * @param request 优化请求
   * @returns 优化结果
   */
  optimize(request: OptimizationRequest): Promise<OptimizationResult>;

  /**
   * 验证提示词格式和内容
   * @param prompt 提示词内容
   * @returns 验证结果
   */
  validate(prompt: string): Promise<ValidationResult>;

  /**
   * 获取模型特定的优化规则
   * @returns 优化规则列表
   */
  getModelSpecificRules(): OptimizationRule[];

  /**
   * 格式化提示词以适应特定模型
   * @param prompt 原始提示词结构
   * @returns 格式化后的提示词
   */
  formatForModel(prompt: PromptStructure): string;

  /**
   * 估算token使用量
   * @param text 文本内容
   * @returns token数量估算
   */
  estimateTokens(text: string): Promise<number>;

  /**
   * 检查API连接状态
   * @returns 连接状态
   */
  checkConnection(): Promise<boolean>;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * 优化规则接口
 */
export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: number;
  pattern?: RegExp;
  replacement?: string;
  condition?: (text: string) => boolean;
  applicableModels: string[];
  isActive: boolean;
}

/**
 * 提示词结构接口
 */
export interface PromptStructure {
  systemPrompt?: string;
  userPrompt: string;
  role: 'system' | 'user' | 'assistant';
  context?: Record<string, any>;
}

/**
 * 模型配置接口
 */
export interface ModelConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}