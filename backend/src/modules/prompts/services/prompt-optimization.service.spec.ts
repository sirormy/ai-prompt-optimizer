import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PromptOptimizationService } from './prompt-optimization.service';
import { PromptAnalysisService } from './prompt-analysis.service';
import { OptimizationRulesEngine } from './optimization-rules-engine.service';
import { BestPracticesService } from './best-practices.service';
import { ModelsService } from '../../models/models.service';
import { OptimizationRule } from '../../../schemas/optimization-rule.schema';
import { OptimizationRequest } from '../../models/dto';

describe('PromptOptimizationService', () => {
  let service: PromptOptimizationService;
  let modelsService: ModelsService;
  let analysisService: PromptAnalysisService;
  let rulesEngine: OptimizationRulesEngine;
  let bestPracticesService: BestPracticesService;

  const mockOptimizationRuleModel = {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
  };

  const mockModelsService = {
    isModelAvailable: jest.fn().mockReturnValue(true),
    getModelAdapter: jest.fn().mockReturnValue({
      getModelSpecificRules: jest.fn().mockReturnValue([]),
      optimize: jest.fn().mockResolvedValue({
        optimizedPrompt: 'Optimized prompt',
        improvements: [],
        appliedRules: [],
      }),
    }),
    estimateTokens: jest.fn().mockResolvedValue(100),
  };

  const mockAnalysisService = {
    analyzePrompt: jest.fn().mockResolvedValue({
      wordCount: 10,
      characterCount: 50,
      sentenceCount: 2,
      paragraphCount: 1,
      hasSystemPrompt: false,
      messageRole: 'user',
      structureScore: 0.7,
      clarityScore: 0.8,
      specificityScore: 0.6,
      completenessScore: 0.7,
      hasVagueInstructions: false,
      lacksContext: false,
      missingExamples: false,
      hasTooManyInstructions: false,
      hasConflictingInstructions: false,
      categories: ['general'],
      complexity: 'simple' as const,
      language: 'en',
      tone: 'neutral',
      suggestedImprovements: [],
      modelCompatibility: { 'openai-gpt4': 0.8 },
    }),
  };

  const mockRulesEngine = {
    applyRules: jest.fn().mockResolvedValue({
      optimizedText: 'Rules applied text',
      appliedRules: ['test-rule'],
      improvements: [],
      processingLog: [],
    }),
  };

  const mockBestPracticesService = {
    applyBestPractices: jest.fn().mockResolvedValue({
      optimizedText: 'Best practices applied text',
      appliedPractices: ['test-practice'],
      improvements: [],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptOptimizationService,
        {
          provide: getModelToken(OptimizationRule.name),
          useValue: mockOptimizationRuleModel,
        },
        {
          provide: ModelsService,
          useValue: mockModelsService,
        },
        {
          provide: PromptAnalysisService,
          useValue: mockAnalysisService,
        },
        {
          provide: OptimizationRulesEngine,
          useValue: mockRulesEngine,
        },
        {
          provide: BestPracticesService,
          useValue: mockBestPracticesService,
        },
      ],
    }).compile();

    service = module.get<PromptOptimizationService>(PromptOptimizationService);
    modelsService = module.get<ModelsService>(ModelsService);
    analysisService = module.get<PromptAnalysisService>(PromptAnalysisService);
    rulesEngine = module.get<OptimizationRulesEngine>(OptimizationRulesEngine);
    bestPracticesService = module.get<BestPracticesService>(BestPracticesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizePrompt', () => {
    const validRequest: OptimizationRequest = {
      prompt: 'Test prompt for optimization',
      targetModel: 'openai-gpt4',
      messageRole: 'user',
      optimizationLevel: 'basic',
      userId: 'test-user-id',
    };

    it('should successfully optimize a prompt', async () => {
      const result = await service.optimizePrompt(validRequest);

      expect(result).toBeDefined();
      expect(result.originalPrompt).toBe(validRequest.prompt);
      expect(result.optimizedPrompt).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.modelUsed).toBe(validRequest.targetModel);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.improvements)).toBe(true);
      expect(Array.isArray(result.appliedRules)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should call all required services', async () => {
      await service.optimizePrompt(validRequest);

      expect(mockAnalysisService.analyzePrompt).toHaveBeenCalledWith(
        validRequest.prompt,
        expect.objectContaining({
          targetModel: validRequest.targetModel,
          messageRole: validRequest.messageRole,
        }),
      );
      expect(mockRulesEngine.applyRules).toHaveBeenCalled();
      expect(mockBestPracticesService.applyBestPractices).toHaveBeenCalled();
      expect(mockModelsService.getModelAdapter).toHaveBeenCalledWith(validRequest.targetModel);
    });

    it('should validate input and throw error for empty prompt', async () => {
      const invalidRequest = { ...validRequest, prompt: '' };

      await expect(service.optimizePrompt(invalidRequest)).rejects.toThrow('Prompt cannot be empty');
    });

    it('should validate input and throw error for unavailable model', async () => {
      mockModelsService.isModelAvailable.mockReturnValueOnce(false);

      await expect(service.optimizePrompt(validRequest)).rejects.toThrow('is not available');
    });

    it('should validate input and throw error for invalid message role', async () => {
      const invalidRequest = { ...validRequest, messageRole: 'invalid' as any };

      await expect(service.optimizePrompt(invalidRequest)).rejects.toThrow('Invalid message role');
    });

    it('should validate input and throw error for invalid optimization level', async () => {
      const invalidRequest = { ...validRequest, optimizationLevel: 'invalid' as any };

      await expect(service.optimizePrompt(invalidRequest)).rejects.toThrow('Invalid optimization level');
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(60000);
      const longRequest = { ...validRequest, prompt: longPrompt };

      await expect(service.optimizePrompt(longRequest)).rejects.toThrow('Prompt is too long');
    });
  });

  describe('token estimation', () => {
    it('should handle token estimation failure gracefully', async () => {
      const validRequest: OptimizationRequest = {
        prompt: 'Test prompt',
        targetModel: 'openai-gpt4',
        messageRole: 'user',
        optimizationLevel: 'basic',
        userId: 'test-user-id',
      };

      mockModelsService.estimateTokens.mockRejectedValueOnce(new Error('Token estimation failed'));

      const result = await service.optimizePrompt(validRequest);

      expect(result.estimatedTokens).toBeDefined();
      expect(result.estimatedTokens.original).toBeGreaterThan(0);
      expect(result.estimatedTokens.optimized).toBeGreaterThan(0);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence within valid range', async () => {
      const validRequest: OptimizationRequest = {
        prompt: 'Test prompt for confidence calculation',
        targetModel: 'openai-gpt4',
        messageRole: 'user',
        optimizationLevel: 'expert',
        userId: 'test-user-id',
      };

      const result = await service.optimizePrompt(validRequest);

      expect(result.confidence).toBeGreaterThanOrEqual(0.1);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });
});