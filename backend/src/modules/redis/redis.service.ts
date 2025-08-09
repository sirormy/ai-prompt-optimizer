import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await this.redisClient.setEx(key, ttl, value);
      } else {
        await this.redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.redisClient.hGet(key, field);
    } catch (error) {
      this.logger.error(`Error getting hash field ${field} from key ${key}:`, error);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.redisClient.hSet(key, field, value);
      return true;
    } catch (error) {
      this.logger.error(`Error setting hash field ${field} in key ${key}:`, error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      return await this.redisClient.hGetAll(key);
    } catch (error) {
      this.logger.error(`Error getting all hash fields from key ${key}:`, error);
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.redisClient.expire(key, seconds);
      return true;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  async flushdb(): Promise<boolean> {
    try {
      await this.redisClient.flushDb();
      return true;
    } catch (error) {
      this.logger.error('Error flushing database:', error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Error pinging Redis:', error);
      return false;
    }
  }

  // 缓存优化相关的方法
  async cacheOptimizationResult(
    promptHash: string,
    result: any,
    ttl: number = 3600,
  ): Promise<boolean> {
    const key = `optimization:${promptHash}`;
    return this.set(key, JSON.stringify(result), ttl);
  }

  async getCachedOptimizationResult(promptHash: string): Promise<any | null> {
    const key = `optimization:${promptHash}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheUserSession(
    sessionId: string,
    userData: any,
    ttl: number = 1800,
  ): Promise<boolean> {
    const key = `session:${sessionId}`;
    return this.set(key, JSON.stringify(userData), ttl);
  }

  async getUserSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateUserCache(userId: string): Promise<boolean> {
    try {
      const pattern = `user:${userId}:*`;
      // Note: In production, consider using SCAN instead of KEYS for better performance
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating cache for user ${userId}:`, error);
      return false;
    }
  }

  // 高级缓存策略方法
  async cacheWithTags(key: string, value: any, ttl: number, tags: string[]): Promise<boolean> {
    try {
      // 存储主数据
      await this.set(key, JSON.stringify(value), ttl);
      
      // 为每个标签创建索引
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await this.redisClient.sAdd(tagKey, key);
        await this.expire(tagKey, ttl + 300); // 标签索引比数据多存5分钟
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error caching with tags for key ${key}:`, error);
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<boolean> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.redisClient.sMembers(tagKey);
      
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        await this.redisClient.del(tagKey);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating cache by tag ${tag}:`, error);
      return false;
    }
  }

  // API响应缓存
  async cacheAPIResponse(
    endpoint: string,
    params: Record<string, any>,
    response: any,
    ttl: number = 300,
  ): Promise<boolean> {
    const cacheKey = this.generateAPIKey(endpoint, params);
    const cacheData = {
      response,
      timestamp: Date.now(),
      ttl,
    };
    
    return this.set(cacheKey, JSON.stringify(cacheData), ttl);
  }

  async getCachedAPIResponse(
    endpoint: string,
    params: Record<string, any>,
  ): Promise<any | null> {
    const cacheKey = this.generateAPIKey(endpoint, params);
    const cached = await this.get(cacheKey);
    
    if (!cached) return null;
    
    try {
      const cacheData = JSON.parse(cached);
      const now = Date.now();
      
      // 检查是否过期
      if (now - cacheData.timestamp > cacheData.ttl * 1000) {
        await this.del(cacheKey);
        return null;
      }
      
      return cacheData.response;
    } catch (error) {
      this.logger.error(`Error parsing cached API response for key ${cacheKey}:`, error);
      return null;
    }
  }

  private generateAPIKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    const paramString = JSON.stringify(sortedParams);
    return `api:${endpoint}:${Buffer.from(paramString).toString('base64')}`;
  }

  // 用户数据缓存
  async cacheUserData(userId: string, dataType: string, data: any, ttl: number = 1800): Promise<boolean> {
    const key = `user:${userId}:${dataType}`;
    const tags = [`user:${userId}`, `dataType:${dataType}`];
    return this.cacheWithTags(key, data, ttl, tags);
  }

  async getUserData(userId: string, dataType: string): Promise<any | null> {
    const key = `user:${userId}:${dataType}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // 提示词历史缓存
  async cachePromptHistory(
    userId: string,
    queryParams: Record<string, any>,
    data: any,
    ttl: number = 600,
  ): Promise<boolean> {
    const key = `prompts:${userId}:${this.hashObject(queryParams)}`;
    const tags = [`user:${userId}`, 'prompts'];
    return this.cacheWithTags(key, data, ttl, tags);
  }

  async getCachedPromptHistory(
    userId: string,
    queryParams: Record<string, any>,
  ): Promise<any | null> {
    const key = `prompts:${userId}:${this.hashObject(queryParams)}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // 模型配置缓存
  async cacheModelConfig(modelId: string, config: any, ttl: number = 7200): Promise<boolean> {
    const key = `model:${modelId}:config`;
    const tags = ['models', `model:${modelId}`];
    return this.cacheWithTags(key, config, ttl, tags);
  }

  async getCachedModelConfig(modelId: string): Promise<any | null> {
    const key = `model:${modelId}:config`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // 优化规则缓存
  async cacheOptimizationRules(modelId: string, rules: any[], ttl: number = 3600): Promise<boolean> {
    const key = `rules:${modelId}`;
    const tags = ['rules', `model:${modelId}`];
    return this.cacheWithTags(key, rules, ttl, tags);
  }

  async getCachedOptimizationRules(modelId: string): Promise<any[] | null> {
    const key = `rules:${modelId}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // 缓存统计和监控
  async getCacheStats(): Promise<any> {
    try {
      const info = await this.redisClient.info('memory');
      const keyspace = await this.redisClient.info('keyspace');
      
      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return null;
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return result;
  }

  private hashObject(obj: Record<string, any>): string {
    const crypto = require('crypto');
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('md5').update(str).digest('hex');
  }

  // 批量操作
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.redisClient.mGet(keys);
    } catch (error) {
      this.logger.error(`Error in mget for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Record<string, string>): Promise<boolean> {
    try {
      await this.redisClient.mSet(keyValuePairs);
      return true;
    } catch (error) {
      this.logger.error('Error in mset:', error);
      return false;
    }
  }

  // 分布式锁
  async acquireLock(key: string, ttl: number = 30): Promise<string | null> {
    try {
      const lockKey = `lock:${key}`;
      const lockValue = Math.random().toString(36).substring(2, 15);
      
      const result = await this.redisClient.set(lockKey, lockValue, {
        PX: ttl * 1000,
        NX: true,
      });
      
      return result === 'OK' ? lockValue : null;
    } catch (error) {
      this.logger.error(`Error acquiring lock for key ${key}:`, error);
      return null;
    }
  }

  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    try {
      const lockKey = `lock:${key}`;
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await this.redisClient.eval(script, {
        keys: [lockKey],
        arguments: [lockValue],
      });
      
      return result === 1;
    } catch (error) {
      this.logger.error(`Error releasing lock for key ${key}:`, error);
      return false;
    }
  }
}