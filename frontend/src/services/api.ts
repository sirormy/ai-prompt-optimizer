import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { AuthService } from './auth';
import { cacheManager, CacheOptions } from '../utils/cache';

// API响应类型
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

// API错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

// 重试配置
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes: number[];
}

// 缓存请求配置
interface CachedRequestConfig extends AxiosRequestConfig {
  cache?: CacheOptions & { enabled?: boolean };
}

class ApiClient {
  private client: AxiosInstance;
  private authService: AuthService;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  };

  constructor() {
    this.authService = new AuthService();
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器 - 添加认证token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理认证和错误
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // 处理401未授权错误
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // 尝试刷新token
            await this.authService.refreshToken();
            const newToken = this.authService.getToken();
            
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // 刷新失败，跳转到登录页
            this.authService.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // 处理可重试的错误
        if (this.shouldRetry(error) && !originalRequest._retry) {
          return this.retryRequest(originalRequest, error);
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true; // 网络错误，可重试
    return this.retryConfig.retryableStatusCodes.includes(error.response.status);
  }

  private async retryRequest(
    originalRequest: AxiosRequestConfig & { _retry?: boolean },
    error: AxiosError
  ): Promise<AxiosResponse> {
    originalRequest._retry = true;
    
    for (let i = 0; i < this.retryConfig.maxRetries; i++) {
      try {
        await this.delay(this.retryConfig.retryDelay * Math.pow(2, i)); // 指数退避
        return await this.client(originalRequest);
      } catch (retryError) {
        if (i === this.retryConfig.maxRetries - 1) {
          throw this.transformError(retryError as AxiosError);
        }
      }
    }
    
    throw this.transformError(error);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private transformError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      statusCode: error.response?.status,
    };

    if (error.response?.data) {
      const responseData = error.response.data as any;
      apiError.code = responseData.code || responseData.error || 'API_ERROR';
      apiError.message = responseData.message || error.message;
      apiError.details = responseData.details;
    } else if (error.request) {
      apiError.code = 'NETWORK_ERROR';
      apiError.message = 'Network error - please check your connection';
    } else {
      apiError.message = error.message;
    }

    return apiError;
  }

  private generateCacheKey(method: string, url: string, params?: any, data?: any): string {
    const key = `api:${method}:${url}`;
    if (params || data) {
      const hash = btoa(JSON.stringify({ params, data })).slice(0, 16);
      return `${key}:${hash}`;
    }
    return key;
  }

  // HTTP方法封装（支持缓存）
  async get<T = any>(url: string, config?: CachedRequestConfig): Promise<T> {
    const cacheConfig = config?.cache;
    
    // 尝试从缓存获取数据
    if (cacheConfig?.enabled !== false) {
      const cacheKey = this.generateCacheKey('GET', url, config?.params);
      const cached = cacheManager.get<T>(cacheKey, cacheConfig?.storage);
      
      if (cached !== null) {
        console.log(`💾 Cache Hit: GET ${url}`);
        return cached;
      }
    }

    const response = await this.client.get<T>(url, config);
    
    // 缓存GET请求的响应
    if (cacheConfig?.enabled !== false && response.status === 200) {
      const cacheKey = this.generateCacheKey('GET', url, config?.params);
      cacheManager.set(cacheKey, response.data, {
        ttl: cacheConfig?.ttl || 5 * 60 * 1000, // 默认5分钟
        storage: cacheConfig?.storage || 'memory',
        tags: cacheConfig?.tags || []
      });
    }
    
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: CachedRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    
    // POST请求成功后，清除相关缓存
    if (config?.cache?.tags) {
      config.cache.tags.forEach(tag => {
        cacheManager.clearByTag(tag, config.cache?.storage || 'memory');
      });
    }
    
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: CachedRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    
    // PUT请求成功后，清除相关缓存
    if (config?.cache?.tags) {
      config.cache.tags.forEach(tag => {
        cacheManager.clearByTag(tag, config.cache?.storage || 'memory');
      });
    }
    
    return response.data;
  }

  async delete<T = any>(url: string, config?: CachedRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    
    // DELETE请求成功后，清除相关缓存
    if (config?.cache?.tags) {
      config.cache.tags.forEach(tag => {
        cacheManager.clearByTag(tag, config.cache?.storage || 'memory');
      });
    }
    
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: CachedRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    
    // PATCH请求成功后，清除相关缓存
    if (config?.cache?.tags) {
      config.cache.tags.forEach(tag => {
        cacheManager.clearByTag(tag, config.cache?.storage || 'memory');
      });
    }
    
    return response.data;
  }

  // 获取原始axios实例（用于特殊需求）
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  // 更新配置
  updateConfig(config: Partial<AxiosRequestConfig>) {
    Object.assign(this.client.defaults, config);
  }

  // 更新重试配置
  updateRetryConfig(config: Partial<RetryConfig>) {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  // 缓存管理方法
  clearCache(tags?: string[], storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory') {
    if (tags) {
      tags.forEach(tag => cacheManager.clearByTag(tag, storage));
    } else {
      cacheManager.clear(storage);
    }
  }

  getCacheStats() {
    return cacheManager.getStats();
  }

  // 预加载数据
  async preload<T = any>(url: string, config?: CachedRequestConfig): Promise<void> {
    try {
      await this.get<T>(url, {
        ...config,
        cache: {
          enabled: true,
          ttl: 30 * 60 * 1000, // 预加载数据缓存30分钟
          storage: 'memory',
          ...config?.cache
        }
      });
    } catch (error) {
      console.warn(`Failed to preload ${url}:`, error);
    }
  }
}

// 导出单例实例
export const apiClient = new ApiClient();
export default apiClient;