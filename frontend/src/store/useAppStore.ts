import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  Prompt,
  User,
  AIModel,
  UserPreferences,
  OptimizationRequest,
  OptimizationResult,
  OptimizationProgress,
  Improvement,
  Suggestion,
} from './types';
import { 
  promptsService, 
  modelsService, 
  usersService, 
  authService,
  sseClient,
  type SSEEvent,
  type SSEConnectionState,
} from '../services';
import { performanceMonitor } from '../services/performance';
import { cacheManager } from '../utils/cache';

// 应用状态接口
interface AppState {
  // 提示词状态
  prompts: {
    current: Prompt | null;
    history: Prompt[];
    isOptimizing: boolean;
    optimizationProgress: OptimizationProgress | null;
    optimizationResult: OptimizationResult | null;
  };

  // 用户状态
  user: {
    profile: User | null;
    preferences: UserPreferences;
    apiKeys: Record<string, string>;
    isAuthenticated: boolean;
  };

  // UI状态
  ui: {
    selectedModel: AIModel | null;
    activeTab: string;
    isLoading: boolean;
    sidebarCollapsed: boolean;
    theme: 'light' | 'dark';
  };

  // 模型状态
  models: {
    available: AIModel[];
    isLoading: boolean;
  };
}

// 应用动作接口
interface AppActions {
  // 提示词相关动作
  setCurrentPrompt: (prompt: Prompt | null) => void;
  addToHistory: (prompt: Prompt) => void;
  setOptimizing: (isOptimizing: boolean) => void;
  setOptimizationProgress: (progress: OptimizationProgress | null) => void;
  setOptimizationResult: (result: OptimizationResult | null) => void;
  clearOptimizationState: () => void;

  // 用户相关动作
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updateApiKeys: (apiKeys: Record<string, string>) => void;

