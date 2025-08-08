/**
 * 优化请求DTO
 */
export interface OptimizationRequest {
  prompt: string;
  targetModel: string;
  messageRole: 'system' | 'user' | 'assistant';
  systemPrompt?: string;
  optimizationLevel: 'basic' | 'advanced' | 'expert';
  customRules?: string[];
  userId?: string;
  context?: Record<string, any>;
}

/**
 * 优化结果DTO
 */
export interface OptimizationResult {
  id: string;
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: Improvement[];
  confidence: number;
  appliedRules: string[];
  suggestions: Suggestion[];
  estimatedTokens: TokenEstimate;
  processingTime: number;
  modelUsed: string;
}

/**
 * 改进项接口
 */
export interface Improvement {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  before: string;
  after: string;
  reasoning: string;
  suggestion?: string; // 具体建议
}

/**
 * 建议接口
 */
export interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: number;
  category: string;
  example?: string;
}

/**
 * Token估算接口
 */
export interface TokenEstimate {
  original: number;
  optimized: number;
  saved: number;
  cost?: {
    original: number;
    optimized: number;
    currency: string;
  };
}

/**
 * 模型验证请求DTO
 */
export interface ModelValidationRequest {
  modelName: string;
  apiKey: string;
  baseUrl?: string;
}

/**
 * 模型验证结果DTO
 */
export interface ModelValidationResult {
  isValid: boolean;
  modelInfo?: {
    name: string;
    version: string;
    maxTokens: number;
    supportedFeatures: string[];
  };
  error?: string;
}