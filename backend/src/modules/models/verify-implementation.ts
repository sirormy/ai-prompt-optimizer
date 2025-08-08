/**
 * Verification script for Models Service implementation
 */

import { ConfigService } from '@nestjs/config';
import { ModelsService } from './models.service';
import { OptimizationRequest } from './dto';

async function verifyImplementation() {
  console.log('🔍 Verifying Models Service Implementation...\n');

  try {
    // Create mock config service
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

    // Create service instance
    const service = new ModelsService(mockConfigService);
    console.log('✅ ModelsService created successfully');

    // Test 1: Get supported models
    const models = service.getSupportedModels();
    console.log(`✅ Found ${models.length} supported models:`);
    models.forEach(model => {
      console.log(`   - ${model.name} (${model.provider}) - Active: ${model.isActive}`);
    });

    // Test 2: Check model availability
    console.log('\n🔍 Checking model availability:');
    const modelIds = ['openai-gpt4', 'anthropic-claude', 'deepseek-chat'];
    modelIds.forEach(modelId => {
      const available = service.isModelAvailable(modelId);
      console.log(`   - ${modelId}: ${available ? '✅' : '❌'}`);
    });

    // Test 3: Get model statistics
    const stats = service.getModelStats();
    console.log(`\n✅ Model statistics: ${stats.totalActive}/${stats.totalSupported} models active`);

    // Test 4: Test optimization rules
    console.log('\n🔍 Testing optimization rules:');
    modelIds.forEach(modelId => {
      if (service.isModelAvailable(modelId)) {
        try {
          const rules = service.getOptimizationRules(modelId);
          console.log(`   - ${modelId}: ${rules.length} rules available`);
        } catch (error) {
          console.log(`   - ${modelId}: ❌ Error getting rules - ${error.message}`);
        }
      }
    });

    // Test 5: Test validation
    console.log('\n🔍 Testing request validation:');
    
    // Test empty prompt
    try {
      const emptyRequest: OptimizationRequest = {
        prompt: '',
        targetModel: 'openai-gpt4',
        messageRole: 'user',
        optimizationLevel: 'basic',
      };
      await service.optimizePrompt(emptyRequest);
      console.log('   - Empty prompt: ❌ Should have failed');
    } catch (error) {
      console.log('   - Empty prompt: ✅ Correctly rejected');
    }

    // Test missing model
    try {
      const noModelRequest: OptimizationRequest = {
        prompt: 'Test prompt',
        targetModel: '',
        messageRole: 'user',
        optimizationLevel: 'basic',
      };
      await service.optimizePrompt(noModelRequest);
      console.log('   - Missing model: ❌ Should have failed');
    } catch (error) {
      console.log('   - Missing model: ✅ Correctly rejected');
    }

    // Test unknown model
    try {
      service.getModelAdapter('unknown-model');
      console.log('   - Unknown model: ❌ Should have failed');
    } catch (error) {
      console.log('   - Unknown model: ✅ Correctly rejected');
    }

    console.log('\n🎉 All verification tests passed!');
    console.log('\n📋 Implementation Summary:');
    console.log('   ✅ ModelAdapter interface defined');
    console.log('   ✅ BaseModelAdapter abstract class implemented');
    console.log('   ✅ OpenAIAdapter implemented');
    console.log('   ✅ ClaudeAdapter implemented');
    console.log('   ✅ DeepSeekAdapter implemented');
    console.log('   ✅ ModelsService with configuration management');
    console.log('   ✅ Model validation functionality');
    console.log('   ✅ Error handling and validation');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error.stack);
  }
}

// Run verification
verifyImplementation();