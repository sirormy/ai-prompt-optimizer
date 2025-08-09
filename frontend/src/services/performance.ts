/**
 * 性能监控服务
 * 监控API响应时间、缓存命中率、内存使用等性能指标
 */

import { cacheManager } from '../utils/cache';
import { apiClient } from './api';

export interface PerformanceMetrics {
  apiResponseTimes: Record<string, number[]>;
  cacheHitRates: Record<string, { hits: number; misses: number }>;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  networkRequests: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  pageLoadTimes: Record<string, number>;
  userInteractions: {
    clicks: number;
    scrolls: number;
    keystrokes: number;
  };
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    apiResponseTimes: {},
    cacheHitRates: {},
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    networkRequests: { total: 0, successful: 0, failed: 0, cached: 0 },
    pageLoadTimes: {},
    userInteractions: { clicks: 0, scrolls: 0, keystrokes: 0 }
  };

  private alerts: PerformanceAlert[] = [];
  private thresholds = {
    apiResponseTime: 2000, // 2秒
    cacheHitRate: 0.7, // 70%
    memoryUsage: 0.8, // 80%
    errorRate: 0.1 // 10%
  };

  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // 监控页面加载性能
    this.observePageLoad();
    
    // 监控用户交互
    this.observeUserInteractions();
    
    // 监控内存使用
    this.observeMemoryUsage();
    
    // 定期收集指标
    setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
    }, 30000); // 每30秒收集一次
  }

  private observePageLoad() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.pageLoadTimes[window.location.pathname] = navEntry.loadEventEnd - navEntry.navigationStart;
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    }
  }

  private observeUserInteractions() {
    // 监控点击事件
    document.addEventListener('click', () => {
      this.metrics.userInteractions.clicks++;
    });

    // 监控滚动事件
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.metrics.userInteractions.scrolls++;
      }, 100);
    });

    // 监控键盘事件
    document.addEventListener('keydown', () => {
      this.metrics.userInteractions.keystrokes++;
    });
  }

  private observeMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: memory.usedJSHeapSize / memory.totalJSHeapSize
        };
      }, 10000); // 每10秒检查一次内存使用
    }
  }

  // 记录API响应时间
  recordApiResponse(endpoint: string, responseTime: number, success: boolean, fromCache: boolean = false) {
    if (!this.metrics.apiResponseTimes[endpoint]) {
      this.metrics.apiResponseTimes[endpoint] = [];
    }
    
    this.metrics.apiResponseTimes[endpoint].push(responseTime);
    
    // 只保留最近100次记录
    if (this.metrics.apiResponseTimes[endpoint].length > 100) {
      this.metrics.apiResponseTimes[endpoint].shift();
    }

    // 更新网络请求统计
    this.metrics.networkRequests.total++;
    if (success) {
      this.metrics.networkRequests.successful++;
    } else {
      this.metrics.networkRequests.failed++;
    }
    
    if (fromCache) {
      this.metrics.networkRequests.cached++;
    }
  }

  // 记录缓存命中/未命中
  recordCacheAccess(key: string, hit: boolean) {
    if (!this.metrics.cacheHitRates[key]) {
      this.metrics.cacheHitRates[key] = { hits: 0, misses: 0 };
    }
    
    if (hit) {
      this.metrics.cacheHitRates[key].hits++;
    } else {
      this.metrics.cacheHitRates[key].misses++;
    }
  }

  // 收集当前指标
  private collectMetrics() {
    // 获取缓存统计
    const cacheStats = cacheManager.getStats();
    
    // 计算总体缓存命中率
    let totalHits = 0;
    let totalMisses = 0;
    
    Object.values(this.metrics.cacheHitRates).forEach(rate => {
      totalHits += rate.hits;
      totalMisses += rate.misses;
    });
    
    const overallHitRate = totalHits / (totalHits + totalMisses) || 0;
    
    // 发送指标到后端（可选）
    this.sendMetricsToBackend({
      cacheHitRate: overallHitRate,
      memoryUsage: this.metrics.memoryUsage.percentage,
      networkRequests: this.metrics.networkRequests,
      cacheStats
    });
  }

  // 检查性能阈值
  private checkThresholds() {
    // 检查API响应时间
    Object.entries(this.metrics.apiResponseTimes).forEach(([endpoint, times]) => {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      if (avgTime > this.thresholds.apiResponseTime) {
        this.addAlert({
          type: 'warning',
          message: `API响应时间过长: ${endpoint}`,
          metric: 'apiResponseTime',
          value: avgTime,
          threshold: this.thresholds.apiResponseTime,
          timestamp: new Date()
        });
      }
    });

    // 检查缓存命中率
    Object.entries(this.metrics.cacheHitRates).forEach(([key, rate]) => {
      const hitRate = rate.hits / (rate.hits + rate.misses);
      if (hitRate < this.thresholds.cacheHitRate) {
        this.addAlert({
          type: 'info',
          message: `缓存命中率较低: ${key}`,
          metric: 'cacheHitRate',
          value: hitRate,
          threshold: this.thresholds.cacheHitRate,
          timestamp: new Date()
        });
      }
    });

    // 检查内存使用
    if (this.metrics.memoryUsage.percentage > this.thresholds.memoryUsage) {
      this.addAlert({
        type: 'warning',
        message: '内存使用率过高',
        metric: 'memoryUsage',
        value: this.metrics.memoryUsage.percentage,
        threshold: this.thresholds.memoryUsage,
        timestamp: new Date()
      });
    }

    // 检查错误率
    const errorRate = this.metrics.networkRequests.failed / this.metrics.networkRequests.total;
    if (errorRate > this.thresholds.errorRate) {
      this.addAlert({
        type: 'error',
        message: '网络请求错误率过高',
        metric: 'errorRate',
        value: errorRate,
        threshold: this.thresholds.errorRate,
        timestamp: new Date()
      });
    }
  }

  private addAlert(alert: PerformanceAlert) {
    this.alerts.push(alert);
    
    // 只保留最近50个警告
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
    
    // 在控制台输出警告
    console.warn(`Performance Alert: ${alert.message}`, alert);
    
    // 可以在这里添加用户通知逻辑
  }

  private async sendMetricsToBackend(metrics: any) {
    try {
      // 发送性能指标到后端进行分析
      await apiClient.post('/analytics/performance', metrics);
    } catch (error) {
      // 静默失败，不影响用户体验
      console.debug('Failed to send performance metrics:', error);
    }
  }

  // 公共方法
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  clearAlerts() {
    this.alerts = [];
  }

  updateThresholds(newThresholds: Partial<typeof this.thresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // 获取性能报告
  getPerformanceReport(): {
    summary: {
      avgApiResponseTime: number;
      overallCacheHitRate: number;
      memoryUsagePercentage: number;
      errorRate: number;
    };
    recommendations: string[];
  } {
    // 计算平均API响应时间
    const allResponseTimes = Object.values(this.metrics.apiResponseTimes).flat();
    const avgApiResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length 
      : 0;

    // 计算总体缓存命中率
    let totalHits = 0;
    let totalMisses = 0;
    Object.values(this.metrics.cacheHitRates).forEach(rate => {
      totalHits += rate.hits;
      totalMisses += rate.misses;
    });
    const overallCacheHitRate = totalHits / (totalHits + totalMisses) || 0;

    // 计算错误率
    const errorRate = this.metrics.networkRequests.total > 0 
      ? this.metrics.networkRequests.failed / this.metrics.networkRequests.total 
      : 0;

    // 生成优化建议
    const recommendations: string[] = [];
    
    if (avgApiResponseTime > this.thresholds.apiResponseTime) {
      recommendations.push('考虑增加API响应缓存时间或优化后端性能');
    }
    
    if (overallCacheHitRate < this.thresholds.cacheHitRate) {
      recommendations.push('考虑调整缓存策略，增加缓存时间或扩大缓存范围');
    }
    
    if (this.metrics.memoryUsage.percentage > this.thresholds.memoryUsage) {
      recommendations.push('考虑清理不必要的缓存或优化内存使用');
    }
    
    if (errorRate > this.thresholds.errorRate) {
      recommendations.push('检查网络连接和API稳定性');
    }

    return {
      summary: {
        avgApiResponseTime,
        overallCacheHitRate,
        memoryUsagePercentage: this.metrics.memoryUsage.percentage,
        errorRate
      },
      recommendations
    };
  }

  // 清理资源
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 导出类型和实例
export default performanceMonitor;