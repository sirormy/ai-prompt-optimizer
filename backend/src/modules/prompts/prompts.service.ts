import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prompt, PromptDocument } from '../../schemas/prompt.schema';
import { 
  CreatePromptDto, 
  UpdatePromptDto, 
  CreateVersionDto, 
  PromptQueryDto,
  OptimizationRequestDto 
} from './dto';
import { PromptOptimizationService } from './services/prompt-optimization.service';
import { OptimizationRequest, OptimizationResult } from '../models/dto';
import { SSEService } from '../sse/sse.service';
import { RedisService } from '../redis/redis.service';
import { RAGService } from '../rag/rag.service';
import * as crypto from 'crypto';

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);

  constructor(
    @InjectModel(Prompt.name) private promptModel: Model<PromptDocument>,
    private promptOptimizationService: PromptOptimizationService,
    private redisService: RedisService,
    private ragService: RAGService,
  ) {}

  /**
   * 创建新的提示词
   */
  async create(createPromptDto: CreatePromptDto & { userId: string }): Promise<PromptDocument> {
    this.logger.log(`Creating new prompt for user: ${createPromptDto.userId}`);
    
    const promptData = {
      ...createPromptDto,
      userId: new Types.ObjectId(createPromptDto.userId),
      targetModel: {
        id: createPromptDto.targetModel,
        name: this.getModelName(createPromptDto.targetModel),
        provider: this.getModelProvider(createPromptDto.targetModel),
        version: '',
      },
      optimizedText: createPromptDto.optimizedText || createPromptDto.originalText,
      versions: [{
        version: 1,
        text: createPromptDto.originalText,
        createdAt: new Date(),
        changeDescription: 'Initial version',
      }],
      currentVersion: 1,
      tags: createPromptDto.tags || [],
      description: createPromptDto.description || '',
    };

    const createdPrompt = new this.promptModel(promptData);
    return createdPrompt.save();
  }

  async optimizePrompt(
    optimizationRequest: OptimizationRequestDto & { userId: string },
  ): Promise<OptimizationResult> {
    this.logger.log(`Starting prompt optimization for user: ${optimizationRequest.userId}`);
    
    // 生成缓存键
    const cacheKey = this.generateOptimizationCacheKey(optimizationRequest);
    
    // 尝试从缓存获取结果
    const cachedResult = await this.redisService.getCachedOptimizationResult(cacheKey);
    if (cachedResult) {
      this.logger.log(`Using cached optimization result for user: ${optimizationRequest.userId}`);
      return cachedResult;
    }
    
    // 转换DTO为内部请求格式
    const request: OptimizationRequest = {
      prompt: optimizationRequest.prompt,
      targetModel: this.mapTargetModel(optimizationRequest.targetModel),
      messageRole: optimizationRequest.messageRole,
      systemPrompt: optimizationRequest.systemPrompt,
      optimizationLevel: optimizationRequest.optimizationLevel || 'basic',
      userId: optimizationRequest.userId,
    };

    // 使用核心优化服务
    const result = await this.promptOptimizationService.optimizePrompt(request);

    // 缓存优化结果（1小时）
    await this.redisService.cacheOptimizationResult(cacheKey, result, 3600);

    // 保存优化结果到数据库
    await this.saveOptimizationResult(result, optimizationRequest.userId, optimizationRequest);

    return result;
  }

  /**
   * 使用RAG增强的提示词优化
   */
  async optimizePromptWithRAG(
    optimizationRequest: OptimizationRequestDto & { userId: string },
  ): Promise<OptimizationResult & { ragEnhancement?: any }> {
    this.logger.log(`Starting RAG-enhanced prompt optimization for user: ${optimizationRequest.userId}`);
    
    try {
      // 使用RAG服务获取增强建议
      const ragResponse = await this.ragService.enhancePromptWithRAG({
        prompt: optimizationRequest.prompt,
        targetModel: this.mapTargetModel(optimizationRequest.targetModel),
        includeExamples: optimizationRequest.optimizationLevel === 'expert',
      });

      // 使用RAG增强的提示词进行优化
      const enhancedRequest: OptimizationRequest = {
        prompt: ragResponse.enhancedPrompt,
        targetModel: this.mapTargetModel(optimizationRequest.targetModel),
        messageRole: optimizationRequest.messageRole,
        systemPrompt: optimizationRequest.systemPrompt,
        optimizationLevel: optimizationRequest.optimizationLevel || 'basic',
        userId: optimizationRequest.userId,
      };

      // 获取RAG优化建议
      const ragSuggestions = await this.ragService.generateOptimizationSuggestions({
        originalPrompt: optimizationRequest.prompt,
        targetModel: this.mapTargetModel(optimizationRequest.targetModel),
        userPreferences: {
          optimizationLevel: optimizationRequest.optimizationLevel || 'basic',
          includeExplanations: true,
        },
      });

      // 使用核心优化服务
      const result = await this.promptOptimizationService.optimizePrompt(enhancedRequest);

      // 合并RAG建议到结果中
      const enhancedResult = {
        ...result,
        ragEnhancement: {
          confidence: ragResponse.confidence,
          relevantPractices: ragResponse.relevantPractices,
          ragSuggestions: ragResponse.suggestions,
          improvements: ragSuggestions.improvements,
        },
        // 合并建议
        suggestions: [
          ...(result.suggestions || []),
          ...ragSuggestions.suggestions.map(suggestion => ({
            id: Math.random().toString(36).substr(2, 9),
            type: 'rag',
            title: 'RAG建议',
            description: suggestion,
            priority: 'medium' as const,
          })),
        ],
      };

      // 保存增强的优化结果
      await this.saveOptimizationResult(enhancedResult, optimizationRequest.userId, optimizationRequest);

      return enhancedResult;
    } catch (error) {
      this.logger.error('RAG-enhanced optimization failed, falling back to standard optimization:', error);
      // 如果RAG失败，回退到标准优化
      return this.optimizePrompt(optimizationRequest);
    }
  }

  /**
   * 使用SSE进行实时优化
   */
  async optimizePromptWithSSE(
    optimizationRequest: OptimizationRequestDto & { userId: string },
    sessionId: string,
    sseService: SSEService,
  ): Promise<void> {
    this.logger.log(`Starting SSE prompt optimization for user: ${optimizationRequest.userId}, session: ${sessionId}`);
    
    try {
      // 发送开始进度
      sseService.sendProgress(sessionId, {
        stage: 'analyzing',
        percentage: 10,
        message: 'Starting prompt analysis...',
        currentStep: 'Initializing optimization process',
      });

      // 转换DTO为内部请求格式
      const request: OptimizationRequest = {
        prompt: optimizationRequest.prompt,
        targetModel: this.mapTargetModel(optimizationRequest.targetModel),
        messageRole: optimizationRequest.messageRole,
        systemPrompt: optimizationRequest.systemPrompt,
        optimizationLevel: optimizationRequest.optimizationLevel || 'basic',
        userId: optimizationRequest.userId,
      };

      // 发送分析进度
      sseService.sendProgress(sessionId, {
        stage: 'analyzing',
        percentage: 25,
        message: 'Analyzing prompt structure and content...',
        currentStep: 'Parsing prompt components',
      });

      // 模拟分析延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // 发送优化进度
      sseService.sendProgress(sessionId, {
        stage: 'optimizing',
        percentage: 50,
        message: 'Applying optimization rules...',
        currentStep: 'Processing with AI model',
      });

      // 使用核心优化服务
      const result = await this.promptOptimizationService.optimizePrompt(request);

      // 发送验证进度
      sseService.sendProgress(sessionId, {
        stage: 'validating',
        percentage: 75,
        message: 'Validating optimization results...',
        currentStep: 'Quality assurance check',
      });

      // 模拟验证延迟
      await new Promise(resolve => setTimeout(resolve, 300));

      // 发送格式化进度
      sseService.sendProgress(sessionId, {
        stage: 'formatting',
        percentage: 90,
        message: 'Formatting results...',
        currentStep: 'Preparing final output',
      });

      // 保存优化结果到数据库
      await this.saveOptimizationResult(result, optimizationRequest.userId, optimizationRequest);

      // 发送完成进度
      sseService.sendProgress(sessionId, {
        stage: 'complete',
        percentage: 100,
        message: 'Optimization completed successfully!',
        currentStep: 'Finished',
      });

      // 发送最终结果
      sseService.sendResult(sessionId, {
        id: result.id,
        originalPrompt: result.originalPrompt,
        optimizedPrompt: result.optimizedPrompt,
        improvements: result.improvements.map(imp => ({
          type: imp.type,
          description: imp.description,
          impact: imp.impact as 'low' | 'medium' | 'high',
          before: imp.before,
          after: imp.after,
        })),
        confidence: result.confidence,
        appliedRules: result.appliedRules,
        suggestions: result.suggestions?.map(sug => ({
          id: sug.id || Math.random().toString(36).substr(2, 9),
          type: sug.type,
          title: sug.title,
          description: sug.description,
          priority: this.mapPriorityToString(sug.priority),
          applicable: true, // 默认为可应用
        })) || [],
        estimatedTokens: result.estimatedTokens ? {
          original: result.estimatedTokens.original,
          optimized: result.estimatedTokens.optimized,
          savings: result.estimatedTokens.saved, // 使用正确的属性名
          cost: result.estimatedTokens.cost,
        } : undefined,
      });

      // 发送完成事件
      sseService.sendComplete(sessionId, {
        message: 'Optimization process completed successfully',
        timestamp: new Date().toISOString(),
        resultId: result.id,
      });

    } catch (error) {
      this.logger.error(`SSE optimization failed for session ${sessionId}:`, error);
      
      // 发送错误事件
      sseService.sendError(sessionId, {
        code: 'OPTIMIZATION_FAILED',
        message: error.message || 'An unexpected error occurred during optimization',
        details: {
          error: error.toString(),
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
        recoverable: true,
      });
    }
  }

  /**
   * 映射优先级数字到字符串
   */
  private mapPriorityToString(priority: number): 'low' | 'medium' | 'high' {
    if (priority <= 3) return 'low';
    if (priority <= 7) return 'medium';
    return 'high';
  }

  /**
   * 映射目标模型
   */
  private mapTargetModel(targetModel: any): string {
    // 将DTO中的枚举值映射为模型ID
    const modelMapping: Record<string, string> = {
      'OPENAI_GPT4': 'openai-gpt4',
      'ANTHROPIC_CLAUDE': 'anthropic-claude',
      'DEEPSEEK_CHAT': 'deepseek-chat',
    };
    
    return modelMapping[targetModel] || 'openai-gpt4';
  }

  /**
   * 保存优化结果到数据库
   */
  private async saveOptimizationResult(
    result: OptimizationResult, 
    userId: string, 
    originalRequest?: OptimizationRequestDto
  ): Promise<void> {
    try {
      const promptData = {
        userId: new Types.ObjectId(userId),
        title: `Optimized Prompt - ${new Date().toLocaleDateString()}`,
        originalText: result.originalPrompt,
        optimizedText: result.optimizedPrompt,
        targetModel: {
          id: result.modelUsed,
          name: this.getModelName(result.modelUsed),
          provider: this.getModelProvider(result.modelUsed),
          version: '',
        },
        messageRole: originalRequest?.messageRole || 'user',
        systemPrompt: originalRequest?.systemPrompt || '',
        optimizationMetadata: {
          appliedRules: result.appliedRules,
          confidence: result.confidence,
          improvements: result.improvements.map(imp => ({
            type: imp.type,
            description: imp.description,
            impact: imp.impact,
            suggestion: imp.suggestion || '',
          })),
          optimizedAt: new Date(),
          optimizationLevel: originalRequest?.optimizationLevel || 'basic',
        },
        versions: [{
          version: 1,
          text: result.originalPrompt,
          createdAt: new Date(),
          changeDescription: 'Original version',
        }, {
          version: 2,
          text: result.optimizedPrompt,
          createdAt: new Date(),
          changeDescription: 'AI optimized version',
        }],
        currentVersion: 2,
        tags: ['ai-optimized'],
        description: 'Auto-generated from optimization request',
      };

      await this.promptModel.create(promptData);
      this.logger.log(`Saved optimization result for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to save optimization result: ${error.message}`);
      // 不抛出错误，避免影响优化流程
    }
  }

  private getModelName(modelId: string): string {
    const names: Record<string, string> = {
      'openai-gpt4': 'GPT-4',
      'anthropic-claude': 'Claude 3 Sonnet',
      'deepseek-chat': 'DeepSeek Chat',
    };
    return names[modelId] || modelId;
  }

  private getModelProvider(modelId: string): string {
    if (modelId.includes('openai')) return 'openai';
    if (modelId.includes('anthropic') || modelId.includes('claude')) return 'anthropic';
    if (modelId.includes('deepseek')) return 'deepseek';
    return 'unknown';
  }

  /**
   * 根据查询条件获取用户的提示词列表
   */
  async findByUserId(
    userId: string,
    queryDto: PromptQueryDto,
  ): Promise<{ prompts: Prompt[]; total: number; page: number; limit: number }> {
    this.logger.log(`Fetching prompts for user: ${userId} with query:`, queryDto);
    
    // 尝试从缓存获取结果
    const cachedResult = await this.redisService.getCachedPromptHistory(userId, queryDto);
    if (cachedResult) {
      this.logger.log(`Using cached prompt history for user: ${userId}`);
      return cachedResult;
    }
    
    const { page = 1, limit = 10, search, tags, provider, isFavorite, isArchived, sortBy, sortOrder } = queryDto;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query: any = { userId: new Types.ObjectId(userId) };

    // 搜索条件
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { originalText: { $regex: search, $options: 'i' } },
        { optimizedText: { $regex: search, $options: 'i' } },
      ];
    }

    // 标签过滤
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    // 模型提供商过滤
    if (provider) {
      query['targetModel.provider'] = provider;
    }

    // 收藏过滤
    if (typeof isFavorite === 'boolean') {
      query.isFavorite = isFavorite;
    }

    // 归档过滤
    if (typeof isArchived === 'boolean') {
      query.isArchived = isArchived;
    } else {
      // 默认不显示归档的
      query.isArchived = { $ne: true };
    }

    // 排序条件
    const sortCondition: any = {};
    if (sortBy && sortOrder) {
      sortCondition[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortCondition.createdAt = -1; // 默认按创建时间倒序
    }

    const [prompts, total] = await Promise.all([
      this.promptModel
        .find(query)
        .sort(sortCondition)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.promptModel.countDocuments(query),
    ]);

    const result = {
      prompts,
      total,
      page,
      limit,
    };

    // 缓存结果（10分钟）
    await this.redisService.cachePromptHistory(userId, queryDto, result, 600);

    return result;
  }

  /**
   * 根据ID获取单个提示词（包含查看统计）
   */
  async findOneByUserAndId(userId: string, id: string): Promise<Prompt> {
    this.logger.log(`Fetching prompt ${id} for user: ${userId}`);
    
    // 尝试从缓存获取
    const cacheKey = `prompt:${userId}:${id}`;
    const cachedPrompt = await this.redisService.get(cacheKey);
    
    if (cachedPrompt) {
      this.logger.log(`Using cached prompt ${id} for user: ${userId}`);
      const prompt = JSON.parse(cachedPrompt);
      
      // 异步更新查看统计（不阻塞响应）
      this.updateViewCount(id).catch(error => 
        this.logger.error(`Failed to update view count for prompt ${id}:`, error)
      );
      
      return prompt;
    }
    
    const prompt = await this.promptModel.findOne({ 
      _id: id, 
      userId: new Types.ObjectId(userId) 
    }).exec();
    
    if (!prompt) {
      throw new NotFoundException(`Prompt with ID ${id} not found`);
    }

    // 缓存提示词（30分钟）
    await this.redisService.set(cacheKey, JSON.stringify(prompt), 1800);

    // 更新查看统计
    await this.updateViewCount(id);

    return prompt;
  }

  private async updateViewCount(id: string): Promise<void> {
    await this.promptModel.updateOne(
      { _id: id },
      { 
        $inc: { viewCount: 1 },
        $set: { lastViewedAt: new Date() }
      }
    );
  }

  /**
   * 更新提示词
   */
  async update(userId: string, id: string, updatePromptDto: UpdatePromptDto): Promise<Prompt> {
    this.logger.log(`Updating prompt ${id} for user: ${userId}`);

    const prompt = await this.findOneByUserAndId(userId, id);
    
    const updateData: any = { ...updatePromptDto };

    // 如果更新了目标模型，需要更新模型信息
    if (updatePromptDto.targetModel) {
      updateData.targetModel = {
        id: updatePromptDto.targetModel,
        name: this.getModelName(updatePromptDto.targetModel),
        provider: this.getModelProvider(updatePromptDto.targetModel),
        version: '',
      };
    }

    const updatedPrompt = await this.promptModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: updateData },
      { new: true }
    ).exec();

    if (!updatedPrompt) {
      throw new NotFoundException(`Prompt with ID ${id} not found`);
    }

    // 失效相关缓存
    await this.invalidatePromptCaches(userId, id);

    return updatedPrompt;
  }

  /**
   * 删除提示词
   */
  async remove(userId: string, id: string): Promise<void> {
    this.logger.log(`Deleting prompt ${id} for user: ${userId}`);

    const result = await this.promptModel.deleteOne({ 
      _id: id, 
      userId: new Types.ObjectId(userId) 
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Prompt with ID ${id} not found`);
    }
  }

  /**
   * 批量删除提示词
   */
  async removeBatch(userId: string, ids: string[]): Promise<{ deletedCount: number }> {
    this.logger.log(`Batch deleting prompts for user: ${userId}, ids: ${ids.join(', ')}`);

    const result = await this.promptModel.deleteMany({ 
      _id: { $in: ids.map(id => new Types.ObjectId(id)) }, 
      userId: new Types.ObjectId(userId) 
    }).exec();

    return { deletedCount: result.deletedCount };
  }

  /**
   * 创建新版本
   */
  async createVersion(userId: string, id: string, createVersionDto: CreateVersionDto): Promise<Prompt> {
    this.logger.log(`Creating new version for prompt ${id}, user: ${userId}`);

    const prompt = await this.findOneByUserAndId(userId, id);
    
    const newVersion = prompt.currentVersion + 1;
    const versionData = {
      version: newVersion,
      text: createVersionDto.text,
      createdAt: new Date(),
      changeDescription: createVersionDto.changeDescription || `Version ${newVersion}`,
    };

    const updatedPrompt = await this.promptModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { 
        $push: { versions: versionData },
        $set: { 
          currentVersion: newVersion,
          optimizedText: createVersionDto.text 
        }
      },
      { new: true }
    ).exec();

    if (!updatedPrompt) {
      throw new NotFoundException(`Prompt with ID ${id} not found`);
    }

    return updatedPrompt;
  }

  /**
   * 获取版本历史
   */
  async getVersionHistory(userId: string, id: string): Promise<any[]> {
    this.logger.log(`Getting version history for prompt ${id}, user: ${userId}`);

    const prompt = await this.findOneByUserAndId(userId, id);
    return prompt.versions.sort((a, b) => b.version - a.version);
  }

  /**
   * 比较两个版本
   */
  async compareVersions(userId: string, id: string, version1: number, version2: number): Promise<any> {
    this.logger.log(`Comparing versions ${version1} and ${version2} for prompt ${id}, user: ${userId}`);

    const prompt = await this.findOneByUserAndId(userId, id);
    
    const v1 = prompt.versions.find(v => v.version === version1);
    const v2 = prompt.versions.find(v => v.version === version2);

    if (!v1 || !v2) {
      throw new BadRequestException('One or both versions not found');
    }

    return {
      version1: v1,
      version2: v2,
      comparison: {
        textLength: {
          v1: v1.text.length,
          v2: v2.text.length,
          difference: v2.text.length - v1.text.length,
        },
        wordCount: {
          v1: v1.text.split(/\s+/).length,
          v2: v2.text.split(/\s+/).length,
          difference: v2.text.split(/\s+/).length - v1.text.split(/\s+/).length,
        },
      },
    };
  }

  /**
   * 恢复到指定版本
   */
  async revertToVersion(userId: string, id: string, version: number): Promise<Prompt> {
    this.logger.log(`Reverting prompt ${id} to version ${version}, user: ${userId}`);

    const prompt = await this.findOneByUserAndId(userId, id);
    
    const targetVersion = prompt.versions.find(v => v.version === version);
    if (!targetVersion) {
      throw new BadRequestException(`Version ${version} not found`);
    }

    // 创建新版本作为恢复版本
    const newVersion = prompt.currentVersion + 1;
    const revertVersionData = {
      version: newVersion,
      text: targetVersion.text,
      createdAt: new Date(),
      changeDescription: `Reverted to version ${version}`,
    };

    const updatedPrompt = await this.promptModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { 
        $push: { versions: revertVersionData },
        $set: { 
          currentVersion: newVersion,
          optimizedText: targetVersion.text 
        }
      },
      { new: true }
    ).exec();

    if (!updatedPrompt) {
      throw new NotFoundException(`Prompt with ID ${id} not found`);
    }

    return updatedPrompt;
  }

  /**
   * 获取用户的统计信息
   */
  async getUserStats(userId: string): Promise<any> {
    this.logger.log(`Getting stats for user: ${userId}`);

    // 尝试从缓存获取统计信息
    const cachedStats = await this.redisService.getUserData(userId, 'stats');
    if (cachedStats) {
      this.logger.log(`Using cached stats for user: ${userId}`);
      return cachedStats;
    }

    const stats = await this.promptModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalPrompts: { $sum: 1 },
          favoritePrompts: { $sum: { $cond: ['$isFavorite', 1, 0] } },
          archivedPrompts: { $sum: { $cond: ['$isArchived', 1, 0] } },
          totalViews: { $sum: '$viewCount' },
          modelProviders: { $addToSet: '$targetModel.provider' },
          totalVersions: { $sum: { $size: '$versions' } },
        }
      }
    ]);

    const recentActivity = await this.promptModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title updatedAt')
      .exec();

    const result = {
      ...(stats[0] || {
        totalPrompts: 0,
        favoritePrompts: 0,
        archivedPrompts: 0,
        totalViews: 0,
        modelProviders: [],
        totalVersions: 0,
      }),
      recentActivity,
    };

    // 缓存统计信息（15分钟）
    await this.redisService.cacheUserData(userId, 'stats', result, 900);

    return result;
  }

  /**
   * 生成优化缓存键
   */
  private generateOptimizationCacheKey(request: OptimizationRequestDto & { userId: string }): string {
    const keyData = {
      prompt: request.prompt,
      targetModel: request.targetModel,
      messageRole: request.messageRole,
      systemPrompt: request.systemPrompt,
      optimizationLevel: request.optimizationLevel,
    };
    
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
    
    return `optimization:${hash}`;
  }

  /**
   * 失效提示词相关缓存
   */
  private async invalidatePromptCaches(userId: string, promptId?: string): Promise<void> {
    try {
      // 失效用户相关的缓存
      await this.redisService.invalidateByTag(`user:${userId}`);
      
      if (promptId) {
        // 失效特定提示词缓存
        const promptCacheKey = `prompt:${userId}:${promptId}`;
        await this.redisService.del(promptCacheKey);
      }
      
      this.logger.log(`Invalidated caches for user: ${userId}, prompt: ${promptId || 'all'}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate caches for user ${userId}:`, error);
    }
  }
}