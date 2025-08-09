import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../modules/redis/redis.service';
import { CACHE_KEY, CACHE_TTL_KEY, CACHE_TAGS_KEY } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const isCacheable = this.reflector.get<boolean>(CACHE_KEY, context.getHandler());
    
    if (!isCacheable) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // 只缓存GET请求
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(context, request);
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler()) || 300;
    const tags = this.reflector.get<string[]>(CACHE_TAGS_KEY, context.getHandler()) || [];

    try {
      // 尝试从缓存获取数据
      const cachedData = await this.redisService.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        const parsedData = JSON.parse(cachedData);
        
        // 设置缓存头
        response.setHeader('X-Cache', 'HIT');
        response.setHeader('X-Cache-Key', cacheKey);
        
        return of(parsedData);
      }

      this.logger.debug(`Cache miss for key: ${cacheKey}`);
      response.setHeader('X-Cache', 'MISS');
      response.setHeader('X-Cache-Key', cacheKey);

      // 缓存未命中，执行原始方法并缓存结果
      return next.handle().pipe(
        tap(async (data) => {
          try {
            if (data !== null && data !== undefined) {
              if (tags.length > 0) {
                await this.redisService.cacheWithTags(cacheKey, data, ttl, tags);
              } else {
                await this.redisService.set(cacheKey, JSON.stringify(data), ttl);
              }
              this.logger.debug(`Cached data for key: ${cacheKey}, TTL: ${ttl}s`);
            }
          } catch (error) {
            this.logger.error(`Failed to cache data for key ${cacheKey}:`, error);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache interceptor error for key ${cacheKey}:`, error);
      return next.handle();
    }
  }

  private generateCacheKey(context: ExecutionContext, request: any): string {
    const keyGenerator = this.reflector.get<Function>('cache_key_generator', context.getHandler());
    
    if (keyGenerator) {
      return keyGenerator(request);
    }

    // 默认缓存键生成策略
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const url = request.url;
    const userId = request.user?.id || 'anonymous';
    
    // 生成基于URL和用户的缓存键
    const baseKey = `${className}:${methodName}:${userId}`;
    const urlHash = require('crypto').createHash('md5').update(url).digest('hex');
    
    return `${baseKey}:${urlHash}`;
  }
}