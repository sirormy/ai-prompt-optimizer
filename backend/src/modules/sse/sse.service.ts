import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { 
  SSEEvent, 
  SSESession, 
  OptimizationProgress, 
  OptimizationResult, 
  OptimizationError 
} from './interfaces/sse-event.interface';

@Injectable()
export class SSEService {
  private readonly logger = new Logger(SSEService.name);
  private readonly sessions = new Map<string, SSESession>();
  private readonly userSessions = new Map<string, Set<string>>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每5分钟清理一次非活跃连接
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * 创建新的SSE连接
   */
  createConnection(sessionId: string, userId: string, response: Response): void {
    this.logger.log(`Creating SSE connection for session: ${sessionId}, user: ${userId}`);

    // 设置SSE响应头
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // 发送初始连接事件
    this.writeSSEEvent(response, {
      type: 'progress',
      data: {
        stage: 'analyzing',
        percentage: 0,
        message: 'Connection established',
      },
      timestamp: Date.now(),
      sessionId,
    });

    // 创建会话记录
    const session: SSESession = {
      id: sessionId,
      userId,
      response,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    this.sessions.set(sessionId, session);

    // 维护用户会话映射
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    // 处理连接关闭
    response.on('close', () => {
      this.logger.log(`SSE connection closed for session: ${sessionId}`);
      this.closeConnection(sessionId);
    });

    response.on('error', (error) => {
      this.logger.error(`SSE connection error for session: ${sessionId}`, error);
      this.closeConnection(sessionId);
    });
  }

  /**
   * 发送优化进度更新
   */
  sendProgress(sessionId: string, progress: OptimizationProgress): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      this.logger.warn(`Attempted to send progress to inactive session: ${sessionId}`);
      return;
    }

    const event: SSEEvent = {
      type: 'progress',
      data: progress,
      timestamp: Date.now(),
      sessionId,
    };

    this.writeSSEEvent(session.response, event);
    this.updateSessionActivity(sessionId);
  }

  /**
   * 发送优化结果
   */
  sendResult(sessionId: string, result: OptimizationResult): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      this.logger.warn(`Attempted to send result to inactive session: ${sessionId}`);
      return;
    }

    const event: SSEEvent = {
      type: 'result',
      data: result,
      timestamp: Date.now(),
      sessionId,
    };

    this.writeSSEEvent(session.response, event);
    this.updateSessionActivity(sessionId);
  }

  /**
   * 发送错误信息
   */
  sendError(sessionId: string, error: OptimizationError): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      this.logger.warn(`Attempted to send error to inactive session: ${sessionId}`);
      return;
    }

    const event: SSEEvent = {
      type: 'error',
      data: error,
      timestamp: Date.now(),
      sessionId,
    };

    this.writeSSEEvent(session.response, event);
    this.updateSessionActivity(sessionId);
  }

  /**
   * 发送完成事件并关闭连接
   */
  sendComplete(sessionId: string, finalData?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      this.logger.warn(`Attempted to send complete to inactive session: ${sessionId}`);
      return;
    }

    const event: SSEEvent = {
      type: 'complete',
      data: finalData || { message: 'Optimization completed' },
      timestamp: Date.now(),
      sessionId,
    };

    this.writeSSEEvent(session.response, event);
    
    // 延迟关闭连接，确保客户端收到完成事件
    setTimeout(() => {
      this.closeConnection(sessionId);
    }, 1000);
  }

  /**
   * 关闭指定会话连接
   */
  closeConnection(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.logger.log(`Closing SSE connection for session: ${sessionId}`);

    // 标记会话为非活跃
    session.isActive = false;

    // 关闭响应流
    try {
      if (!session.response.destroyed) {
        session.response.end();
      }
    } catch (error) {
      this.logger.error(`Error closing response for session: ${sessionId}`, error);
    }

    // 从会话映射中移除
    this.sessions.delete(sessionId);

    // 从用户会话映射中移除
    const userSessionSet = this.userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }
  }

  /**
   * 关闭用户的所有会话
   */
  closeUserSessions(userId: string): void {
    const userSessionSet = this.userSessions.get(userId);
    if (!userSessionSet) {
      return;
    }

    this.logger.log(`Closing all SSE sessions for user: ${userId}`);

    const sessionIds = Array.from(userSessionSet);
    sessionIds.forEach(sessionId => {
      this.closeConnection(sessionId);
    });
  }

  /**
   * 获取活跃会话统计
   */
  getActiveSessionsStats(): { total: number; byUser: Record<string, number> } {
    const byUser: Record<string, number> = {};
    
    for (const [userId, sessionSet] of this.userSessions.entries()) {
      byUser[userId] = sessionSet.size;
    }

    return {
      total: this.sessions.size,
      byUser,
    };
  }

  /**
   * 检查会话是否活跃
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.isActive : false;
  }

  /**
   * 写入SSE事件到响应流
   */
  private writeSSEEvent(response: Response, event: SSEEvent): void {
    try {
      const eventData = `data: ${JSON.stringify(event)}\n\n`;
      response.write(eventData);
    } catch (error) {
      this.logger.error('Error writing SSE event', error);
    }
  }

  /**
   * 更新会话活动时间
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * 清理非活跃会话
   */
  private cleanupInactiveSessions(): void {
    const now = new Date();
    const inactiveThreshold = 10 * 60 * 1000; // 10分钟

    const inactiveSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > inactiveThreshold || !session.isActive) {
        inactiveSessions.push(sessionId);
      }
    }

    if (inactiveSessions.length > 0) {
      this.logger.log(`Cleaning up ${inactiveSessions.length} inactive SSE sessions`);
      inactiveSessions.forEach(sessionId => {
        this.closeConnection(sessionId);
      });
    }
  }

  /**
   * 服务销毁时清理资源
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 关闭所有活跃连接
    const activeSessions = Array.from(this.sessions.keys());
    activeSessions.forEach(sessionId => {
      this.closeConnection(sessionId);
    });

    this.logger.log('SSE Service destroyed, all connections closed');
  }
}