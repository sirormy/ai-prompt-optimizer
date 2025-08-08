import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OptimizationRule, OptimizationRuleDocument } from '../../../schemas/optimization-rule.schema';
import { ModelsService } from '../../models/models.service';
import { OptimizationRequest, OptimizationResult, Improvement, Suggestion, TokenEstimate } from '../../models/dto';
import { PromptAnalysisService } from './prompt-analysis.service';
import { OptimizationRulesEngine } from './optimization-rules-engine.service';
import { BestPracticesService } from './best-practices.service';

/**
 * 提示词优化核心服务
 * 负责协调整个优化流程，包括分析、规则应用、模型特定优化等
 */
@Injectable()
export class PromptOptimizationService {
  private readonly logger = new Logger(PromptOptimizationService.name);

  constructor(
    @InjectModel(OptimizationRule.name)
    private optimizationRuleModel: Model<OptimizationRuleDocument>,
    private modelsService: ModelsService,
    private promptAnalysisService: PromptAnalysisService,
    private optimizationRulesEngine: OptimizationRulesEngine,
    private bestPracticesService: BestPracticesService,
  ) {}

  /**
   * 优化提示词的主要入口方法
   */
  async optimizePrompt(request: OptimizationRequest): Promise<OptimizationResult> {
    const startTime = Date.now();
    this.logger.log(`Starting prompt optimization for model: ${request.targetModel}`);

    try {
      // 1. 验证输入
      this.validateOptimizationRequest(request);

      // 2. 分析原始提示词
      const analysis = await this.promptAnalysisService.analyzePrompt(request.prompt, {
        targetModel: request.targetModel,
        messageRole: request.messageRole,
        systemPrompt: request.systemPrompt,
      });

      // 3. 获取适用的优化规则
      const applicableRules = await this.getApplicableRules(
        request.targetModel,
        request.optimizationLevel,
        analysis.categories,
      );

      // 4. 应用优化规则
      const ruleOptimizationResult = await this.optimizationRulesEngine.applyRules(
        request.prompt,
        applicableRules,
        analysis,
      );

      // 5. 应用最佳实践
      const bestPracticesResult = await this.bestPracticesService.applyBestPractices(
        ruleOptimizationResult.optimizedText,
        request.targetModel,
        request.messageRole,
        analysis,
      );

      // 6. 模型特定优化
      const modelSpecificResult = await this.applyModelSpecificOptimizations(
        bestPracticesResult.optimizedText,
        request,
        analysis,
      );

      // 7. 生成建议
      const suggestions = await this.generateSuggestions(
        request.prompt,
        modelSpecificResult.optimizedText,
        analysis,
        request.targetModel,
      );

      // 8. 估算token使用量
      const tokenEstimate = await this.estimateTokenUsage(
        request.prompt,
        modelSpecificResult.optimizedText,
        request.targetModel,
      );

      // 9. 计算置信度
      const confidence = this.calculateConfidence(
        analysis,
        ruleOptimizationResult.appliedRules,
        bestPracticesResult.appliedPractices,
        modelSpecificResult.improvements,
      );

      // 10. 合并所有改进项
      const allImprovements = [
        ...ruleOptimizationResult.improvements,
        ...bestPracticesResult.improvements,
        ...modelSpecificResult.improvements,
      ];

      const processingTime = Date.now() - startTime;

      const result: OptimizationResult = {
        id: this.generateOptimizationId(),
        originalPrompt: request.prompt,
        optimizedPrompt: modelSpecificResult.optimizedText,
        improvements: allImprovements,
        confidence,
        appliedRules: [
          ...ruleOptimizationResult.appliedRules,
          ...bestPracticesResult.appliedPractices,
          ...modelSpecificResult.appliedRules,
        ],
        suggestions,
        estimatedTokens: tokenEstimate,
        processingTime,
        modelUsed: request.targetModel,
      };

      this.logger.log(`Optimization completed in ${processingTime}ms with confidence: ${confidence}`);
      return result;

    } catch (error) {
      this.logger.error('Optimization failed:', error);
      throw new BadRequestException(`Optimization failed: ${error.message}`);
    }
  }

