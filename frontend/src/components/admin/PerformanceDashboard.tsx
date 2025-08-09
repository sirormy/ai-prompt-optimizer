'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  BarChart3,
  Clock,
  HardDrive
} from 'lucide-react';
import { performanceMonitor, type PerformanceMetrics, type PerformanceAlert } from '../../services/performance';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api';

interface BackendMetrics {
  database: any;
  cache: any;
  report: any;
  timestamp: string;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  components: {
    database: any;
    redis: any;
  };
  timestamp: string;
}

export const PerformanceDashboard: React.FC = () => {
  const [frontendMetrics, setFrontendMetrics] = useState<PerformanceMetrics | null>(null);
  const [backendMetrics, setBackendMetrics] = useState<BackendMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { clearCache, getPerformanceReport } = useAppStore();

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // 每30秒刷新
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);

      // 获取前端性能指标
      const frontendData = performanceMonitor.getMetrics();
      const frontendAlerts = performanceMonitor.getAlerts();
      
      setFrontendMetrics(frontendData);
      setAlerts(frontendAlerts);

      // 获取后端性能指标
      const [backendData, healthData] = await Promise.all([
        apiClient.get<BackendMetrics>('/analytics/performance/backend'),
        apiClient.get<SystemHealth>('/analytics/performance/health')
      ]);

      setBackendMetrics(backendData);
      setSystemHealth(healthData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = (tags?: string[]) => {
    clearCache(tags);
    // 显示成功消息
    alert(tags ? `已清除标签为 ${tags.join(', ')} 的缓存` : '已清除所有缓存');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">性能监控</h1>
          <p className="text-gray-600 mt-1">
            最后更新: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={loadMetrics} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 系统健康状态 */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(systemHealth.status)}
              系统健康状态
              <Badge 
                variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}
                className={getStatusColor(systemHealth.status)}
              >
                {systemHealth.status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">数据库</h4>
                <div className={`flex items-center gap-2 ${getStatusColor(systemHealth.components.database.status)}`}>
                  {getStatusIcon(systemHealth.components.database.status)}
                  <span>{systemHealth.components.database.status}</span>
                </div>
                {systemHealth.components.database.issues.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-600">
                    {systemHealth.components.database.issues.map((issue: string, index: number) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Redis缓存</h4>
                <div className={`flex items-center gap-2 ${getStatusColor(systemHealth.components.redis.status)}`}>
                  {getStatusIcon(systemHealth.components.redis.status)}
                  <span>{systemHealth.components.redis.status}</span>
                </div>
                {systemHealth.components.redis.issues.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-600">
                    {systemHealth.components.redis.issues.map((issue: string, index: number) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 性能警告 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert, index) => (
            <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{alert.message}</strong>
                <span className="ml-2 text-sm text-gray-600">
                  当前值: {alert.value.toFixed(2)}, 阈值: {alert.threshold}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 性能指标标签页 */}
      <Tabs defaultValue="frontend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="frontend">前端性能</TabsTrigger>
          <TabsTrigger value="backend">后端性能</TabsTrigger>
          <TabsTrigger value="cache">缓存管理</TabsTrigger>
        </TabsList>

        {/* 前端性能 */}
        <TabsContent value="frontend" className="space-y-4">
          {frontendMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    API响应时间
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.values(frontendMetrics.apiResponseTimes).flat().length > 0
                      ? formatDuration(
                          Object.values(frontendMetrics.apiResponseTimes)
                            .flat()
                            .reduce((sum, time) => sum + time, 0) /
                          Object.values(frontendMetrics.apiResponseTimes).flat().length
                        )
                      : '0ms'
                    }
                  </div>
                  <p className="text-xs text-gray-600">平均响应时间</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    缓存命中率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(() => {
                      const rates = Object.values(frontendMetrics.cacheHitRates);
                      if (rates.length === 0) return '0%';
                      const totalHits = rates.reduce((sum, rate) => sum + rate.hits, 0);
                      const totalMisses = rates.reduce((sum, rate) => sum + rate.misses, 0);
                      const hitRate = totalHits / (totalHits + totalMisses) || 0;
                      return `${(hitRate * 100).toFixed(1)}%`;
                    })()}
                  </div>
                  <p className="text-xs text-gray-600">缓存效率</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    内存使用
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(frontendMetrics.memoryUsage.percentage * 100).toFixed(1)}%
                  </div>
                  <Progress 
                    value={frontendMetrics.memoryUsage.percentage * 100} 
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {formatBytes(frontendMetrics.memoryUsage.used)} / {formatBytes(frontendMetrics.memoryUsage.total)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    网络请求
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {frontendMetrics.networkRequests.total}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>成功: {frontendMetrics.networkRequests.successful}</div>
                    <div>失败: {frontendMetrics.networkRequests.failed}</div>
                    <div>缓存: {frontendMetrics.networkRequests.cached}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 后端性能 */}
        <TabsContent value="backend" className="space-y-4">
          {backendMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    数据库性能
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>集合数量:</span>
                    <span>{backendMetrics.database?.database?.collections || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>文档数量:</span>
                    <span>{backendMetrics.database?.database?.objects || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>数据大小:</span>
                    <span>{formatBytes(backendMetrics.database?.database?.dataSize || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>索引大小:</span>
                    <span>{formatBytes(backendMetrics.database?.database?.indexSize || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    服务器状态
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>运行时间:</span>
                    <span>{Math.floor((backendMetrics.database?.server?.uptime || 0) / 3600)}小时</span>
                  </div>
                  <div className="flex justify-between">
                    <span>当前连接:</span>
                    <span>{backendMetrics.database?.server?.connections?.current || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>可用连接:</span>
                    <span>{backendMetrics.database?.server?.connections?.available || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>内存使用:</span>
                    <span>{formatBytes((backendMetrics.database?.server?.mem?.resident || 0) * 1024 * 1024)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 缓存管理 */}
        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>缓存操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => handleClearCache()}
                  variant="outline"
                  className="w-full"
                >
                  清除所有缓存
                </Button>
                <Button 
                  onClick={() => handleClearCache(['prompts'])}
                  variant="outline"
                  className="w-full"
                >
                  清除提示词缓存
                </Button>
                <Button 
                  onClick={() => handleClearCache(['user-data'])}
                  variant="outline"
                  className="w-full"
                >
                  清除用户数据缓存
                </Button>
                <Button 
                  onClick={() => handleClearCache(['models'])}
                  variant="outline"
                  className="w-full"
                >
                  清除模型缓存
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>缓存统计</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const stats = apiClient.getCacheStats();
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>内存缓存:</span>
                        <span>{stats.memory.size} 项</span>
                      </div>
                      <div className="flex justify-between">
                        <span>本地存储:</span>
                        <span>{stats.localStorage.size} 项</span>
                      </div>
                      <div className="flex justify-between">
                        <span>会话存储:</span>
                        <span>{stats.sessionStorage.size} 项</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};