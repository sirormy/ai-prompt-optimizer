import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RAGService } from './rag.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';

describe('RAGService', () => {
  let service: RAGService;
  let knowledgeBaseService: KnowledgeBaseService;
  let embeddingService: EmbeddingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RAGService,
        {
          provide: KnowledgeBaseService,
          useValue: {
            generateContextualSuggestions: jest.fn(),
            searchBestPractices: jest.fn(),
          },
        },
        {
          provide: EmbeddingService,
          useValue: {
            generateEmbedding: jest.fn(),
          },
        },
        {
          provide: VectorStoreService,
          useValue: {
            searchSimilar: jest.fn(),
            addDocuments: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RAGService>(RAGService);
    knowledgeBaseService = module.get<KnowledgeBaseService>(KnowledgeBaseService);
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enhancePromptWithRAG', () => {
    it('should enhance prompt with RAG suggestions', async () => {
      const mockSuggestions = {
        suggestions: ['使用更具体的指令'],
        relevantPractices: [{
          id: 'test-1',
          title: '测试最佳实践',
          content: '这是一个测试最佳实践',
          category: 'clarity',
          tags: ['测试'],
          priority: 8,
        }],
      };

      jest.spyOn(knowledgeBaseService, 'generateContextualSuggestions')
        .mockResolvedValue(mockSuggestions);

      const query = {
        prompt: '写一个关于AI的文章',
        targetModel: 'openai',
      };

      const result = await service.enhancePromptWithRAG(query);

      expect(result).toBeDefined();
      expect(result.suggestions).toEqual(mockSuggestions.suggestions);
      expect(result.relevantPractices).toEqual(mockSuggestions.relevantPractices);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('generateOptimizationSuggestions', () => {
    it('should generate optimization suggestions based on context', async () => {
      const mockPractices = [{
        id: 'test-1',
        title: '测试最佳实践',
        content: '这是一个测试最佳实践',
        category: 'clarity',
        tags: ['测试'],
        priority: 8,
      }];

      jest.spyOn(knowledgeBaseService, 'searchBestPractices')
        .mockResolvedValue(mockPractices);

      const context = {
        originalPrompt: '写一个关于AI的文章',
        targetModel: 'openai',
        userPreferences: {
          optimizationLevel: 'basic' as const,
          includeExplanations: true,
        },
      };

      const result = await service.generateOptimizationSuggestions(context);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.improvements).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.improvements)).toBe(true);
    });
  });
});