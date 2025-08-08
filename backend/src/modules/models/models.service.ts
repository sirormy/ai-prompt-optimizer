import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelAdapter, ModelConfig } from './interfaces/model-adapter.interface';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { DeepSeekAdapter } from './adapters/deepseek.adapter';
import { OptimizationRequest, OptimizationResult, ModelValidationRequest, ModelValidationResult } from './dto';

/**
 * 支持的模型信息
 */
export interface SupportedModel {
  id: string;
  name: string;
  provider: string;
  version: string;
  maxTokens: number;
  supportedRoles: string[];
  description: string;
  isActive: boolean;
  requiresApiKey: boolean;
}

/**
 * 模型管理服务
 * 负责管理所有AI模型适配器的创建、配置和验证
 */
@Injectable()
export class ModelsService {
  private readonly logger = new Logger(ModelsService.name);
  private readonly adapters = new Map<string, ModelAdapter>();
  private readonly supportedModels: SupportedModel[] = [
    {
      id: 'openai-gpt4',
      name: 'GPT-4',
      provider: 'openai',
      version: '4.0',
      maxTokens: 8192,
      supportedRoles: ['system', 'user', 'assistant'],
      description: 'OpenAI GPT-4 模型，适合复杂的文本生成和理解任务',
      isActive: true,
      requiresApiKey: true,
    },
    {
      id: 'anthropic-claude',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      version: '3.0',
      maxTokens: 200000,
      supportedRoles: ['user', 'assistant'],
      description: 'Anthropic Claude 3 Sonnet，擅长长文本处理和安全对话',
      isActive: true,
      requiresApiKey: true,
    },
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      version: '1.0',
      maxTokens: 32768,
      supportedRoles: ['system', 'user', 'assistant'],
      description: 'DeepSeek Chat模型，擅长代码生成和数学推理',
      isActive: true,
      requiresApiKey: true,
    },
  ];

  constructor(private configService: ConfigService) {
    this.initializeAdapters();
  }

  /**
   * 初始化模型适配器
   */
  private async initializeAdapters(): Promise<void> {
    try {
      // 初始化OpenAI适配器
      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (openaiApiKey) {
        const openaiConfig: ModelConfig = {
          apiKey: openaiApiKey,
          baseUrl: this.configService.get<string>('OPENAI_BASE_URL'),
          timeout: 30000,
          maxRetries: 3,
        };
        this.adapters.set('openai-gpt4', new OpenAIAdapter(openaiConfig));
        this.logger.log('OpenAI adapter initialized');
      }

      // 初始化Claude适配器
      const claudeApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
      if (claudeApiKey) {
        const claudeConfig: ModelConfig = {
          apiKey: claudeApiKey,
          baseUrl: this.configService.get<string>('ANTHROPIC_BASE_URL'),
          timeout: 30000,
          maxRetries: 3,
        };
        this.adapters.set('anthropic-claude', new ClaudeAdapter(claudeConfig));
        this.logger.log('Claude adapter initialized');
      }

      // 初始化DeepSeek适配器
      const deepseekApiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
      if (deepseekApiKey) {
        const deepseekConfig: ModelConfig = {
          apiKey: deepseekApiKey,
          baseUrl: this.configService.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1/chat/completions',
          timeout: 30000,
          maxRetries: 3,
        };
        this.adapters.set('deepseek-chat', new DeepSeekAdapter(deepseekConfig));
        this.logger.log('DeepSeek adapter initialized');
      }

      this.logger.log(`Initialized ${this.adapters.size} model adapters`);
    } catch (error) {
      this.logger.error('Failed to initialize model adapters:', error);
    }
  }

  /**
   * 获取所有支持的模型列表
   */
  getSupportedModels(): SupportedModel[] {
    return this.supportedModels.map(model => ({
      ...model,
      isActive: model.isActive && this.adapters.has(model.id),
    }));
  }

  /**
   * 获取特定模型的适配器
   */
  getModelAdapter(modelId: string): ModelAdapter {
    const adapter = this.adapters.get(modelId);
    if (!adapter) {
      throw new NotFoundException(`Model adapter not found: ${modelId}`);
    }
    return adapter;
  }

  /**
   * 检查模型是否可用
   */
  isModelAvailable(modelId: string): boolean {
    return this.adapters.has(modelId);
  }

  /**
   * 优化提示词
   */
  async optimizePrompt(request: OptimizationRequest): Promise<OptimizationResult> {
    if (!request.targetModel) {
      throw new BadRequestException('Target model is required');
    }

    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new BadRequestException('Prompt cannot be empty');
    }

    const adapter = this.getModelAdapter(request.targetModel);
    
    try {
      this.logger.log(`Starting optimization with ${request.targetModel} for user ${request.userId || 'anonymous'}`);
      const result = await adapter.optimize(request);
      this.logger.log(`Optimization completed successfully for ${request.targetModel}`);
      return result;
    } catch (error) {
      this.logger.error(`Optimization failed for ${request.targetModel}:`, error);
      throw new BadRequestException(`Optimization failed: ${error.message}`);
    }
  }

  /**
   * 验证提示词
   */
  async validatePrompt(modelId: string, prompt: string) {
    const adapter = this.getModelAdapter(modelId);
    return await adapter.validate(prompt);
  }

  /**
   * 估算token使用量
   */
  async estimateTokens(modelId: string, text: string): Promise<number> {
    const adapter = this.getModelAdapter(modelId);
    return await adapter.estimateTokens(text);
  }

  /**
   * 获取模型特定的优化规则
   */
  getOptimizationRules(modelId: string) {
    const adapter = this.getModelAdapter(modelId);
    return adapter.getModelSpecificRules();
  }

  /**
   * 验证模型配置
   */
  async validateModelConfig(request: ModelValidationRequest): Promise<ModelValidationResult> {
    try {
      const modelInfo = this.supportedModels.find(m => m.id === request.modelName);
      if (!modelInfo) {
        return {
          isValid: false,
          error: `Unsupported model: ${request.modelName}`,
        };
      }

      // 创建临时适配器进行验证
      const config: ModelConfig = {
        apiKey: request.apiKey,
        baseUrl: request.baseUrl,
        timeout: 10000,
        maxRetries: 1,
      };

      let adapter: ModelAdapter;
      switch (modelInfo.provider) {
        case 'openai':
          adapter = new OpenAIAdapter(config);
          break;
        case 'anthropic':
          adapter = new ClaudeAdapter(config);
          break;
        case 'deepseek':
          adapter = new DeepSeekAdapter(config);
          break;
        default:
          return {
            isValid: false,
            error: `Unsupported provider: ${modelInfo.provider}`,
          };
      }

      // 检查连接
      const isConnected = await adapter.checkConnection();
      if (!isConnected) {
        return {
          isValid: false,
          error: 'Failed to connect to the model API',
        };
      }

      return {
        isValid: true,
        modelInfo: {
          name: adapter.name,
          version: adapter.version,
          maxTokens: adapter.maxTokens,
          supportedFeatures: adapter.supportedRoles,
        },
      };

    } catch (error) {
      this.logger.error('Model validation failed:', error);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * 添加或更新模型适配器
   */
  async addModelAdapter(modelId: string, config: ModelConfig): Promise<void> {
    const modelInfo = this.supportedModels.find(m => m.id === modelId);
    if (!modelInfo) {
      throw new BadRequestException(`Unsupported model: ${modelId}`);
    }

    try {
      let adapter: ModelAdapter;
      switch (modelInfo.provider) {
        case 'openai':
          adapter = new OpenAIAdapter(config);
          break;
        case 'anthropic':
          adapter = new ClaudeAdapter(config);
          break;
        case 'deepseek':
          adapter = new DeepSeekAdapter(config);
          break;
        default:
          throw new BadRequestException(`Unsupported provider: ${modelInfo.provider}`);
      }

      // 验证连接
      const isConnected = await adapter.checkConnection();
      if (!isConnected) {
        throw new BadRequestException('Failed to connect to the model API');
      }

      this.adapters.set(modelId, adapter);
      this.logger.log(`Model adapter added/updated: ${modelId}`);
    } catch (error) {
      this.logger.error(`Failed to add model adapter ${modelId}:`, error);
      throw new BadRequestException(`Failed to add model adapter: ${error.message}`);
    }
  }

  /**
   * 移除模型适配器
   */
  removeModelAdapter(modelId: string): void {
    if (this.adapters.has(modelId)) {
      this.adapters.delete(modelId);
      this.logger.log(`Model adapter removed: ${modelId}`);
    }
  }

  /**
   * 检查所有模型的连接状态
   */
  async checkAllConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [modelId, adapter] of this.adapters.entries()) {
      try {
        results[modelId] = await adapter.checkConnection();
      } catch (error) {
        this.logger.error(`Connection check failed for ${modelId}:`, error);
        results[modelId] = false;
      }
    }

    return results;
  }

  /**
   * 获取模型统计信息
   */
  getModelStats() {
    return {
      totalSupported: this.supportedModels.length,
      totalActive: this.adapters.size,
      models: this.supportedModels.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        isActive: this.adapters.has(model.id),
      })),
    };
  }
}