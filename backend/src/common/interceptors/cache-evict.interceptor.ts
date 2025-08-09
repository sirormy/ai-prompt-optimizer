import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../modules/redis/redis.service';

@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheEvictInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const evictTags = this.reflector.get<string[]>('cache_evict_tags', context.getHandler());
    
    if (!evictTags || evictTags.length === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        try {
          // 在方法执行成功后失效相关缓存
          for (const tag of evictTags) {
            await this.redisService.invalidateByTag(tag);
            this.logger.debug(`Evicted cache for tag: ${tag}`);
          }
        } catch (error) {
          this.logger.error(`Failed to evict cache for tags ${evictTags.join(', ')}:`, error);
        }
      }),
    );
  }
}