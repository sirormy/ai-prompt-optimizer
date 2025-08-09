import { apiClient } from './api';
import { AIModel, OptimizationRule } from '../store/types';

// 模型相关的API请求和响应类型
export interface ModelValidationRequest {
  modelId: string;
  apiKey?: string;
  testPrompt?: string;
}

export interface ModelValidationResponse {
  isValid: boolean;
  message: string;
  details?: {
    latency?: number;
    maxTokens?: number;
    supportedFeatures?: string[];
  };
}

export interface ModelUsageStats {
  modelId: string;
  totalUsage: number;
  successRate: number;
  averageLatency: number;
  lastUsed: string;
}

export interface CreateCustomModelRequest {
  name: string;
  provider: 'openai' | 'anthropic' | 'deepseek' | 'custom';
  apiEndpoint: string;
  maxTokens: number;
  supportedRoles: ('system' | 'user' | 'assistant')[];
  optimizationRules: OptimizationRule[];
  customHeaders?: Record<string, string>;
  description?: string;
}

export class ModelsService {
  // 获取所有可用模型
  async getAvailableModels(): Promise<AIModel[]> {
    return apiClient.get<AIModel[]>('/models');
  }

  // 获取单个模型详情
  async getModel(modelId: string): Promise<AIModel> {
    return apiClient.get<AIModel>(`/models/${modelId}`);
  }

  // 验证模型配置
  async validateModel(request: ModelValidationRequest): Promise<ModelValidationResponse> {
    return apiClient.post<ModelValidationResponse>('/models/validate', request);
  }

  // 测试模型连接
  async testModelConnection(modelId: string, apiKey?: string): Promise<{
    success: boolean;
    latency: number;
    error?: string;
  }> {
    return apiClient.post(`/models/${modelId}/test`, { apiKey });
  }

  // 获取模型使用统计
  async getModelUsageStats(): Promise<ModelUsageStats[]> {
    return apiClient.get<ModelUsageStats[]>('/models/stats');
  }

  // 获取模型的优化规则
  async getModelOptimizationRules(modelId: string): Promise<OptimizationRule[]> {
    return apiClient.get<OptimizationRule[]>(`/models/${modelId}/rules`);
  }

  // 更新模型的优化规则
  async updateModelOptimizationRules(
    modelId: string,
    rules: OptimizationRule[]
  ): Promise<OptimizationRule[]> {
    return apiClient.put<OptimizationRule[]>(`/models/${modelId}/rules`, { rules });
  }

  // 创建自定义模型配置
  async createCustomModel(request: CreateCustomModelRequest): Promise<AIModel> {
    return apiClient.post<AIModel>('/models/custom', request);
  }

  // 更新自定义模型配置
  async updateCustomModel(modelId: string, updates: Partial<CreateCustomModelRequest>): Promise<AIModel> {
    return apiClient.put<AIModel>(`/models/custom/${modelId}`, updates);
  }

  // 删除自定义模型配置
  async deleteCustomModel(modelId: string): Promise<void> {
    return apiClient.delete(`/models/custom/${modelId}`);
  }

  // 获取用户的自定义模型
  async getCustomModels(): Promise<AIModel[]> {
    return apiClient.get<AIModel[]>('/models/custom');
  }

  // 获取模型的最佳实践建议
  async getModelBestPractices(modelId: string): Promise<{
    tips: string[];
    examples: Array<{
      title: string;
      before: string;
      after: string;
      explanation: string;
    }>;
    limitations: string[];
  }> {
    return apiClient.get(`/models/${modelId}/best-practices`);
  }

  // 比较不同模型的性能
  async compareModels(modelIds: string[], testPrompt: string): Promise<{
    results: Array<{
      modelId: string;
      response: string;
      latency: number;
      tokenCount: number;
      cost: number;
      quality: number; // 1-10评分
    }>;
    recommendation: string;
  }> {
    return apiClient.post('/models/compare', { modelIds, testPrompt });
  }

  // 获取模型定价信息
  async getModelPricing(modelId: string): Promise<{
    inputTokenPrice: number;
    outputTokenPrice: number;
    currency: string;
    billingUnit: string;
    freeQuota?: number;
  }> {
    return apiClient.get(`/models/${modelId}/pricing`);
  }

  // 估算提示词成本
  async estimateCost(modelId: string, prompt: string): Promise<{
    inputTokens: number;
    estimatedOutputTokens: number;
    inputCost: number;
    estimatedOutputCost: number;
    totalEstimatedCost: number;
    currency: string;
  }> {
    return apiClient.post(`/models/${modelId}/estimate-cost`, { prompt });
  }

  // 获取模型能力矩阵
  async getModelCapabilities(): Promise<Array<{
    modelId: string;
    name: string;
    provider: string;
    capabilities: {
      reasoning: number; // 1-10
      creativity: number;
      factualAccuracy: number;
      codeGeneration: number;
      multilingualSupport: number;
      contextLength: number;
      speed: number;
      cost: number; // 1-10 (10 = most cost-effective)
    };
  }>> {
    return apiClient.get('/models/capabilities');
  }

  // 根据需求推荐模型
  async recommendModel(requirements: {
    taskType: 'creative' | 'analytical' | 'coding' | 'translation' | 'general';
    priority: 'speed' | 'quality' | 'cost';
    maxCost?: number;
    minContextLength?: number;
    language?: string;
  }): Promise<{
    recommended: AIModel[];
    reasoning: string;
    alternatives: AIModel[];
  }> {
    return apiClient.post('/models/recommend', requirements);
  }

  // 获取模型更新日志
  async getModelUpdates(modelId?: string): Promise<Array<{
    modelId: string;
    version: string;
    releaseDate: string;
    changes: string[];
    improvements: string[];
    deprecations?: string[];
  }>> {
    const url = modelId ? `/models/${modelId}/updates` : '/models/updates';
    return apiClient.get(url);
  }

  // 订阅模型更新通知
  async subscribeToModelUpdates(modelIds: string[]): Promise<{ subscribed: boolean }> {
    return apiClient.post('/models/subscribe-updates', { modelIds });
  }

  // 取消订阅模型更新通知
  async unsubscribeFromModelUpdates(modelIds: string[]): Promise<{ unsubscribed: boolean }> {
    return apiClient.post('/models/unsubscribe-updates', { modelIds });
  }
}

// 导出单例实例
export const modelsService = new ModelsService();
export default modelsService;