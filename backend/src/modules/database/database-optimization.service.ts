import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DatabaseOptimizationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseOptimizationService.name);

  constructor(
    @InjectConnection() private connection: Connection,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.optimizeDatabase();
  }

  private async optimizeDatabase() {
    try {
      this.logger.log('Starting database optimization...');

      // 设置连接池优化
      await this.optimizeConnectionPool();

      // 优化查询性能
      await this.optimizeQueries();

      // 设置数据库级别的优化
      await this.setDatabaseOptimizations();

      this.logger.log('Database optimization completed');
    } catch (error) {
      this.logger.error('Database optimization failed:', error);
    }
  }

  private async optimizeConnectionPool() {
    // MongoDB连接池已在配置中设置，这里记录当前状态
    const db = this.connection.db;
    const stats = await db.stats();
    
    this.logger.log(`Database stats: Collections: ${stats.collections}, Objects: ${stats.objects}, Data Size: ${stats.dataSize}`);
  }

  private async optimizeQueries() {
    // 启用查询分析器（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      await this.connection.db.setProfilingLevel(1, { slowms: 100 });
      this.logger.log('Query profiler enabled for slow queries (>100ms)');
    }
  }

  private async setDatabaseOptimizations() {
    const db = this.connection.db;
    
    // 设置读偏好为最近的副本集成员
    await db.admin().command({
      setParameter: 1,
      readPreference: 'secondaryPreferred'
    }).catch(() => {
      // 忽略错误，可能是单节点部署
    });

    // 启用压缩
    await db.admin().command({
      setParameter: 1,
      wiredTigerEngineConfigString: 'block_compressor=snappy'
    }).catch(() => {
      // 忽略错误，可能不支持
    });
  }

  /**
   * 获取数据库性能统计
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const db = this.connection.db;
      const [dbStats, serverStatus] = await Promise.all([
        db.stats(),
        db.admin().serverStatus()
      ]);

      return {
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize,
          avgObjSize: dbStats.avgObjSize,
        },
        server: {
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          network: serverStatus.network,
          opcounters: serverStatus.opcounters,
          mem: serverStatus.mem,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * 分析慢查询
   */
  async getSlowQueries(limit: number = 10): Promise<any[]> {
    try {
      const db = this.connection.db;
      const profilerData = await db.collection('system.profile')
        .find({ ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }) // 最近24小时
        .sort({ ts: -1 })
        .limit(limit)
        .toArray();

      return profilerData.map(query => ({
        timestamp: query.ts,
        duration: query.millis,
        namespace: query.ns,
        command: query.command,
        planSummary: query.planSummary,
        docsExamined: query.docsExamined,
        docsReturned: query.docsReturned,
      }));
    } catch (error) {
      this.logger.error('Failed to get slow queries:', error);
      return [];
    }
  }

  /**
   * 优化集合
   */
  async optimizeCollection(collectionName: string): Promise<void> {
    try {
      const collection = this.connection.collection(collectionName);
      
      // 重建索引
      await collection.reIndex();
      
      // 压缩集合（仅在维护窗口期间使用）
      if (process.env.MAINTENANCE_MODE === 'true') {
        await this.connection.db.command({ compact: collectionName });
      }
      
      this.logger.log(`Optimized collection: ${collectionName}`);
    } catch (error) {
      this.logger.error(`Failed to optimize collection ${collectionName}:`, error);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const db = this.connection.db;
      const collections = await db.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const collection = db.collection(collectionInfo.name);
        
        // 删除带有过期时间的文档
        if (collectionInfo.name.includes('temp') || collectionInfo.name.includes('session')) {
          const result = await collection.deleteMany({
            expiresAt: { $lt: new Date() }
          });
          
          if (result.deletedCount > 0) {
            this.logger.log(`Cleaned up ${result.deletedCount} expired documents from ${collectionInfo.name}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired data:', error);
    }
  }

  /**
   * 数据库健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      const stats = await this.getDatabaseStats();
      
      if (!stats) {
        return {
          status: 'critical',
          issues: ['Unable to connect to database'],
          recommendations: ['Check database connection']
        };
      }
      
      // 检查连接数
      if (stats.server.connections.current > stats.server.connections.available * 0.8) {
        issues.push('High connection usage');
        recommendations.push('Consider increasing connection pool size');
      }
      
      // 检查内存使用
      if (stats.server.mem.resident > stats.server.mem.virtual * 0.9) {
        issues.push('High memory usage');
        recommendations.push('Consider adding more RAM or optimizing queries');
      }
      
      // 检查索引大小
      if (stats.database.indexSize > stats.database.dataSize) {
        issues.push('Index size larger than data size');
        recommendations.push('Review and optimize indexes');
      }
      
      // 检查平均文档大小
      if (stats.database.avgObjSize > 16000) {
        issues.push('Large average document size');
        recommendations.push('Consider document structure optimization');
      }
      
      const status = issues.length === 0 ? 'healthy' : 
                    issues.length <= 2 ? 'warning' : 'critical';
      
      return { status, issues, recommendations };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'critical',
        issues: ['Health check failed'],
        recommendations: ['Check database connectivity and permissions']
      };
    }
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(): Promise<any> {
    try {
      const [stats, slowQueries, healthCheck] = await Promise.all([
        this.getDatabaseStats(),
        this.getSlowQueries(20),
        this.healthCheck()
      ]);

      const cacheStats = await this.redisService.getCacheStats();

      return {
        timestamp: new Date(),
        database: stats,
        slowQueries,
        health: healthCheck,
        cache: cacheStats,
        recommendations: [
          ...healthCheck.recommendations,
          ...(slowQueries.length > 5 ? ['Consider optimizing frequently slow queries'] : []),
          ...(cacheStats?.memory?.used_memory > 100 * 1024 * 1024 ? ['Monitor Redis memory usage'] : [])
        ]
      };
    } catch (error) {
      this.logger.error('Failed to generate performance report:', error);
      return null;
    }
  }
}