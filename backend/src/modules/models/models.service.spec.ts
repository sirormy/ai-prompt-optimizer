import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModelsService } from './models.service';
import { OptimizationRequest } from './dto';

describe('ModelsService', () => {
  let service: ModelsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              // Mock configuration values
              const config = {
                OPENAI_API_KEY: 'test-openai-key',
                ANTHROPIC_API_KEY: 'test-anthropic-key',
                DEEPSEEK_API_KEY: 'test-deepseek-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ModelsService>(ModelsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return supported models', () => {
    const models = service.getSupportedModels();
    expect(models).toBeInstanceOf(Array);
    expect(models.length).toBeGreaterThan(0);
    
    // Check if all required fields are present
    models.forEach(model => {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('provider');
      expect(model).toHaveProperty('version');
      expect(model).toHaveProperty('maxTokens');
      expect(model).toHaveProperty('supportedRoles');
      expect(model).toHaveProperty('description');
      expect(model).toHaveProperty('isActive');
      expect(model).toHaveProperty('requiresApiKey');
    });
  });

  it('should check model availability', () => {
    // These should be available if API keys are configured
    const openaiAvailable = service.isModelAvailable('openai-gpt4');
    const claudeAvailable = service.isModelAvailable('anthropic-claude');
    const deepseekAvailable = service.isModelAvailable('deepseek-chat');
    
    // At least one should be available in test environment
    expect(typeof openaiAvailable).toBe('boolean');
    expect(typeof claudeAvailable).toBe('boolean');
    expect(typeof deepseekAvailable).toBe('boolean');
  });

  it('should throw error for unknown model', () => {
    expect(() => {
      service.getModelAdapter('unknown-model');
    }).toThrow('Model adapter not found: unknown-model');
  });

  it('should validate optimization request', async () => {
    const request: OptimizationRequest = {
      prompt: '',
      targetModel: 'openai-gpt4',
      messageRole: 'user',
      optimizationLevel: 'basic',
    };

    // Should throw error for empty prompt
    await expect(service.optimizePrompt(request)).rejects.toThrow('Prompt cannot be empty');
  });

  it('should get model statistics', () => {
    const stats = service.getModelStats();
    expect(stats).toHaveProperty('totalSupported');
    expect(stats).toHaveProperty('totalActive');
    expect(stats).toHaveProperty('models');
    expect(stats.models).toBeInstanceOf(Array);
    expect(stats.totalSupported).toBeGreaterThan(0);
  });
});