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
}