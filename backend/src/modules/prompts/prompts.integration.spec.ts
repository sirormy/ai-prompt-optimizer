import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { Prompt, PromptSchema } from '../../schemas/prompt.schema';
import { PromptOptimizationService } from './services/prompt-optimization.service';
import { CreatePromptDto, UpdatePromptDto, CreateVersionDto, PromptQueryDto, AIModel, MessageRole } from './dto';
import { OptimizationLevel } from './dto/optimization-request.dto';
import { Types } from 'mongoose';

describe('PromptsService Integration Tests', () => {
  let service: PromptsService;
  let controller: PromptsController;
  let module: TestingModule;

  const mockUserId = new Types.ObjectId().toString();

  // Mock PromptOptimizationService
  const mockPromptOptimizationService = {
    optimizePrompt: jest.fn().mockImplementation((request) => Promise.resolve({
      originalPrompt: request.prompt,
      optimizedPrompt: 'Optimized text',
      modelUsed: 'openai-gpt4',
      appliedRules: ['clarity', 'conciseness'],
      confidence: 0.85,
      improvements: [
        {
          type: 'clarity',
          description: 'Improved clarity',
          impact: 'high',
          suggestion: 'Use more specific language',
        },
      ],
    })),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test'),
        MongooseModule.forFeature([{ name: Prompt.name, schema: PromptSchema }]),
      ],
      controllers: [PromptsController],
      providers: [
        PromptsService,
        {
          provide: PromptOptimizationService,
          useValue: mockPromptOptimizationService,
        },
      ],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
    controller = module.get<PromptsController>(PromptsController);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('CRUD Operations', () => {
    let createdPromptId: string;

    it('should create a new prompt', async () => {
      const createPromptDto: CreatePromptDto & { userId: string } = {
        userId: mockUserId,
        title: 'Integration Test Prompt',
        originalText: 'Write a story about a robot',
        targetModel: AIModel.OPENAI_GPT4,
        messageRole: MessageRole.USER,
        description: 'Test prompt for integration testing',
        tags: ['test', 'integration'],
      };

      const result = await service.create(createPromptDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(createPromptDto.title);
      expect(result.originalText).toBe(createPromptDto.originalText);
      expect(result.targetModel.id).toBe(createPromptDto.targetModel);
      expect(result.versions).toHaveLength(1);
      expect(result.currentVersion).toBe(1);
      expect(result.tags).toEqual(createPromptDto.tags);

      createdPromptId = (result as any)._id.toString();
    });

    it('should find prompts by user ID with query filters', async () => {
      const queryDto: PromptQueryDto = {
        page: 1,
        limit: 10,
        search: 'Integration',
        tags: ['test'],
      };

      const result = await service.findByUserId(mockUserId, queryDto);

      expect(result).toBeDefined();
      expect(result.prompts).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);

      const foundPrompt = result.prompts.find(p => (p as any)._id.toString() === createdPromptId);
      expect(foundPrompt).toBeDefined();
    });

    it('should find a single prompt by ID', async () => {
      const result = await service.findOneByUserAndId(mockUserId, createdPromptId);

      expect(result).toBeDefined();
      expect((result as any)._id.toString()).toBe(createdPromptId);
      expect(result.title).toBe('Integration Test Prompt');
    });

    it('should update a prompt', async () => {
      const updatePromptDto: UpdatePromptDto = {
        title: 'Updated Integration Test Prompt',
        description: 'Updated description',
        isFavorite: true,
        tags: ['test', 'integration', 'updated'],
      };

      const result = await service.update(mockUserId, createdPromptId, updatePromptDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(updatePromptDto.title);
      expect(result.description).toBe(updatePromptDto.description);
      expect(result.isFavorite).toBe(true);
      expect(result.tags).toEqual(updatePromptDto.tags);
    });

    it('should create a new version', async () => {
      const createVersionDto: CreateVersionDto = {
        text: 'Write a detailed story about a helpful robot assistant',
        changeDescription: 'Made the prompt more specific and detailed',
      };

      const result = await service.createVersion(mockUserId, createdPromptId, createVersionDto);

      expect(result).toBeDefined();
      expect(result.currentVersion).toBe(2);
      expect(result.versions).toHaveLength(2);
      expect(result.optimizedText).toBe(createVersionDto.text);

      const newVersion = result.versions.find(v => v.version === 2);
      expect(newVersion).toBeDefined();
      expect(newVersion.text).toBe(createVersionDto.text);
      expect(newVersion.changeDescription).toBe(createVersionDto.changeDescription);
    });

    it('should get version history', async () => {
      const result = await service.getVersionHistory(mockUserId, createdPromptId);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2); // Should be sorted by version desc
      expect(result[1].version).toBe(1);
    });

    it('should compare versions', async () => {
      const result = await service.compareVersions(mockUserId, createdPromptId, 1, 2);

      expect(result).toBeDefined();
      expect(result.version1).toBeDefined();
      expect(result.version2).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.comparison.textLength).toBeDefined();
      expect(result.comparison.wordCount).toBeDefined();
      expect(result.version1.version).toBe(1);
      expect(result.version2.version).toBe(2);
    });

    it('should revert to a previous version', async () => {
      const result = await service.revertToVersion(mockUserId, createdPromptId, 1);

      expect(result).toBeDefined();
      expect(result.currentVersion).toBe(3); // New version created for revert
      expect(result.versions).toHaveLength(3);

      const revertVersion = result.versions.find(v => v.version === 3);
      expect(revertVersion).toBeDefined();
      expect(revertVersion.changeDescription).toContain('Reverted to version 1');
    });

    it('should get user statistics', async () => {
      const result = await service.getUserStats(mockUserId);

      expect(result).toBeDefined();
      expect(result.totalPrompts).toBeGreaterThan(0);
      expect(result.favoritePrompts).toBeGreaterThan(0); // We set one as favorite
      expect(result.modelProviders).toContain('openai');
      expect(result.totalVersions).toBeGreaterThan(0);
      expect(result.recentActivity).toBeInstanceOf(Array);
    });

    it('should delete a prompt', async () => {
      await service.remove(mockUserId, createdPromptId);

      // Verify it's deleted
      await expect(service.findOneByUserAndId(mockUserId, createdPromptId))
        .rejects.toThrow('not found');
    });
  });

  describe('Optimization Integration', () => {
    it('should optimize a prompt and save the result', async () => {
      const optimizationRequest = {
        userId: mockUserId,
        prompt: 'Write something',
        targetModel: AIModel.OPENAI_GPT4,
        messageRole: MessageRole.USER,
        optimizationLevel: OptimizationLevel.BASIC,
      };

      const result = await service.optimizePrompt(optimizationRequest);

      expect(result).toBeDefined();
      expect(result.originalPrompt).toBe(optimizationRequest.prompt);
      expect(result.optimizedPrompt).toBeDefined();
      expect(result.appliedRules).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockPromptOptimizationService.optimizePrompt).toHaveBeenCalled();

      // Verify that the optimization result was saved to database
      const queryResult = await service.findByUserId(mockUserId, { page: 1, limit: 10 });
      const savedPrompt = queryResult.prompts.find(p => 
        p.originalText === optimizationRequest.prompt &&
        p.tags.includes('ai-optimized')
      );
      expect(savedPrompt).toBeDefined();
    });
  });

  describe('Advanced Query Features', () => {
    beforeEach(async () => {
      // Create test data with different characteristics
      const testPrompts = [
        {
          userId: mockUserId,
          title: 'Favorite Prompt',
          originalText: 'Test favorite',
          targetModel: AIModel.OPENAI_GPT4,
          messageRole: MessageRole.USER,
          tags: ['favorite'],
          isFavorite: true,
        },
        {
          userId: mockUserId,
          title: 'Archived Prompt',
          originalText: 'Test archived',
          targetModel: AIModel.CLAUDE_3_SONNET,
          messageRole: MessageRole.USER,
          tags: ['archived'],
          isArchived: true,
        },
        {
          userId: mockUserId,
          title: 'Claude Prompt',
          originalText: 'Test claude',
          targetModel: AIModel.CLAUDE_3_SONNET,
          messageRole: MessageRole.USER,
          tags: ['claude'],
        },
      ];

      for (const prompt of testPrompts) {
        await service.create(prompt);
      }
    });

    it('should filter by favorite status', async () => {
      const result = await service.findByUserId(mockUserId, { 
        page: 1, 
        limit: 10, 
        isFavorite: true 
      });

      expect(result.prompts.every(p => p.isFavorite)).toBe(true);
    });

    it('should filter by model provider', async () => {
      const result = await service.findByUserId(mockUserId, { 
        page: 1, 
        limit: 10, 
        provider: 'anthropic' 
      });

      expect(result.prompts.every(p => p.targetModel.provider === 'anthropic')).toBe(true);
    });

    it('should search by text content', async () => {
      const result = await service.findByUserId(mockUserId, { 
        page: 1, 
        limit: 10, 
        search: 'claude' 
      });

      expect(result.prompts.length).toBeGreaterThan(0);
      expect(result.prompts.some(p => 
        p.title.toLowerCase().includes('claude') || 
        p.originalText.toLowerCase().includes('claude')
      )).toBe(true);
    });

    it('should filter by tags', async () => {
      const result = await service.findByUserId(mockUserId, { 
        page: 1, 
        limit: 10, 
        tags: ['claude'] 
      });

      expect(result.prompts.every(p => p.tags.includes('claude'))).toBe(true);
    });
  });
});