  // UI相关动作
  setSelectedModel: (model: AIModel | null) => void;
  setActiveTab: (tab: string) => void;
  setLoading: (isLoading: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // 模型相关动作
  setAvailableModels: (models: AIModel[]) => void;
  setModelsLoading: (isLoading: boolean) => void;

  // 异步动作
  optimizePrompt: (request: OptimizationRequest) => Promise<void>;
  optimizePromptWithSSE: (request: OptimizationRequest) => Promise<void>;
  savePrompt: (prompt: Prompt) => Promise<void>;
  loadHistory: () => Promise<void>;
  loadAvailableModels: () => Promise<void>;
  deletePrompt: (promptId: string) => Promise<void>;
  deletePrompts: (promptIds: string[]) => Promise<void>;
  updatePrompt: (promptId: string, updates: Partial<Prompt>) => Promise<void>;
  
  // SSE相关动作
  connectSSE: () => Promise<void>;
  disconnectSSE: () => void;
  
  // 认证相关动作
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;

  // 性能和缓存相关动作
  clearCache: (tags?: string[]) => void;
  preloadData: () => Promise<void>;
  getPerformanceReport: () => any;
}

// 默认用户偏好设置
const defaultPreferences: UserPreferences = {
  defaultModel: 'openai-gpt-4',
  optimizationLevel: 'advanced',
  autoSave: true,
  theme: 'light',
  language: 'zh',
};

// 创建Zustand store
// 辅助函数：生成优化后的提示词
const generateOptimizedPrompt = (originalPrompt: string, model: AIModel): string => {
  let optimized = originalPrompt;
  
  // 应用结构优化
  if (model.optimizationRules.some(rule => rule.category === 'structure' && rule.isActive)) {
    optimized = optimized.replace(/^(.+)$/, '请按照以下要求：$1\n\n请确保回答：\n1. 准确性\n2. 完整性\n3. 清晰性');
  }
  
  // 应用清晰度优化
  if (model.optimizationRules.some(rule => rule.category === 'clarity' && rule.isActive)) {
    optimized = optimized.replace(/请/, '请详细');
    optimized = optimized.replace(/帮我/, '请帮助我');
  }
  
  // 应用具体性优化
  if (model.optimizationRules.some(rule => rule.category === 'specificity' && rule.isActive)) {
    if (!optimized.includes('具体') && !optimized.includes('详细')) {
      optimized += '\n\n请提供具体的例子和详细的解释。';
    }
  }
  
  return optimized.trim();
};

// 辅助函数：生成改进项目
const generateImprovements = (originalPrompt: string, model: AIModel): Improvement[] => {
  const improvements: Improvement[] = [];
  
  if (model.optimizationRules.some(rule => rule.category === 'structure' && rule.isActive)) {
    improvements.push({
      type: 'structure',
      description: '添加了结构化的要求说明，使AI能够更好地理解期望的回答格式',
      impact: 'high',
      before: originalPrompt.split('\n')[0] || originalPrompt.substring(0, 50) + '...',
      after: '请按照以下要求：' + (originalPrompt.split('\n')[0] || originalPrompt.substring(0, 50)) + '...',
    });
  }
  
  if (model.optimizationRules.some(rule => rule.category === 'clarity' && rule.isActive)) {
    improvements.push({
      type: 'clarity',
      description: '增强了表达的清晰度，使用更明确的指令词汇',
      impact: 'medium',
      before: '请帮我',
      after: '请详细帮助我',
    });
  }
  
  if (model.optimizationRules.some(rule => rule.category === 'specificity' && rule.isActive)) {
    improvements.push({
      type: 'specificity',
      description: '添加了具体性要求，确保AI提供更详细和实用的回答',
      impact: 'high',
      before: originalPrompt,
      after: originalPrompt + '\n\n请提供具体的例子和详细的解释。',
    });
  }
  
  return improvements;
};

// 辅助函数：生成优化建议
const generateSuggestions = (originalPrompt: string, model: AIModel): Suggestion[] => {
  const suggestions: Suggestion[] = [];
  
  suggestions.push({
    id: 'context_1',
    type: 'context',
    title: '添加上下文信息',
    description: '考虑添加更多背景信息，帮助AI更好地理解您的需求场景',
    example: '背景：我是一名产品经理，正在为新产品制定营销策略...',
    priority: 1,
  });
  
  suggestions.push({
    id: 'structure_1',
    type: 'structure',
    title: '使用分步骤格式',
    description: '将复杂的请求分解为多个步骤，可以获得更有条理的回答',
    example: '请按以下步骤分析：\n1. 首先分析现状\n2. 然后提出建议\n3. 最后总结要点',
    priority: 2,
  });
  
  suggestions.push({
    id: 'specificity_1',
    type: 'specificity',
    title: '指定输出格式',
    description: '明确指定期望的回答格式，如列表、表格或段落形式',
    example: '请以表格形式列出，包含以下列：名称、描述、优缺点',
    priority: 3,
  });
  
  return suggestions;
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        prompts: {
          current: null,
          history: [],
          isOptimizing: false,
          optimizationProgress: null,
          optimizationResult: null,
        },

        user: {
          profile: null,
          preferences: defaultPreferences,
          apiKeys: {},
          isAuthenticated: false,
        },

        ui: {
          selectedModel: null,
          activeTab: 'home',
          isLoading: false,
          sidebarCollapsed: false,
          theme: 'light',
        },

        models: {
          available: [],
          isLoading: false,
        },

        // 动作实现
        setCurrentPrompt: prompt =>
          set(state => ({
            prompts: { ...state.prompts, current: prompt },
          })),

        addToHistory: prompt =>
          set(state => ({
            prompts: {
              ...state.prompts,
              history: [prompt, ...state.prompts.history],
            },
          })),

        setOptimizing: isOptimizing =>
          set(state => ({
            prompts: { ...state.prompts, isOptimizing },
          })),

        setOptimizationProgress: optimizationProgress =>
          set(state => ({
            prompts: { ...state.prompts, optimizationProgress },
          })),

        setOptimizationResult: optimizationResult =>
          set(state => ({
            prompts: { ...state.prompts, optimizationResult },
          })),

        clearOptimizationState: () =>
          set(state => ({
            prompts: {
              ...state.prompts,
              isOptimizing: false,
              optimizationProgress: null,
              optimizationResult: null,
            },
          })),

        setUser: profile =>
          set(state => ({
            user: { ...state.user, profile },
          })),

        setAuthenticated: isAuthenticated =>
          set(state => ({
            user: { ...state.user, isAuthenticated },
          })),

        updatePreferences: preferences =>
          set(state => ({
            user: {
              ...state.user,
              preferences: { ...state.user.preferences, ...preferences },
            },
          })),

        updateApiKeys: apiKeys =>
          set(state => ({
            user: {
              ...state.user,
              apiKeys: { ...state.user.apiKeys, ...apiKeys },
            },
          })),

        setSelectedModel: selectedModel =>
          set(state => ({
            ui: { ...state.ui, selectedModel },
          })),

        setActiveTab: activeTab =>
          set(state => ({
            ui: { ...state.ui, activeTab },
          })),

        setLoading: isLoading =>
          set(state => ({
            ui: { ...state.ui, isLoading },
          })),

        setSidebarCollapsed: sidebarCollapsed =>
          set(state => ({
            ui: { ...state.ui, sidebarCollapsed },
          })),

        setTheme: theme =>
          set(state => ({
            ui: { ...state.ui, theme },
            user: {
              ...state.user,
              preferences: { ...state.user.preferences, theme },
            },
          })),

        setAvailableModels: available =>
          set(state => ({
            models: { ...state.models, available },
          })),

        setModelsLoading: isLoading =>
          set(state => ({
            models: { ...state.models, isLoading },
          })),

        // 异步动作实现
        optimizePrompt: async (request: OptimizationRequest) => {
          const { setOptimizing, setOptimizationProgress, setOptimizationResult, clearOptimizationState } = get();
          
          try {
            setOptimizing(true);
            clearOptimizationState();

            // 使用SSE进行实时优化
            if (sseClient.isConnected()) {
              // 如果SSE已连接，使用流式优化
              const sessionId = sseClient.getSessionId();
              if (sessionId) {
                await promptsService.optimizePromptStream({
                  ...request,
                  sessionId,
                });
                return; // SSE会处理进度和结果更新
              }
            }

            // 否则使用同步优化
            const result = await promptsService.optimizePrompt(request);
            setOptimizationResult(result);
            setOptimizing(false);
            
          } catch (error) {
            setOptimizing(false);
            console.error('Optimization failed:', error);
            throw error;
          }
        },

        savePrompt: async (prompt: Prompt) => {
          try {
            if (prompt.id) {
              // 更新现有提示词
              const updated = await promptsService.updatePrompt(prompt.id, {
                originalText: prompt.originalText,
                optimizedText: prompt.optimizedText,
                targetModel: prompt.targetModel,
                messageRole: prompt.messageRole,
                systemPrompt: prompt.systemPrompt,
              });
              
              // 更新store中的历史记录
              set(state => ({
                prompts: {
                  ...state.prompts,
                  history: state.prompts.history.map(p => 
                    p.id === updated.id ? updated : p
                  ),
                },
              }));
            } else {
              // 创建新提示词
              const created = await promptsService.createPrompt({
                originalText: prompt.originalText,
                targetModel: prompt.targetModel,
                messageRole: prompt.messageRole,
                systemPrompt: prompt.systemPrompt,
                optimizationLevel: 'advanced',
              });
              
              // 添加到历史记录
              set(state => ({
                prompts: {
                  ...state.prompts,
                  history: [created, ...state.prompts.history],
                },
              }));
            }
          } catch (error) {
            console.error('Failed to save prompt:', error);
            throw error;
          }
        },

        loadHistory: async () => {
          try {
            const response = await promptsService.getUserPrompts({
              page: 1,
              limit: 50,
              sortBy: 'createdAt',
              sortOrder: 'desc',
            });
            
            set(state => ({
              prompts: {
                ...state.prompts,
                history: response.data,
              },
            }));
          } catch (error) {
            console.error('Failed to load history:', error);
            throw error;
          }
        },

        deletePrompt: async (promptId: string) => {
          try {
            await promptsService.deletePrompt(promptId);
            
            // 从历史记录中移除
            set(state => ({
              prompts: {
                ...state.prompts,
                history: state.prompts.history.filter(prompt => prompt.id !== promptId),
              },
            }));
          } catch (error) {
            console.error('Failed to delete prompt:', error);
            throw error;
          }
        },

        deletePrompts: async (promptIds: string[]) => {
          try {
            const result = await promptsService.deletePrompts(promptIds);
            
            // 从历史记录中移除多个项目
            set(state => ({
              prompts: {
                ...state.prompts,
                history: state.prompts.history.filter(prompt => !promptIds.includes(prompt.id)),
              },
            }));
            
            return result;
          } catch (error) {
            console.error('Failed to delete prompts:', error);
            throw error;
          }
        },

        updatePrompt: async (promptId: string, updates: Partial<Prompt>) => {
          try {
            const updated = await promptsService.updatePrompt(promptId, {
              originalText: updates.originalText,
              optimizedText: updates.optimizedText,
              targetModel: updates.targetModel,
              messageRole: updates.messageRole,
              systemPrompt: updates.systemPrompt,
            });
            
            // 更新历史记录中的项目
            set(state => ({
              prompts: {
                ...state.prompts,
                history: state.prompts.history.map(prompt =>
                  prompt.id === promptId ? updated : prompt
                ),
              },
            }));
            
            return updated;
          } catch (error) {
            console.error('Failed to update prompt:', error);
            throw error;
          }
        },

        loadAvailableModels: async () => {
          try {
            set(state => ({ models: { ...state.models, isLoading: true } }));
            
            const models = await modelsService.getAvailableModels();
            
            set(state => ({
              models: {
                available: models,
                isLoading: false,
              },
            }));
          } catch (error) {
            console.error('Failed to load models:', error);
            set(state => ({
              models: {
                ...state.models,
                isLoading: false,
              },
            }));
            throw error;
          }
        },

        // SSE优化（实时进度）
        optimizePromptWithSSE: async (request: OptimizationRequest) => {
          const { setOptimizing, setOptimizationProgress, setOptimizationResult, clearOptimizationState } = get();
          
          try {
            setOptimizing(true);
            clearOptimizationState();

            // 确保SSE连接
            if (!sseClient.isConnected()) {
              await get().connectSSE();
            }

            const sessionId = sseClient.getSessionId();
            if (!sessionId) {
              throw new Error('Failed to establish SSE connection');
            }

            // 发送优化请求
            await promptsService.optimizePromptStream({
              ...request,
              sessionId,
            });

          } catch (error) {
            setOptimizing(false);
            console.error('SSE optimization failed:', error);
            throw error;
          }
        },

        // SSE连接管理
        connectSSE: async () => {
          try {
            // 设置SSE事件处理器
            sseClient.onEvent((event: SSEEvent) => {
              const { setOptimizationProgress, setOptimizationResult, setOptimizing } = get();
              
              switch (event.type) {
                case 'progress':
                  setOptimizationProgress(event.data as OptimizationProgress);
                  break;
                case 'result':
                  setOptimizationResult(event.data as OptimizationResult);
                  setOptimizing(false);
                  break;
                case 'error':
                  console.error('SSE optimization error:', event.data);
                  setOptimizing(false);
                  break;
                case 'complete':
                  setOptimizing(false);
                  break;
              }
            });

            // 连接SSE
            await sseClient.connect();
          } catch (error) {
            console.error('Failed to connect SSE:', error);
            throw error;
          }
        },

        disconnectSSE: () => {
          sseClient.disconnect();
        },

        // 认证相关
        login: async (email: string, password: string) => {
          try {
            const { user, tokens } = await authService.login({ email, password });
            
            set(state => ({
              user: {
                ...state.user,
                profile: {
                  id: user.id,
                  email: user.email,
                  preferences: state.user.preferences,
                  apiKeys: {},
                  usage: {
                    totalOptimizations: 0,
                    monthlyUsage: 0,
                    lastUsed: new Date(),
                  },
                  createdAt: new Date(),
                },
                isAuthenticated: true,
              },
            }));

            // 加载用户数据
            await get().loadAvailableModels();
            await get().loadHistory();
          } catch (error) {
            console.error('Login failed:', error);
            throw error;
          }
        },

        logout: () => {
          authService.logout();
          get().disconnectSSE();
          
          set(state => ({
            user: {
              ...state.user,
              profile: null,
              isAuthenticated: false,
            },
            prompts: {
              current: null,
              history: [],
              isOptimizing: false,
              optimizationProgress: null,
              optimizationResult: null,
            },
          }));
        },

        checkAuthStatus: async () => {
          try {
            if (authService.isAuthenticated()) {
              const user = authService.getUser();
              if (user) {
                // 获取完整的用户资料
                const profile = await usersService.getProfile();
                
                set(state => ({
                  user: {
                    ...state.user,
                    profile,
                    isAuthenticated: true,
                  },
                }));

                // 加载用户数据
                await get().loadAvailableModels();
                await get().loadHistory();
                
                // 预加载常用数据
                await get().preloadData();
              }
            }
          } catch (error) {
            console.error('Auth check failed:', error);
            get().logout();
          }
        },

        // 性能和缓存相关动作实现
        clearCache: (tags?: string[]) => {
          if (tags) {
            tags.forEach(tag => {
              cacheManager.clearByTag(tag, 'memory');
              cacheManager.clearByTag(tag, 'localStorage');
            });
          } else {
            cacheManager.clear('memory');
            cacheManager.clear('localStorage');
          }
        },

        preloadData: async () => {
          try {
            const { user } = get();
            if (!user.isAuthenticated) return;

            // 预加载用户统计信息
            promptsService.getUserStats().catch(() => {
              // 静默失败
            });

            // 预加载最近的提示词
            promptsService.getUserPrompts({
              page: 1,
              limit: 10,
              sortBy: 'updatedAt',
              sortOrder: 'desc'
            }).catch(() => {
              // 静默失败
            });

            // 预加载模型信息
            modelsService.getAvailableModels().catch(() => {
              // 静默失败
            });
          } catch (error) {
            console.debug('Preload failed:', error);
          }
        },

        getPerformanceReport: () => {
          return performanceMonitor.getPerformanceReport();
        },
      }),
      {
        name: 'ai-prompt-optimizer-store',
        partialize: state => ({
          user: {
            preferences: state.user.preferences,
            apiKeys: state.user.apiKeys,
          },
          ui: {
            theme: state.ui.theme,
            sidebarCollapsed: state.ui.sidebarCollapsed,
          },
        }),
      }
    ),
    {
      name: 'ai-prompt-optimizer',
    }
  )
);
