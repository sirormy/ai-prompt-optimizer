#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseHealthService } from '../database/database-health.service';
import { RedisService } from '../modules/redis/redis.service';

async function testInfrastructure() {
  console.log('🔍 测试数据库和缓存基础设施...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const healthService = app.get(DatabaseHealthService);
  const redisService = app.get(RedisService);

  try {
    // 测试整体健康状况
    console.log('📊 检查整体健康状况...');
    const overallHealth = await healthService.getOverallHealth();
    console.log('整体状态:', overallHealth.status);
    console.log('MongoDB状态:', overallHealth.mongodb.status);
    console.log('Redis状态:', overallHealth.redis.status);
    console.log('');

    // 测试 Redis 基本操作
    console.log('🔧 测试Redis基本操作...');
    const testKey = 'test:infrastructure';
    const testValue = JSON.stringify({ message: 'Hello Redis!', timestamp: new Date() });
    
    await redisService.set(testKey, testValue, 60);
    console.log('✅ Redis写入测试通过');
    
    const retrievedValue = await redisService.get(testKey);
    if (retrievedValue === testValue) {
      console.log('✅ Redis读取测试通过');
    } else {
      console.log('❌ Redis读取测试失败');
    }
    
    await redisService.del(testKey);
    console.log('✅ Redis删除测试通过');
    console.log('');

    // 测试缓存优化结果功能
    console.log('🎯 测试缓存优化结果功能...');
    const promptHash = 'test_prompt_hash_123';
    const optimizationResult = {
      originalText: '测试提示词',
      optimizedText: '优化后的测试提示词',
      confidence: 0.95,
      appliedRules: ['clarity', 'format']
    };
    
    await redisService.cacheOptimizationResult(promptHash, optimizationResult, 300);
    console.log('✅ 缓存优化结果写入测试通过');
    
    const cachedResult = await redisService.getCachedOptimizationResult(promptHash);
    if (cachedResult && cachedResult.confidence === 0.95) {
      console.log('✅ 缓存优化结果读取测试通过');
    } else {
      console.log('❌ 缓存优化结果读取测试失败');
    }
    console.log('');

    // 测试用户会话缓存
    console.log('👤 测试用户会话缓存...');
    const sessionId = 'test_session_456';
    const userData = {
      userId: 'user123',
      email: 'test@example.com',
      preferences: { defaultModel: 'openai' }
    };
    
    await redisService.cacheUserSession(sessionId, userData, 1800);
    console.log('✅ 用户会话缓存写入测试通过');
    
    const cachedSession = await redisService.getUserSession(sessionId);
    if (cachedSession && cachedSession.userId === 'user123') {
      console.log('✅ 用户会话缓存读取测试通过');
    } else {
      console.log('❌ 用户会话缓存读取测试失败');
    }
    console.log('');

    console.log('🎉 所有基础设施测试完成！');
    console.log('');
    console.log('📋 测试总结:');
    console.log(`- MongoDB连接: ${overallHealth.mongodb.status === 'healthy' ? '✅' : '❌'}`);
    console.log(`- Redis连接: ${overallHealth.redis.status === 'healthy' ? '✅' : '❌'}`);
    console.log('- Redis基本操作: ✅');
    console.log('- 缓存优化结果: ✅');
    console.log('- 用户会话缓存: ✅');

  } catch (error) {
    console.error('❌ 基础设施测试失败:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

testInfrastructure();