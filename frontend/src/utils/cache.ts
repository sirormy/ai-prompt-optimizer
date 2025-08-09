/**
 * 前端缓存工具类
 * 提供内存缓存、本地存储缓存和会话缓存功能
 */

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  tags?: string[];
}

export interface CacheOptions {
  ttl?: number; // Default 5 minutes
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
  tags?: string[];
}

class CacheManager {
  private memoryCache = new Map<string, CacheItem>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * 设置缓存项
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      ttl = this.defaultTTL,
      storage = 'memory',
      tags = []
    } = options;

    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags
    };

    switch (storage) {
      case 'memory':
        this.memoryCache.set(key, cacheItem);
        break;
      case 'localStorage':
        try {
          localStorage.setItem(key, JSON.stringify(cacheItem));
        } catch (error) {
          console.warn('Failed to set localStorage cache:', error);
        }
        break;
      case 'sessionStorage':
        try {
          sessionStorage.setItem(key, JSON.stringify(cacheItem));
        } catch (error) {
          console.warn('Failed to set sessionStorage cache:', error);
        }
        break;
    }
  }

  /**
   * 获取缓存项
   */
  get<T>(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): T | null {
    let cacheItem: CacheItem<T> | null = null;

    switch (storage) {
      case 'memory':
        cacheItem = this.memoryCache.get(key) || null;
        break;
      case 'localStorage':
        try {
          const stored = localStorage.getItem(key);
          cacheItem = stored ? JSON.parse(stored) : null;
        } catch (error) {
          console.warn('Failed to get localStorage cache:', error);
          return null;
        }
        break;
      case 'sessionStorage':
        try {
          const stored = sessionStorage.getItem(key);
          cacheItem = stored ? JSON.parse(stored) : null;
        } catch (error) {
          console.warn('Failed to get sessionStorage cache:', error);
          return null;
        }
        break;
    }

    if (!cacheItem) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - cacheItem.timestamp > cacheItem.ttl) {
      this.delete(key, storage);
      return null;
    }

    return cacheItem.data;
  }

  /**
   * 删除缓存项
   */
  delete(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): void {
    switch (storage) {
      case 'memory':
        this.memoryCache.delete(key);
        break;
      case 'localStorage':
        localStorage.removeItem(key);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(key);
        break;
    }
  }

  /**
   * 根据标签清除缓存
   */
  clearByTag(tag: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): void {
    switch (storage) {
      case 'memory':
        for (const [key, item] of this.memoryCache.entries()) {
          if (item.tags?.includes(tag)) {
            this.memoryCache.delete(key);
          }
        }
        break;
      case 'localStorage':
        this.clearStorageByTag(localStorage, tag);
        break;
      case 'sessionStorage':
        this.clearStorageByTag(sessionStorage, tag);
        break;
    }
  }

  private clearStorageByTag(storage: Storage, tag: string): void {
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        try {
          const item = JSON.parse(storage.getItem(key) || '{}');
          if (item.tags?.includes(tag)) {
            keysToDelete.push(key);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }

    keysToDelete.forEach(key => storage.removeItem(key));
  }

  /**
   * 清除所有缓存
   */
  clear(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): void {
    switch (storage) {
      case 'memory':
        this.memoryCache.clear();
        break;
      case 'localStorage':
        localStorage.clear();
        break;
      case 'sessionStorage':
        sessionStorage.clear();
        break;
    }
  }

  /**
   * 清除过期缓存
   */
  clearExpired(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): void {
    const now = Date.now();

    switch (storage) {
      case 'memory':
        for (const [key, item] of this.memoryCache.entries()) {
          if (now - item.timestamp > item.ttl) {
            this.memoryCache.delete(key);
          }
        }
        break;
      case 'localStorage':
        this.clearExpiredFromStorage(localStorage);
        break;
      case 'sessionStorage':
        this.clearExpiredFromStorage(sessionStorage);
        break;
    }
  }

  private clearExpiredFromStorage(storage: Storage): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        try {
          const item = JSON.parse(storage.getItem(key) || '{}');
          if (item.timestamp && item.ttl && now - item.timestamp > item.ttl) {
            keysToDelete.push(key);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }

    keysToDelete.forEach(key => storage.removeItem(key));
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    memory: { size: number; keys: string[] };
    localStorage: { size: number; keys: string[] };
    sessionStorage: { size: number; keys: string[] };
  } {
    return {
      memory: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      localStorage: {
        size: localStorage.length,
        keys: Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) || '')
      },
      sessionStorage: {
        size: sessionStorage.length,
        keys: Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i) || '')
      }
    };
  }
}

// 创建全局缓存管理器实例
export const cacheManager = new CacheManager();

// 缓存装饰器
export function cached<T extends (...args: any[]) => any>(
  options: CacheOptions & { keyGenerator?: (...args: Parameters<T>) => string } = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const {
        ttl = 5 * 60 * 1000,
        storage = 'memory',
        tags = [],
        keyGenerator
      } = options;

      // 生成缓存键
      const cacheKey = keyGenerator 
        ? keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cached = cacheManager.get(cacheKey, storage);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 缓存结果
      cacheManager.set(cacheKey, result, { ttl, storage, tags });

      return result;
    };

    return descriptor;
  };
}

// 缓存失效装饰器
export function cacheEvict(tags: string[], storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // 执行成功后清除相关缓存
      tags.forEach(tag => cacheManager.clearByTag(tag, storage));

      return result;
    };

    return descriptor;
  };
}

// 自动清理过期缓存
setInterval(() => {
  cacheManager.clearExpired('memory');
  cacheManager.clearExpired('localStorage');
  cacheManager.clearExpired('sessionStorage');
}, 60000); // 每分钟清理一次

export default cacheManager;