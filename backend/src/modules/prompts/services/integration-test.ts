/**
 * Simple integration test to verify the prompt optimization service works
 * This can be run directly with ts-node
 */

import { PromptAnalysisService } from './prompt-analysis.service';
import { OptimizationRulesEngine } from './optimization-rules-engine.service';
import { BestPracticesService } from './best-practices.service';

async function testPromptAnalysis() {
    console.log('Testing Prompt Analysis Service...');

    const analysisService = new PromptAnalysisService();

    const testPrompt = "写一个好的文章";
    const context = {
        targetModel: 'openai-gpt4',
        messageRole: 'user',
    };

    try {
        const analysis = await analysisService.analyzePrompt(testPrompt, context);

        console.log('✅ Analysis completed successfully');
        console.log(`Word count: ${analysis.wordCount}`);
        console.log(`Clarity score: ${analysis.clarityScore}`);
        console.log(`Structure score: ${analysis.structureScore}`);
        console.log(`Has vague instructions: ${analysis.hasVagueInstructions}`);
        console.log(`Categories: ${analysis.categories.join(', ')}`);
        console.log(`Complexity: ${analysis.complexity}`);
        console.log(`Language: ${analysis.language}`);
        console.log(`Suggested improvements: ${analysis.suggestedImprovements.length}`);

        return true;
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        return false;
    }
}

async function testRulesEngine() {
    console.log('\nTesting Optimization Rules Engine...');

    const rulesEngine = new OptimizationRulesEngine();

    // Mock rules for testing
    const mockRules = [
        {
            name: 'clarity-enhancement',
            description: 'Enhance clarity by replacing vague words',
            category: 'clarity',
            applicableModels: ['openai-gpt4'],
            ruleLogic: {
                pattern: '好的',
                replacement: '高质量的',
                condition: '',
            },
            priority: 5,
            isActive: true,
        },
    ];

    const mockAnalysis = {
        wordCount: 5,
        characterCount: 20,
        sentenceCount: 1,
        paragraphCount: 1,
        hasSystemPrompt: false,
        messageRole: 'user',
        structureScore: 0.5,
        clarityScore: 0.4,
        specificityScore: 0.3,
        completenessScore: 0.5,
        hasVagueInstructions: true,
        lacksContext: true,
        missingExamples: false,
        hasTooManyInstructions: false,
        hasConflictingInstructions: false,
        categories: ['creative'],
        complexity: 'simple' as const,
        language: 'zh',
        tone: 'neutral',
        suggestedImprovements: [],
        modelCompatibility: { 'openai-gpt4': 0.8 },
    };

    try {
        const result = await rulesEngine.applyRules('写一个好的文章', mockRules as any, mockAnalysis);

        console.log('✅ Rules engine completed successfully');
        console.log(`Original text: "写一个好的文章"`);
        console.log(`Optimized text: "${result.optimizedText}"`);
        console.log(`Applied rules: ${result.appliedRules.join(', ')}`);
        console.log(`Improvements: ${result.improvements.length}`);

        return true;
    } catch (error) {
        console.error('❌ Rules engine failed:', error.message);
        return false;
    }
}

async function testBestPractices() {
    console.log('\nTesting Best Practices Service...');

    const bestPracticesService = new BestPracticesService();

    const mockAnalysis = {
        wordCount: 10,
        characterCount: 50,
        sentenceCount: 2,
        paragraphCount: 1,
        hasSystemPrompt: false,
        messageRole: 'user',
        structureScore: 0.6,
        clarityScore: 0.5,
        specificityScore: 0.4,
        completenessScore: 0.6,
        hasVagueInstructions: false,
        lacksContext: true,
        missingExamples: true,
        hasTooManyInstructions: false,
        hasConflictingInstructions: false,
        categories: ['creative'],
        complexity: 'moderate' as const,
        language: 'zh',
        tone: 'neutral',
        suggestedImprovements: [],
        modelCompatibility: { 'openai-gpt4': 0.8 },
    };

    try {
        const result = await bestPracticesService.applyBestPractices(
            '请写一篇关于人工智能的文章',
            'openai-gpt4',
            'user',
            mockAnalysis
        );

        console.log('✅ Best practices service completed successfully');
        console.log(`Optimized text length: ${result.optimizedText.length}`);
        console.log(`Applied practices: ${result.appliedPractices.join(', ')}`);
        console.log(`Improvements: ${result.improvements.length}`);

        if (result.improvements.length > 0) {
            console.log('Sample improvement:', result.improvements[0].description);
        }

        return true;
    } catch (error) {
        console.error('❌ Best practices service failed:', error.message);
        return false;
    }
}

async function runIntegrationTests() {
    console.log('🚀 Starting Prompt Optimization Services Integration Tests\n');

    const results = await Promise.all([
        testPromptAnalysis(),
        testRulesEngine(),
        testBestPractices(),
    ]);

    const passedTests = results.filter(result => result).length;
    const totalTests = results.length;

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! The prompt optimization core services are working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Please check the implementation.');
    }

    return passedTests === totalTests;
}

// Run the tests if this file is executed directly
if (require.main === module) {
    runIntegrationTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test execution failed:', error);
            process.exit(1);
        });
}

export { runIntegrationTests };