import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache';
export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_TAGS_KEY = 'cache_tags';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  keyGenerator?: (req: any) => string;
}

/**
 * 缓存装饰器 - 用于自动缓存API响应
 */
export const Cache = (options: CacheOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_KEY, options.ttl || 300)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TAGS_KEY, options.tags || [])(target, propertyKey, descriptor);
    
    if (options.keyGenerator) {
      SetMetadata('cache_key_generator', options.keyGenerator)(target, propertyKey, descriptor);
    }
    
    return descriptor;
  };
};

/**
 * 缓存失效装饰器 - 用于在数据更新时自动失效相关缓存
 */
export const CacheEvict = (tags: string[]) => {
  return SetMetadata('cache_evict_tags', tags);
};

/**
 * 缓存预热装饰器 - 用于预加载热点数据
 */
export const CacheWarmup = (keys: string[]) => {
  return SetMetadata('cache_warmup_keys', keys);
};