import { apiClient } from './api';
import { User, UserPreferences } from '../store/types';

// 用户相关的API请求和响应类型
export interface UpdatePreferencesRequest {
  defaultModel?: string;
  optimizationLevel?: 'basic' | 'advanced' | 'expert';
  autoSave?: boolean;
  theme?: 'light' | 'dark';
  language?: 'zh' | 'en';
}

export interface UpdateApiKeysRequest {
  openai?: string;
  anthropic?: string;
  deepseek?: string;
  [key: string]: string | undefined;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  preferences: UserPreferences;
  usage: {
    totalOptimizations: number;
    monthlyUsage: number;
    lastUsed: Date;
  };
  createdAt: Date;
}

export interface ApiKeysResponse {
  keys: Record<string, boolean>; // 只返回是否设置了key，不返回实际值
}

export class UsersService {
  // 获取用户资料
  async getProfile(): Promise<UserProfileResponse> {
    return apiClient.get<UserProfileResponse>('/auth/profile');
  }

  // 更新用户偏好设置
  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<UserPreferences> {
    return apiClient.put<UserPreferences>('/auth/preferences', preferences);
  }

  // 更新API密钥
  async updateApiKeys(apiKeys: UpdateApiKeysRequest): Promise<{ message: string }> {
    return apiClient.put('/auth/api-keys', apiKeys);
  }

  // 获取API密钥状态（不返回实际密钥值）
  async getApiKeysStatus(): Promise<ApiKeysResponse> {
    return apiClient.get<ApiKeysResponse>('/auth/api-keys');
  }

  // 删除特定API密钥
  async deleteApiKey(provider: string): Promise<{ message: string }> {
    return apiClient.delete(`/auth/api-keys/${provider}`);
  }

  // 验证API密钥
  async validateApiKey(provider: string, apiKey: string): Promise<{
    valid: boolean;
    message: string;
    details?: any;
  }> {
    return apiClient.post('/auth/api-keys/validate', { provider, apiKey });
  }

  // 获取用户使用统计
  async getUsageStats(period?: 'day' | 'week' | 'month' | 'year'): Promise<{
    totalOptimizations: number;
    successfulOptimizations: number;
    failedOptimizations: number;
    averageOptimizationTime: number;
    mostUsedModel: string;
    tokensUsed: number;
    estimatedCost: number;
    period: string;
    data: Array<{
      date: string;
      optimizations: number;
      tokens: number;
      cost: number;
    }>;
  }> {
    const params = period ? `?period=${period}` : '';
    return apiClient.get(`/users/stats${params}`);
  }

  // 导出用户数据
  async exportUserData(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await apiClient.getAxiosInstance().get(
      `/users/export?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  // 删除用户账户
  async deleteAccount(password: string): Promise<{ message: string }> {
    return apiClient.delete('/users/account', { data: { password } });
  }

  // 更改密码
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.put('/auth/password', {
      currentPassword,
      newPassword,
    });
  }

  // 请求密码重置
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return apiClient.post('/auth/password-reset', { email });
  }

  // 重置密码
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.post('/auth/password-reset/confirm', {
      token,
      newPassword,
    });
  }

  // 更新邮箱
  async updateEmail(newEmail: string, password: string): Promise<{ message: string }> {
    return apiClient.put('/auth/email', {
      newEmail,
      password,
    });
  }

  // 验证邮箱
  async verifyEmail(token: string): Promise<{ message: string }> {
    return apiClient.post('/auth/email/verify', { token });
  }

  // 重新发送验证邮件
  async resendVerificationEmail(): Promise<{ message: string }> {
    return apiClient.post('/auth/email/resend-verification');
  }

  // 获取用户活动日志
  async getActivityLog(params?: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    action?: string;
  }): Promise<{
    data: Array<{
      id: string;
      action: string;
      details: any;
      ipAddress: string;
      userAgent: string;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString());
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    const url = `/users/activity${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(url);
  }

  // 获取用户配额信息
  async getQuotaInfo(): Promise<{
    current: {
      optimizations: number;
      tokens: number;
      apiCalls: number;
    };
    limits: {
      optimizations: number;
      tokens: number;
      apiCalls: number;
    };
    resetDate: Date;
    plan: string;
  }> {
    return apiClient.get('/users/quota');
  }

  // 升级用户计划
  async upgradePlan(planId: string): Promise<{
    paymentUrl?: string;
    message: string;
  }> {
    return apiClient.post('/users/upgrade', { planId });
  }

  // 取消订阅
  async cancelSubscription(): Promise<{ message: string }> {
    return apiClient.post('/users/cancel-subscription');
  }

  // 获取计费历史
  async getBillingHistory(): Promise<Array<{
    id: string;
    amount: number;
    currency: string;
    description: string;
    status: 'paid' | 'pending' | 'failed';
    createdAt: Date;
    invoiceUrl?: string;
  }>> {
    return apiClient.get('/users/billing-history');
  }
}

// 导出单例实例
export const usersService = new UsersService();
export default usersService;