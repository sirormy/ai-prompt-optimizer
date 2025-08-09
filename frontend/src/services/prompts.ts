import { apiClient } from './api';
import {
  Prompt,
  OptimizationRequest,
  OptimizationResult,
  AIModel,
} from '../store/types';

// API请求和响应类型
export interface CreatePromptRequest {
  originalText: string;
  targetModel: AIModel;
  messageRole: 'system' | 'user' | 'assistant';
  systemPrompt?: string;
  optimizationLevel: 'basic' | 'advanced' | 'expert';
}

export interface UpdatePromptRequest {
  originalText?: string;
  optimizedText?: string;
  targetModel?: AIModel;
  messageRole?: 'system' | 'user' | 'assistant';
  systemPrompt?: string;
}

export interface PromptQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  targetModel?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'originalText';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedPromptsResponse {
  data: Prompt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserStatsResponse {
  totalPrompts: number;
  totalOptimizations: number;
  monthlyUsage: number;
  favoriteModel: string;
  averageOptimizationTime: number;
  lastActivity: string;
}

export interface StreamOptimizationRequest extends OptimizationRequest {
  sessionId: string;
}

export interface StreamOptimizationResponse {
  message: string;
  sessionId: string;
  status: 'processing' | 'completed' | 'error';
}

export class PromptsService {
  // 创建提示词
  async createPrompt(request: CreatePromptRequest): Promise<Prompt> {
    return apiClient.post<Prompt>('/prompts', request, {
      cache: {
        tags: ['prompts', 'user-data', 'user-stats']
      }
    });
  }

  // 优化提示词（同步）
  async optimizePrompt(request: OptimizationRequest): Promise<OptimizationResult> {
    return apiClient.post<OptimizationResult>('/prompts/optimize', request);
  }

  // 优化提示词（流式，配合SSE）
  async optimizePromptStream(request: StreamOptimizationRequest): Promise<StreamOptimizationResponse> {
    return apiClient.post<StreamOptimizationResponse>('/prompts/optimize/stream', request);
  }

  // 获取用户提示词列表
  async getUserPrompts(params?: PromptQueryParams): Promise<PaginatedPromptsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/prompts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedPromptsResponse>(url, {
      cache: {
        enabled: true,
        ttl: 10 * 60 * 1000, // 10分钟缓存
        storage: 'memory',
        tags: ['prompts', 'user-data']
      }
    });
  }

  // 获取单个提示词详情
  async getPrompt(id: string): Promise<Prompt> {
    return apiClient.get<Prompt>(`/prompts/${id}`, {
      cache: {
        enabled: true,
        ttl: 30 * 60 * 1000, // 30分钟缓存
        storage: 'memory',
        tags: ['prompt-detail', `prompt-${id}`]
      }
    });
  }

  // 更新提示词
  async updatePrompt(id: string, request: UpdatePromptRequest): Promise<Prompt> {
    return apiClient.put<Prompt>(`/prompts/${id}`, request, {
      cache: {
        tags: ['prompts', 'prompt-detail', `prompt-${id}`, 'user-data']
      }
    });
  }

  // 删除提示词
  async deletePrompt(id: string): Promise<void> {
    return apiClient.delete(`/prompts/${id}`, {
      cache: {
        tags: ['prompts', 'prompt-detail', `prompt-${id}`, 'user-data', 'user-stats']
      }
    });
  }

  // 批量删除提示词
  async deletePrompts(ids: string[]): Promise<{ deletedCount: number }> {
    return apiClient.delete('/prompts', { data: { ids } });
  }

  // 获取用户统计信息
  async getUserStats(): Promise<UserStatsResponse> {
    return apiClient.get<UserStatsResponse>('/prompts/stats', {
      cache: {
        enabled: true,
        ttl: 15 * 60 * 1000, // 15分钟缓存
        storage: 'memory',
        tags: ['user-stats']
      }
    });
  }

  // 版本管理相关方法
  async createVersion(promptId: string, data: { description?: string }): Promise<any> {
    return apiClient.post(`/prompts/${promptId}/versions`, data);
  }

  async getVersionHistory(promptId: string): Promise<any[]> {
    return apiClient.get(`/prompts/${promptId}/versions`);
  }

  async compareVersions(promptId: string, v1: number, v2: number): Promise<any> {
    return apiClient.get(`/prompts/${promptId}/versions/compare?v1=${v1}&v2=${v2}`);
  }

  async revertToVersion(promptId: string, version: number): Promise<Prompt> {
    return apiClient.post(`/prompts/${promptId}/versions/${version}/revert`);
  }

  // 搜索提示词
  async searchPrompts(query: string, filters?: {
    targetModel?: string;
    dateRange?: { start: Date; end: Date };
    minConfidence?: number;
  }): Promise<Prompt[]> {
    const params = new URLSearchParams({ search: query });
    
    if (filters) {
      if (filters.targetModel) {
        params.append('targetModel', filters.targetModel);
      }
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString());
        params.append('endDate', filters.dateRange.end.toISOString());
      }
      if (filters.minConfidence) {
        params.append('minConfidence', filters.minConfidence.toString());
      }
    }

    return apiClient.get<Prompt[]>(`/prompts?${params.toString()}`);
  }

  // 导出提示词
  async exportPrompts(ids: string[], format: 'json' | 'csv' | 'txt' = 'json'): Promise<Blob> {
    const response = await apiClient.getAxiosInstance().post(
      '/prompts/export',
      { ids, format },
      { responseType: 'blob' }
    );
    return response.data;
  }

  // 导入提示词
  async importPrompts(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post('/prompts/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // 复制提示词
  async duplicatePrompt(id: string, newTitle?: string): Promise<Prompt> {
    return apiClient.post(`/prompts/${id}/duplicate`, { title: newTitle });
  }

  // 收藏/取消收藏提示词
  async toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
    return apiClient.post(`/prompts/${id}/favorite`);
  }

  // 获取收藏的提示词
  async getFavoritePrompts(): Promise<Prompt[]> {
    return apiClient.get('/prompts?favorite=true');
  }

  // 分享提示词（生成分享链接）
  async sharePrompt(id: string, options?: {
    expiresIn?: number; // 过期时间（小时）
    allowEdit?: boolean;
    password?: string;
  }): Promise<{ shareUrl: string; shareId: string }> {
    return apiClient.post(`/prompts/${id}/share`, options);
  }

  // 通过分享链接获取提示词
  async getSharedPrompt(shareId: string, password?: string): Promise<Prompt> {
    return apiClient.get(`/prompts/shared/${shareId}`, {
      headers: password ? { 'X-Share-Password': password } : undefined,
    });
  }
}

// 导出单例实例
export const promptsService = new PromptsService();
export default promptsService;