  /**
   * 验证优化请求
   */
  private validateOptimizationRequest(request: OptimizationRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new BadRequestException('Prompt cannot be empty');
    }

    if (request.prompt.length > 50000) {
      throw new BadRequestException('Prompt is too long (max 50,000 characters)');
    }

    if (!request.targetModel) {
      throw new BadRequestException('Target model is required');
    }

    if (!this.modelsService.isModelAvailable(request.targetModel)) {
      throw new BadRequestException(`Model ${request.targetModel} is not available`);
    }

    const validRoles = ['system', 'user', 'assistant'];
    if (!validRoles.includes(request.messageRole)) {
      throw new BadRequestException(`Invalid message role: ${request.messageRole}`);
    }

    const validLevels = ['basic', 'advanced', 'expert'];
    if (!validLevels.includes(request.optimizationLevel)) {
      throw new BadRequestException(`Invalid optimization level: ${request.optimizationLevel}`);
    }
  }

  /**
   * 获取适用的优化规则
   */
  private async getApplicableRules(
    targetModel: string,
    optimizationLevel: string,
    categories: string[],
  ): Promise<OptimizationRule[]> {
    const query: any = {
      isActive: true,
      $or: [
        { applicableModels: { $in: [targetModel] } },
        { applicableModels: { $size: 0 } }, // 通用规则
      ],
    };

    // 根据优化级别过滤规则
    switch (optimizationLevel) {
      case 'basic':
        query.priority = { $lte: 5 };
        break;
      case 'advanced':
        query.priority = { $lte: 8 };
        break;
      case 'expert':
        // 包含所有规则
        break;
    }

    // 根据分析出的类别过滤规则
    if (categories.length > 0) {
      query.category = { $in: categories };
    }

    const rules = await this.optimizationRuleModel
      .find(query)
      .sort({ priority: -1 })
      .exec();

    this.logger.log(`Found ${rules.length} applicable rules for ${targetModel}`);
    return rules;
  }

  /**
   * 应用模型特定的优化
   */
  private async applyModelSpecificOptimizations(
    text: string,
    request: OptimizationRequest,
    analysis: any,
  ): Promise<{
    optimizedText: string;
    improvements: Improvement[];
    appliedRules: string[];
  }> {
    try {
      // 获取模型适配器
      const adapter = this.modelsService.getModelAdapter(request.targetModel);
      
      // 获取模型特定规则
      const modelRules = adapter.getModelSpecificRules();
      
      // 应用模型特定优化
      const result = await adapter.optimize({
        ...request,
        prompt: text,
      });

      return {
        optimizedText: result.optimizedPrompt,
        improvements: result.improvements,
        appliedRules: result.appliedRules,
      };
    } catch (error) {
      this.logger.warn(`Model-specific optimization failed: ${error.message}`);
      return {
        optimizedText: text,
        improvements: [],
        appliedRules: [],
      };
    }
  }

  /**
   * 生成优化建议
   */
  private async generateSuggestions(
    originalPrompt: string,
    optimizedPrompt: string,
    analysis: any,
    targetModel: string,
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // 基于分析结果生成建议
    if (analysis.hasVagueInstructions) {
      suggestions.push({
        id: 'clarity-improvement',
        type: 'clarity',
        title: '提高指令清晰度',
        description: '您的提示词包含一些模糊的指令，建议使用更具体和明确的语言',
        priority: 8,
        category: 'clarity',
        example: '将"写得好一些"改为"使用正式的商务语调，包含具体的数据支持"',
      });
    }

    if (analysis.lacksContext) {
      suggestions.push({
        id: 'context-enhancement',
        type: 'context',
        title: '增加上下文信息',
        description: '添加更多背景信息可以帮助AI更好地理解您的需求',
        priority: 7,
        category: 'context',
        example: '说明目标受众、使用场景或期望的输出格式',
      });
    }

    if (analysis.missingExamples && originalPrompt.length > 100) {
      suggestions.push({
        id: 'examples-addition',
        type: 'examples',
        title: '添加示例',
        description: '提供具体示例可以显著提高AI输出的质量和一致性',
        priority: 6,
        category: 'examples',
        example: '在指令后添加"例如："或"示例输出："',
      });
    }

    // 模型特定建议
    const modelSuggestions = await this.getModelSpecificSuggestions(targetModel, analysis);
    suggestions.push(...modelSuggestions);

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取模型特定建议
   */
  private async getModelSpecificSuggestions(
    targetModel: string,
    analysis: any,
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    if (targetModel.includes('openai')) {
      if (analysis.wordCount > 1000) {
        suggestions.push({
          id: 'openai-length-warning',
          type: 'optimization',
          title: 'OpenAI模型长度优化',
          description: 'OpenAI模型在处理较长提示词时可能会截断，建议精简内容',
          priority: 5,
          category: 'model-specific',
        });
      }
    }

    if (targetModel.includes('claude')) {
      if (!analysis.hasSystemPrompt && analysis.messageRole === 'user') {
        suggestions.push({
          id: 'claude-system-prompt',
          type: 'structure',
          title: 'Claude系统提示词建议',
          description: 'Claude模型在使用系统提示词时表现更佳，建议设置系统角色',
          priority: 6,
          category: 'model-specific',
        });
      }
    }

    return suggestions;
  }

  /**
   * 估算token使用量
   */
  private async estimateTokenUsage(
    originalPrompt: string,
    optimizedPrompt: string,
    targetModel: string,
  ): Promise<TokenEstimate> {
    try {
      const originalTokens = await this.modelsService.estimateTokens(targetModel, originalPrompt);
      const optimizedTokens = await this.modelsService.estimateTokens(targetModel, optimizedPrompt);
      const saved = originalTokens - optimizedTokens;

      return {
        original: originalTokens,
        optimized: optimizedTokens,
        saved,
        cost: this.calculateCostEstimate(originalTokens, optimizedTokens, targetModel),
      };
    } catch (error) {
      this.logger.warn(`Token estimation failed: ${error.message}`);
      // 使用简单的字符数估算作为后备
      const originalTokens = Math.ceil(originalPrompt.length / 4);
      const optimizedTokens = Math.ceil(optimizedPrompt.length / 4);
      
      return {
        original: originalTokens,
        optimized: optimizedTokens,
        saved: originalTokens - optimizedTokens,
      };
    }
  }

  /**
   * 计算成本估算
   */
  private calculateCostEstimate(
    originalTokens: number,
    optimizedTokens: number,
    targetModel: string,
  ): { original: number; optimized: number; currency: string } | undefined {
    // 简化的成本计算，实际应用中应该从配置中获取价格
    const pricePerToken = this.getModelPricePerToken(targetModel);
    if (!pricePerToken) return undefined;

    return {
      original: originalTokens * pricePerToken,
      optimized: optimizedTokens * pricePerToken,
      currency: 'USD',
    };
  }

  /**
   * 获取模型每token价格
   */
  private getModelPricePerToken(targetModel: string): number | null {
    const prices: Record<string, number> = {
      'openai-gpt4': 0.00003, // $0.03 per 1K tokens
      'anthropic-claude': 0.000015, // $0.015 per 1K tokens
      'deepseek-chat': 0.000001, // $0.001 per 1K tokens
    };

    return prices[targetModel] || null;
  }

  /**
   * 计算优化置信度
   */
  private calculateConfidence(
    analysis: any,
    appliedRules: string[],
    appliedPractices: string[],
    improvements: Improvement[],
  ): number {
    let confidence = 0.5; // 基础置信度

    // 基于应用的规则数量
    confidence += Math.min(appliedRules.length * 0.05, 0.2);

    // 基于应用的最佳实践数量
    confidence += Math.min(appliedPractices.length * 0.03, 0.15);

    // 基于改进项的影响程度
    const highImpactImprovements = improvements.filter(imp => imp.impact === 'high').length;
    const mediumImpactImprovements = improvements.filter(imp => imp.impact === 'medium').length;
    
    confidence += highImpactImprovements * 0.1;
    confidence += mediumImpactImprovements * 0.05;

    // 基于分析质量
    if (analysis.structureScore > 0.8) confidence += 0.1;
    if (analysis.clarityScore > 0.8) confidence += 0.1;

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * 生成优化ID
   */
  private generateOptimizationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}