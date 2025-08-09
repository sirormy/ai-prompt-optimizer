import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RedisService } from '../redis/redis.service';
import { DatabaseOptimizationService } from '../database/database-optimization.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(
    private redisService: RedisService,
    private databaseOptimizationService: DatabaseOptimizationService,
  ) {}

  @Post('performance')
  @ApiOperation({ summary: '接收前端性能指标' })
  async receivePerformanceMetrics(@Body() metrics: any) {
    // 存储前端性能指标到Redis
    const key = `frontend_metrics:${Date.now()}`;
    await this.redisService.set(key, JSON.stringify(metrics), 3600); // 1小时过期
    
    return { message: 'Metrics received successfully' };
  }

  @Get('performance/backend')
  @ApiOperation({ summary: '获取后端性能指标' })
  async getBackendPerformance() {
    const [databaseStats, cacheStats, performanceReport] = await Promise.all([
      this.databaseOptimizationService.getDatabaseStats(),
      this.redisService.getCacheStats(),
      this.databaseOptimizationService.generatePerformanceReport(),
    ]);

    return {
      database: databaseStats,
      cache: cacheStats,
      report: performanceReport,
      timestamp: new Date(),
    };
  }

  @Get('performance/health')
  @ApiOperation({ summary: '系统健康检查' })
  async getSystemHealth() {
    const [databaseHealth, redisHealth] = await Promise.all([
      this.databaseOptimizationService.healthCheck(),
      this.checkRedisHealth(),
    ]);

    const overallStatus = this.determineOverallHealth([
      databaseHealth.status,
      redisHealth.status,
    ]);

    return {
      status: overallStatus,
      components: {
        database: databaseHealth,
        redis: redisHealth,
      },
      timestamp: new Date(),
    };
  }

  @Get('performance/slow-queries')
  @ApiOperation({ summary: '获取慢查询列表' })
  async getSlowQueries() {
    return this.databaseOptimizationService.getSlowQueries(20);
  }

  @Get('cache/stats')
  @ApiOperation({ summary: '获取缓存统计信息' })
  async getCacheStats() {
    return this.redisService.getCacheStats();
  }

  private async checkRedisHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const isConnected = await this.redisService.ping();
      
      if (!isConnected) {
        return {
          status: 'critical',
          issues: ['Redis connection failed'],
          recommendations: ['Check Redis server status and connection settings'],
        };
      }

      const stats = await this.redisService.getCacheStats();
      const issues: string[] = [];
      const recommendations: string[] = [];

      // 检查内存使用
      if (stats?.memory?.used_memory_rss > 1024 * 1024 * 1024) { // 1GB
        issues.push('High Redis memory usage');
        recommendations.push('Consider increasing Redis memory limit or clearing old cache');
      }

      // 检查连接数
      if (stats?.clients?.connected_clients > 100) {
        issues.push('High number of Redis connections');
        recommendations.push('Monitor connection pool usage');
      }

      const status = issues.length === 0 ? 'healthy' : 
                    issues.length <= 1 ? 'warning' : 'critical';

      return { status, issues, recommendations };
    } catch (error) {
      return {
        status: 'critical',
        issues: ['Redis health check failed'],
        recommendations: ['Check Redis connectivity and permissions'],
      };
    }
  }

  private determineOverallHealth(statuses: string[]): 'healthy' | 'warning' | 'critical' {
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }
}