import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { Prompt, PromptDocument } from '../../schemas/prompt.schema';
import { PromptOptimizationService } from './services/prompt-optimization.service';
import { CreatePromptDto, UpdatePromptDto, CreateVersionDto, PromptQueryDto, AIModel, MessageRole } from './dto';

describe('PromptsService', () => {
  let service: PromptsService;
  let promptModel: Model<PromptDocument>;
  let promptOptimizationService: PromptOptimizationService;

  const mockUserId = new Types.ObjectId().toString();
  const mockPromptId = new Types.ObjectId().toString();

  const mockPrompt = {
    _id: mockPromptId,
    userId: new Types.ObjectId(mockUserId),
    title: 'Test Prompt',
    originalText: 'Original prompt text',
    optimizedText: 'Optimized prompt text',
    targetModel: {
      id: 'openai-gpt4',
      name: 'GPT-4',
      provider: 'openai',
      version: '',
    },
    messageRole: 'user',
    systemPrompt: '',
    optimizationMetadata: {
      appliedRules: ['rule1', 'rule2'],
      confidence: 0.85,
      improvements: [],
      optimizedAt: new Date(),
      optimizationLevel: 'basic',
    },
    versions: [
      {
        version: 1,
        text: 'Original prompt text',
        createdAt: new Date(),
        changeDescription: 'Initial version',
      },
    ],
    currentVersion: 1,
    tags: ['test'],
    isArchived: false,
    isFavorite: false,
    description: 'Test description',
    viewCount: 0,
    save: jest.fn().mockResolvedValue(this),
  };

  const mockPromptModel = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...mockPrompt, ...data }),
  })) as any;
  
  // Add static methods to the mock constructor
  mockPromptModel.find = jest.fn();
  mockPromptModel.findOne = jest.fn();
  mockPromptModel.findOneAndUpdate = jest.fn();
  mockPromptModel.updateOne = jest.fn();
  mockPromptModel.deleteOne = jest.fn();
  mockPromptModel.deleteMany = jest.fn();
  mockPromptModel.countDocuments = jest.fn();
  mockPromptModel.create = jest.fn();
  mockPromptModel.aggregate = jest.fn();
  mockPromptModel.exec = jest.fn();

  const mockPromptOptimizationService = {
    optimizePrompt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptsService,
        {
          provide: getModelToken(Prompt.name),
          useValue: mockPromptModel,
        },
        {
          provide: PromptOptimizationService,
          useValue: mockPromptOptimizationService,
        },
      ],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
    promptModel = module.get<Model<PromptDocument>>(getModelToken(Prompt.name));
    promptOptimizationService = module.get<PromptOptimizationService>(PromptOptimizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new prompt successfully', async () => {
      const createPromptDto: CreatePromptDto & { userId: string } = {
        userId: mockUserId,
        title: 'Test Prompt',
        originalText: 'Original prompt text',
        targetModel: AIModel.OPENAI_GPT4,
        messageRole: MessageRole.USER,
        tags: ['test'],
        description: 'Test description',
      };

      const result = await service.create(createPromptDto);

      expect(mockPromptModel).toHaveBeenCalledWith(expect.objectContaining({
        userId: new Types.ObjectId(mockUserId),
        title: createPromptDto.title,
        originalText: createPromptDto.originalText,
        targetModel: expect.objectContaining({
          id: createPromptDto.targetModel,
          name: 'GPT-4',
          provider: 'openai',
        }),
      }));
      // The save method is called internally by the mock implementation
      expect(result.title).toBe(createPromptDto.title);
      expect(result.originalText).toBe(createPromptDto.originalText);
      expect(result.userId).toBeDefined();
      expect(result.targetModel.id).toBe(createPromptDto.targetModel);
      expect(result.tags).toEqual(createPromptDto.tags);
      expect(result.description).toBe(createPromptDto.description);
    });
  });

  describe('findByUserId', () => {
    it('should return paginated prompts for user', async () => {
      const queryDto: PromptQueryDto = {
        page: 1,
        limit: 10,
        search: 'test',
        tags: ['test'],
      };

      const mockPrompts = [mockPrompt];
      const mockTotal = 1;

      mockPromptModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockPrompts),
            }),
          }),
        }),
      });
      mockPromptModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.findByUserId(mockUserId, queryDto);

      expect(result).toEqual({
        prompts: mockPrompts,
        total: mockTotal,
        page: 1,
        limit: 10,
      });
      expect(mockPromptModel.find).toHaveBeenCalledWith(expect.objectContaining({
        userId: new Types.ObjectId(mockUserId),
        $or: expect.any(Array),
        tags: { $in: ['test'] },
      }));
    });
  });

  describe('findOneByUserAndId', () => {
    it('should return a prompt and update view statistics', async () => {
      mockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPrompt),
      });
      mockPromptModel.updateOne.mockResolvedValue({ acknowledged: true });

      const result = await service.findOneByUserAndId(mockUserId, mockPromptId);

      expect(result).toEqual(mockPrompt);
      expect(mockPromptModel.findOne).toHaveBeenCalledWith({
        _id: mockPromptId,
        userId: new Types.ObjectId(mockUserId),
      });
      expect(mockPromptModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPromptId },
        {
          $inc: { viewCount: 1 },
          $set: { lastViewedAt: expect.any(Date) },
        }
      );
    });

    it('should throw NotFoundException when prompt not found', async () => {
      mockPromptModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOneByUserAndId(mockUserId, mockPromptId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a prompt successfully', async () => {
      const updatePromptDto: UpdatePromptDto = {
        title: 'Updated Title',
        description: 'Updated description',
        isFavorite: true,
      };

      // Mock findOneByUserAndId
      jest.spyOn(service, 'findOneByUserAndId').mockResolvedValue(mockPrompt as any);

      mockPromptModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockPrompt, ...updatePromptDto }),
      });

      const result = await service.update(mockUserId, mockPromptId, updatePromptDto);

      expect(mockPromptModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockPromptId, userId: new Types.ObjectId(mockUserId) },
        { $set: updatePromptDto },
        { new: true }
      );
      expect(result.title).toBe(updatePromptDto.title);
    });
  });

  describe('remove', () => {
    it('should delete a prompt successfully', async () => {
      mockPromptModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      await service.remove(mockUserId, mockPromptId);

      expect(mockPromptModel.deleteOne).toHaveBeenCalledWith({
        _id: mockPromptId,
        userId: new Types.ObjectId(mockUserId),
      });
    });

    it('should throw NotFoundException when prompt not found', async () => {
      mockPromptModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      await expect(service.remove(mockUserId, mockPromptId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('createVersion', () => {
    it('should create a new version successfully', async () => {
      const createVersionDto: CreateVersionDto = {
        text: 'New version text',
        changeDescription: 'Updated for better clarity',
      };

      const mockUpdatedPrompt = {
        ...mockPrompt,
        currentVersion: 2,
        versions: [
          ...mockPrompt.versions,
          {
            version: 2,
            text: createVersionDto.text,
            createdAt: expect.any(Date),
            changeDescription: createVersionDto.changeDescription,
          },
        ],
      };

      jest.spyOn(service, 'findOneByUserAndId').mockResolvedValue(mockPrompt as any);
      mockPromptModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUpdatedPrompt),
      });

      const result = await service.createVersion(mockUserId, mockPromptId, createVersionDto);

      expect(mockPromptModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockPromptId, userId: new Types.ObjectId(mockUserId) },
        {
          $push: { versions: expect.objectContaining({
            version: 2,
            text: createVersionDto.text,
            changeDescription: createVersionDto.changeDescription,
          }) },
          $set: {
            currentVersion: 2,
            optimizedText: createVersionDto.text,
          },
        },
        { new: true }
      );
      expect(result.currentVersion).toBe(2);
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions successfully', async () => {
      const mockPromptWithVersions = {
        ...mockPrompt,
        versions: [
          {
            version: 1,
            text: 'Version 1 text',
            createdAt: new Date(),
            changeDescription: 'Initial version',
          },
          {
            version: 2,
            text: 'Version 2 text with more content',
            createdAt: new Date(),
            changeDescription: 'Updated version',
          },
        ],
      };

      jest.spyOn(service, 'findOneByUserAndId').mockResolvedValue(mockPromptWithVersions as any);

      const result = await service.compareVersions(mockUserId, mockPromptId, 1, 2);

      expect(result).toEqual({
        version1: mockPromptWithVersions.versions[0],
        version2: mockPromptWithVersions.versions[1],
        comparison: {
          textLength: {
            v1: 'Version 1 text'.length,
            v2: 'Version 2 text with more content'.length,
            difference: 'Version 2 text with more content'.length - 'Version 1 text'.length,
          },
          wordCount: {
            v1: 3,
            v2: 6,
            difference: 3,
          },
        },
      });
    });

    it('should throw BadRequestException when version not found', async () => {
      jest.spyOn(service, 'findOneByUserAndId').mockResolvedValue(mockPrompt as any);

      await expect(service.compareVersions(mockUserId, mockPromptId, 1, 999))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = [{
        totalPrompts: 10,
        favoritePrompts: 3,
        archivedPrompts: 1,
        totalViews: 50,
        modelProviders: ['openai', 'anthropic'],
        totalVersions: 15,
      }];

      const mockRecentActivity = [
        { title: 'Recent Prompt 1', updatedAt: new Date() },
        { title: 'Recent Prompt 2', updatedAt: new Date() },
      ];

      mockPromptModel.aggregate.mockResolvedValue(mockStats);
      mockPromptModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockRecentActivity),
            }),
          }),
        }),
      });

      const result = await service.getUserStats(mockUserId);

      expect(result).toEqual({
        ...mockStats[0],
        recentActivity: mockRecentActivity,
      });
    });
  });
});