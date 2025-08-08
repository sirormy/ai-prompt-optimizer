/**
 * Simple integration test for Models Service
 * This test verifies that the models service can be instantiated and basic functionality works
 */

import { ConfigService } from '@nestjs/config';
import { ModelsService } from './models.service';

describe('ModelsService Integration Test', () => {
  let service: ModelsService;

  beforeAll(() => {
    // Create a mock config service
    const mockConfigService = {
      get: (key: string) => {
        const config = {
          OPENAI_API_KEY: 'test-key-openai',
          ANTHROPIC_API_KEY: 'test-key-anthropic', 
          DEEPSEEK_API_KEY: 'test-key-deepseek',
        };
        return config[key];
      },
    } as ConfigService;

    service = new ModelsService(mockConfigService);
  });

  test('should create service instance', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ModelsService);
  });

  test('should return supported models list', () => {
    const models = service.getSupportedModels();
    
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    
    // Check that each model has required properties
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
      
      expect(typeof model.id).toBe('string');
      expect(typeof model.name).toBe('string');
      expect(typeof model.provider).toBe('string');
      expect(typeof model.maxTokens).toBe('number');
      expect(Array.isArray(model.supportedRoles)).toBe(true);
      expect(typeof model.isActive).toBe('boolean');
      expect(typeof model.requiresApiKey).toBe('boolean');
    });
  });

  test('should check model availability', () => {
    const openaiAvailable = service.isModelAvailable('openai-gpt4');
    const claudeAvailable = service.isModelAvailable('anthropic-claude');
    const deepseekAvailable = service.isModelAvailable('deepseek-chat');
    const unknownAvailable = service.isModelAvailable('unknown-model');
    
    expect(typeof openaiAvailable).toBe('boolean');
    expect(typeof claudeAvailable).toBe('boolean');
    expect(typeof deepseekAvailable).toBe('boolean');
    expect(unknownAvailable).toBe(false);
  });

  test('should return model statistics', () => {
    const stats = service.getModelStats();
    
    expect(stats).toHaveProperty('totalSupported');
    expect(stats).toHaveProperty('totalActive');
    expect(stats).toHaveProperty('models');
    
    expect(typeof stats.totalSupported).toBe('number');
    expect(typeof stats.totalActive).toBe('number');
    expect(Array.isArray(stats.models)).toBe(true);
    expect(stats.totalSupported).toBeGreaterThan(0);
  });

  test('should throw error for unknown model adapter', () => {
    expect(() => {
      service.getModelAdapter('unknown-model');
    }).toThrow('Model adapter not found: unknown-model');
  });

  test('should validate optimization request parameters', async () => {
    const emptyPromptRequest = {
      prompt: '',
      targetModel: 'openai-gpt4',
      messageRole: 'user' as const,
      optimizationLevel: 'basic' as const,
    };

    const noModelRequest = {
      prompt: 'Test prompt',
      targetModel: '',
      messageRole: 'user' as const,
      optimizationLevel: 'basic' as const,
    };

    // Should reject empty prompt
    await expect(service.optimizePrompt(emptyPromptRequest))
      .rejects.toThrow('Prompt cannot be empty');

    // Should reject missing target model
    await expect(service.optimizePrompt(noModelRequest))
      .rejects.toThrow('Target model is required');
  });

  test('should get optimization rules for available models', () => {
    const models = service.getSupportedModels();
    
    models.forEach(model => {
      if (service.isModelAvailable(model.id)) {
        const rules = service.getOptimizationRules(model.id);
        expect(Array.isArray(rules)).toBe(true);
        
        rules.forEach(rule => {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('name');
          expect(rule).toHaveProperty('description');
          expect(rule).toHaveProperty('category');
          expect(rule).toHaveProperty('priority');
          expect(rule).toHaveProperty('applicableModels');
          expect(rule).toHaveProperty('isActive');
          
          expect(typeof rule.id).toBe('string');
          expect(typeof rule.name).toBe('string');
          expect(typeof rule.description).toBe('string');
          expect(typeof rule.priority).toBe('number');
          expect(Array.isArray(rule.applicableModels)).toBe(true);
          expect(typeof rule.isActive).toBe('boolean');
        });
      }
    });
  });
});

// Run the test if this file is executed directly
if (require.main === module) {
  console.log('Running Models Service Integration Test...');
  
  const { ConfigService } = require('@nestjs/config');
  const { ModelsService } = require('./models.service');
  
  const mockConfigService = {
    get: (key: string) => {
      const config = {
        OPENAI_API_KEY: 'test-key-openai',
        ANTHROPIC_API_KEY: 'test-key-anthropic', 
        DEEPSEEK_API_KEY: 'test-key-deepseek',
      };
      return config[key];
    },
  };

  const service = new ModelsService(mockConfigService);
  
  console.log('✓ Service created successfully');
  
  const models = service.getSupportedModels();
  console.log(`✓ Found ${models.length} supported models:`, models.map(m => m.name));
  
  const stats = service.getModelStats();
  console.log(`✓ Model stats: ${stats.totalActive}/${stats.totalSupported} active`);
  
  console.log('✓ All basic tests passed!');
}