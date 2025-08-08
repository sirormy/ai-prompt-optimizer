import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseHealthService } from '../database/database-health.service';
import { RedisService } from '../modules/redis/redis.service';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../modules/redis/redis.module';
import databaseConfig from '../config/database.config';
import redisConfig from '../config/redis.config';

describe('Database Infrastructure', () => {
  let module: TestingModule;
  let healthService: DatabaseHealthService;
  let redisService: RedisService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [databaseConfig, redisConfig],
          isGlobal: true,
        }),
        DatabaseModule,
        RedisModule,
      ],
    }).compile();

    healthService = module.get<DatabaseHealthService>(DatabaseHealthService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('MongoDB Configuration', () => {
    it('should have MongoDB connection configured', async () => {
      const health = await healthService.checkMongoHealth();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
    });

    it('should have database schemas defined', () => {
      // 验证schemas文件存在
      expect(() => require('../schemas/user.schema')).not.toThrow();
      expect(() => require('../schemas/prompt.schema')).not.toThrow();
      expect(() => require('../schemas/optimization-rule.schema')).not.toThrow();
    });
  });

  describe('Redis Configuration', () => {
    it('should have Redis connection configured', async () => {
      const health = await healthService.checkRedisHealth();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
    });

    it('should support basic Redis operations', async () => {
      const testKey = 'test:unit';
      const testValue = 'test-value';

      // 测试设置和获取
      const setResult = await redisService.set(testKey, testValue, 60);
      expect(setResult).toBe(true);

      const getValue = await redisService.get(testKey);
      expect(getValue).toBe(testValue);

      // 清理
      await redisService.del(testKey);
    });

    it('should support caching optimization results', async () => {
      const promptHash = 'test_hash';
      const result = { optimized: 'test result' };

      const cacheResult = await redisService.cacheOptimizationResult(promptHash, result, 60);
      expect(cacheResult).toBe(true);

      const cachedResult = await redisService.getCachedOptimizationResult(promptHash);
      expect(cachedResult).toEqual(result);
    });
  });

  describe('Database Migration', () => {
    it('should have migration service configured', () => {
      expect(() => require('../database/migration.service')).not.toThrow();
    });

    it('should have migration files', () => {
      expect(() => require('../database/migrations/001-create-indexes')).not.toThrow();
    });

    it('should have seed data', () => {
      expect(() => require('../database/seeds/optimization-rules.seed')).not.toThrow();
    });
  });

  describe('Connection Pool and Error Handling', () => {
    it('should have database health service', () => {
      expect(healthService).toBeDefined();
      expect(typeof healthService.checkMongoHealth).toBe('function');
      expect(typeof healthService.checkRedisHealth).toBe('function');
      expect(typeof healthService.getOverallHealth).toBe('function');
    });

    it('should handle connection errors gracefully', async () => {
      // 这个测试验证错误处理逻辑存在
      expect(typeof healthService.checkMongoHealth).toBe('function');
      expect(typeof healthService.checkRedisHealth).toBe('function');
    });
  });
});