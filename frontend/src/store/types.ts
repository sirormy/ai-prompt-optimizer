// 核心数据类型定义

export interface Prompt {
  id: string;
  userId: string;
  originalText: string;
  optimizedText: string;
  targetModel: AIModel;
  messageRole: MessageRole;
  systemPrompt?: string;
  optimizationRules: OptimizationRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'deepseek';
  version: string;
  maxTokens: number;
  supportedRoles: MessageRole[];
  optimizationRules: OptimizationRule[];
  apiEndpoint: string;
}

export interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
  apiKeys: Record<string, string>;
  usage: UsageStats;
  createdAt: Date;
}

export interface UserPreferences {
  defaultModel: string;
  optimizationLevel: 'basic' | 'advanced' | 'expert';
  autoSave: boolean;
  theme: 'light' | 'dark';
  language: 'zh' | 'en';
}

export interface UsageStats {
  totalOptimizations: number;
  monthlyUsage: number;
  lastUsed: Date;
}

export interface OptimizationRequest {
  prompt: string;
  targetModel: AIModel;
  messageRole: MessageRole;
  systemPrompt?: string;
  optimizationLevel: 'basic' | 'advanced' | 'expert';
  customRules?: OptimizationRule[];
}

export interface OptimizationResult {
  id: string;
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: Improvement[];
  confidence: number;
  appliedRules: OptimizationRule[];
  suggestions: Suggestion[];
  estimatedTokens: TokenEstimate;
}

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  applicableModels: string[];
  priority: number;
  isActive: boolean;
}

export interface Improvement {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  before: string;
  after: string;
}

export interface Suggestion {
  id: string;
  type: 'structure' | 'clarity' | 'specificity' | 'context';
  title: string;
  description: string;
  example?: string;
  priority: number;
}

export interface TokenEstimate {
  original: number;
  optimized: number;
  savings: number;
  cost?: {
    original: number;
    optimized: number;
    currency: string;
  };
}

export type MessageRole = 'system' | 'user' | 'assistant';

export interface OptimizationProgress {
  stage: 'analyzing' | 'optimizing' | 'validating' | 'formatting';
  percentage: number;
  message: string;
  currentStep?: string;
}

export interface SSEEvent {
  type: 'progress' | 'result' | 'error' | 'complete';
  data: OptimizationProgress | OptimizationResult | OptimizationError;
  timestamp: number;
}

export interface OptimizationError {
  code: string;
  message: string;
  details?: any;
}
