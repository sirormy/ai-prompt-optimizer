import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { sseClient, type SSEEvent, type SSEConnectionState } from '../services';

// SSE Hook选项
export interface UseSSEOptions {
  autoConnect?: boolean;
  onEvent?: (event: SSEEvent) => void;
  onStateChange?: (state: SSEConnectionState, error?: Error) => void;
  onProgress?: (progress: any) => void;
  onResult?: (result: any) => void;
  onError?: (error: any) => void;
  onComplete?: () => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    autoConnect = false,
    onEvent,
    onStateChange,
    onProgress,
    onResult,
    onError,
    onComplete,
  } = options;

  const { connectSSE, disconnectSSE } = useAppStore();
  const eventHandlerRef = useRef<(() => void) | null>(null);
  const stateHandlerRef = useRef<(() => void) | null>(null);

  // 设置事件处理器
  useEffect(() => {
    // 清理之前的处理器
    if (eventHandlerRef.current) {
      eventHandlerRef.current();
    }
    if (stateHandlerRef.current) {
      stateHandlerRef.current();
    }

    // 设置新的事件处理器
    eventHandlerRef.current = sseClient.onEvent((event: SSEEvent) => {
      if (onEvent) {
        onEvent(event);
      }

      // 根据事件类型调用相应的回调
      switch (event.type) {
        case 'progress':
          if (onProgress) {
            onProgress(event.data);
          }
          break;
        case 'result':
          if (onResult) {
            onResult(event.data);
          }
          break;
        case 'error':
          if (onError) {
            onError(event.data);
          }
          break;
        case 'complete':
          if (onComplete) {
            onComplete();
          }
          break;
      }
    });

    // 设置状态变化处理器
    stateHandlerRef.current = sseClient.onStateChange((state: SSEConnectionState, error?: Error) => {
      if (onStateChange) {
        onStateChange(state, error);
      }
    });

    return () => {
      if (eventHandlerRef.current) {
        eventHandlerRef.current();
      }
      if (stateHandlerRef.current) {
        stateHandlerRef.current();
      }
    };
  }, [onEvent, onStateChange, onProgress, onResult, onError, onComplete]);

  // 自动连接
  useEffect(() => {
    if (autoConnect && !sseClient.isConnected()) {
      connectSSE().catch(console.error);
    }

    return () => {
      if (autoConnect) {
        disconnectSSE();
      }
    };
  }, [autoConnect, connectSSE, disconnectSSE]);

  const connect = useCallback(async () => {
    try {
      await connectSSE();
    } catch (error) {
      console.error('Failed to connect SSE:', error);
      throw error;
    }
  }, [connectSSE]);

  const disconnect = useCallback(() => {
    disconnectSSE();
  }, [disconnectSSE]);

  const getConnectionState = useCallback(() => {
    return sseClient.getConnectionState();
  }, []);

  const getSessionId = useCallback(() => {
    return sseClient.getSessionId();
  }, []);

  const isConnected = useCallback(() => {
    return sseClient.isConnected();
  }, []);

  return {
    connect,
    disconnect,
    getConnectionState,
    getSessionId,
    isConnected,
    connectionState: sseClient.getConnectionState(),
    sessionId: sseClient.getSessionId(),
    connected: sseClient.isConnected(),
  };
}

// 优化进度SSE Hook
export function useOptimizationSSE() {
  const {
    setOptimizationProgress,
    setOptimizationResult,
    setOptimizing,
    clearOptimizationState,
  } = useAppStore();

  return useSSE({
    onProgress: (progress) => {
      setOptimizationProgress(progress);
    },
    onResult: (result) => {
      setOptimizationResult(result);
      setOptimizing(false);
    },
    onError: (error) => {
      console.error('Optimization error:', error);
      setOptimizing(false);
    },
    onComplete: () => {
      setOptimizing(false);
    },
    onStateChange: (state, error) => {
      if (state === 'error' && error) {
        console.error('SSE connection error:', error);
        setOptimizing(false);
      }
    },
  });
}

export default useSSE;