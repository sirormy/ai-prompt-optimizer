import { OptimizationProgress, OptimizationResult, OptimizationError } from '../store/types';
import { authService } from './auth';

// SSE事件类型
export interface SSEEvent {
  type: 'progress' | 'result' | 'error' | 'complete';
  data: OptimizationProgress | OptimizationResult | OptimizationError | any;
  timestamp: number;
  sessionId: string;
}

// SSE连接状态
export type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// SSE事件处理器类型
export type SSEEventHandler = (event: SSEEvent) => void;
export type SSEStateHandler = (state: SSEConnectionState, error?: Error) => void;

// SSE连接配置
interface SSEConfig {
  baseUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private connectionState: SSEConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  private config: Required<SSEConfig> = {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000, // 30秒心跳检测
  };

  private eventHandlers: SSEEventHandler[] = [];
  private stateHandlers: SSEStateHandler[] = [];

  constructor(config?: Partial<SSEConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // 事件处理器管理
  onEvent(handler: SSEEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  onStateChange(handler: SSEStateHandler): () => void {
    this.stateHandlers.push(handler);
    return () => {
      const index = this.stateHandlers.indexOf(handler);
      if (index > -1) {
        this.stateHandlers.splice(index, 1);
      }
    };
  }

  private emitEvent(event: SSEEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('SSE event handler error:', error);
      }
    });
  }

  private emitStateChange(state: SSEConnectionState, error?: Error): void {
    this.connectionState = state;
    this.stateHandlers.forEach(handler => {
      try {
        handler(state, error);
      } catch (error) {
        console.error('SSE state handler error:', error);
      }
    });
  }

  // 创建新的SSE会话
  async createSession(): Promise<string> {
    try {
      const token = await authService.ensureValidToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.config.baseUrl}/sse/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      return data.sessionId;
    } catch (error) {
      console.error('Failed to create SSE session:', error);
      throw error;
    }
  }

  // 连接到SSE流
  async connect(sessionId?: string): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    try {
      this.emitStateChange('connecting');

      // 如果没有提供sessionId，创建新的会话
      if (!sessionId) {
        sessionId = await this.createSession();
      }

      this.sessionId = sessionId;

      // 确保有有效的token
      const token = await authService.ensureValidToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // 创建EventSource连接
      const url = `${this.config.baseUrl}/sse/optimization/${sessionId}`;
      this.eventSource = new EventSource(url, {
        withCredentials: true,
      });

      // 设置事件监听器
      this.setupEventListeners();

      // 启动心跳检测
      this.startHeartbeat();

    } catch (error) {
      this.emitStateChange('error', error as Error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
      this.emitStateChange('connected');
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const sseEvent: SSEEvent = {
          ...data,
          sessionId: this.sessionId!,
        };
        
        this.lastHeartbeat = Date.now();
        this.emitEvent(sseEvent);

        // 如果收到complete事件，自动关闭连接
        if (sseEvent.type === 'complete') {
          this.disconnect();
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.emitStateChange('error', new Error('SSE connection error'));
      
      // 尝试重连
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.disconnect();
      }
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;
      
      // 如果超过心跳间隔的2倍时间没有收到消息，认为连接异常
      if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2) {
        console.warn('SSE heartbeat timeout, attempting reconnect');
        this.scheduleReconnect();
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling SSE reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private async reconnect(): Promise<void> {
    if (this.connectionState === 'connected') {
      return;
    }

    try {
      this.disconnect(false); // 不重置重连计数
      await this.connect(this.sessionId || undefined);
    } catch (error) {
      console.error('SSE reconnect failed:', error);
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    }
  }

  // 断开连接
  disconnect(resetReconnectAttempts = true): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (resetReconnectAttempts) {
      this.reconnectAttempts = 0;
    }

    this.emitStateChange('disconnected');
  }

  // 手动关闭会话
  async closeSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      const token = await authService.ensureValidToken();
      if (token) {
        await fetch(`${this.config.baseUrl}/sse/session/${this.sessionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Failed to close SSE session:', error);
    } finally {
      this.disconnect();
      this.sessionId = null;
    }
  }

  // 获取连接状态
  getConnectionState(): SSEConnectionState {
    return this.connectionState;
  }

  // 获取会话ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  // 更新配置
  updateConfig(config: Partial<SSEConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 清理资源
  destroy(): void {
    this.disconnect();
    this.eventHandlers.length = 0;
    this.stateHandlers.length = 0;
  }
}

// 创建默认SSE客户端实例
export const sseClient = new SSEClient();
export default sseClient;