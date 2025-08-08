import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../modules/redis/redis.service';

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
  ) {}

  async checkMongoHealth(): Promise<{ status: string; details?: any }> {
    try {
      if (this.mongoConnection.readyState === 1) {
        // 执行一个简单的查询来测试连接
        await this.mongoConnection.db.admin().ping();
        return {
          status: 'healthy',
          details: {
            readyState: this.mongoConnection.readyState,
            host: this.mongoConnection.host,
            port: this.mongoConnection.port,
            name: this.mongoConnection.name,
          },
        };
      } else {
        return {
          status: 'unhealthy',
          details: {
            readyState: this.mongoConnection.readyState,
            error: 'Connection not ready',
          },
        };
      }
    } catch (error) {
      this.logger.error('MongoDB health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }

  async checkRedisHealth(): Promise<{ status: string; details?: any }> {
    try {
      const isHealthy = await this.redisService.ping();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          ping: isHealthy,
        },
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }

  async getOverallHealth(): Promise<{
    status: string;
    mongodb: any;
    redis: any;
    timestamp: string;
  }> {
    const [mongoHealth, redisHealth] = await Promise.all([
      this.checkMongoHealth(),
      this.checkRedisHealth(),
    ]);

    const overallStatus =
      mongoHealth.status === 'healthy' && redisHealth.status === 'healthy'
        ? 'healthy'
        : 'unhealthy';

    return {
      status: overallStatus,
      mongodb: mongoHealth,
      redis: redisHealth,
      timestamp: new Date().toISOString(),
    };
  }

  // 监控连接池状态
  getMongoConnectionPoolStats() {
    return {
      readyState: this.mongoConnection.readyState,
      host: this.mongoConnection.host,
      port: this.mongoConnection.port,
      name: this.mongoConnection.name,
      // 注意：Mongoose 不直接暴露连接池统计信息
      // 在生产环境中，可能需要使用 MongoDB 驱动程序的监控功能
    };
  }

  // 设置连接事件监听器
  setupConnectionEventListeners() {
    this.mongoConnection.on('connected', () => {
      this.logger.log('MongoDB connected successfully');
    });

    this.mongoConnection.on('error', (error) => {
      this.logger.error('MongoDB connection error:', error);
    });

    this.mongoConnection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });

    this.mongoConnection.on('reconnected', () => {
      this.logger.log('MongoDB reconnected');
    });

    this.mongoConnection.on('close', () => {
      this.logger.warn('MongoDB connection closed');
    });
  }
}