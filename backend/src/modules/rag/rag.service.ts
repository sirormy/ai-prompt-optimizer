import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseService, BestPractice } from './knowledge-base.service';
import { EmbeddingService } from './embedding.service';

export interface RAGQuery {
  prompt: string;
  targetModel?: string;
  category?: string;
  includeExamples?: boolean;
}

export interface RAGResponse {
  enhancedPrompt: string;
  suggestions: string[];
  relevantPractices: BestPractice[];
  confidence: number;
}

export interface OptimizationContext {
  originalPrompt: string;
  targetModel?: string;
  userPreferences?: {
    optimizationLevel: 'basic' | 'advanced' | 'expert';
    includeExplanations: boolean;
  };
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private knowledgeBaseService: KnowledgeBaseService,
    private embeddingService: EmbeddingService,
  ) {}

  async enhancePromptWithRAG(query: RAGQuery): Promise<RAGResponse> {
    try {
      this.logger.log(`Enhancing prompt with RAG: ${query.prompt.substring(0, 100)}...`);

      // Get contextual suggestions and relevant practices
      const { suggestions, relevantPractices } = 
        await this.knowledgeBaseService.generateContextualSuggestions(
          query.prompt,
          query.targetModel,
        );

      // Search for additional relevant practices by category
      let additionalPractices: BestPractice[] = [];
      if (query.category) {
        additionalPractices = await this.knowledgeBaseService.searchBestPractices(
          query.prompt,
          {
            category: query.category,
            model: query.targetModel,
            limit: 2,
          },
        );
      }

      // Combine and deduplicate practices
      const allPractices = this.deduplicatePractices([
        ...relevantPractices,
        ...additionalPractices,
      ]);

      // Generate enhanced prompt
      const enhancedPrompt = await this.generateEnhancedPrompt(
        query.prompt,
        allPractices,
        query.targetModel,
        query.includeExamples,
      );

      // Calculate confidence based on the number and relevance of practices found
      const confidence = this.calculateConfidence(allPractices, query.prompt);

      return {
        enhancedPrompt,
        suggestions: [...new Set(suggestions)], // Remove duplicates
        relevantPractices: allPractices,
        confidence,
      };
    } catch (error) {
      this.logger.error('Failed to enhance prompt with RAG:', error);
      throw error;
    }
  }

  async generateOptimizationSuggestions(context: OptimizationContext): Promise<{
    suggestions: string[];
    improvements: Array<{
      type: string;
      description: string;
      example?: string;
      priority: number;
    }>;
  }> {
    try {
      const { originalPrompt, targetModel, userPreferences } = context;

      // Search for relevant best practices
      const practices = await this.knowledgeBaseService.searchBestPractices(
        originalPrompt,
        {
          limit: 5,
          model: targetModel,
          minSimilarity: 0.5,
        },
      );

      // Generate suggestions based on practices and user preferences
      const suggestions = practices.map(practice => 
        this.generateSpecificSuggestion(practice, originalPrompt)
      ).filter(Boolean);

      // Generate improvement recommendations
      const improvements = await this.generateImprovements(
        originalPrompt,
        practices,
        userPreferences?.optimizationLevel || 'basic',
      );

      return { suggestions, improvements };
    } catch (error) {
      this.logger.error('Failed to generate optimization suggestions:', error);
      return { suggestions: [], improvements: [] };
    }
  }

  private deduplicatePractices(practices: BestPractice[]): BestPractice[] {
    const seen = new Set<string>();
    return practices.filter(practice => {
      if (seen.has(practice.id)) {
        return false;
      }
      seen.add(practice.id);
      return true;
    });
  }

  private async generateEnhancedPrompt(
    originalPrompt: string,
    practices: BestPractice[],
    targetModel?: string,
    includeExamples?: boolean,
  ): Promise<string> {
    let enhanced = originalPrompt;

    // Apply model-specific enhancements
    if (targetModel) {
      const modelPractices = practices.filter(p => p.model === targetModel);
      enhanced = this.applyModelSpecificEnhancements(enhanced, modelPractices, targetModel);
    }

    // Apply general enhancements based on practices
    enhanced = this.applyGeneralEnhancements(enhanced, practices);

    // Add examples if requested and available
    if (includeExamples) {
      enhanced = this.addExamplesIfNeeded(enhanced, practices);
    }

    return enhanced;
  }

  private applyModelSpecificEnhancements(
    prompt: string,
    practices: BestPractice[],
    model: string,
  ): string {
    let enhanced = prompt;

    switch (model) {
      case 'openai':
        // Add system role if not present
        if (!prompt.includes('System:') && !prompt.includes('system')) {
          enhanced = `System: You are a helpful assistant.\n\n${enhanced}`;
        }
        break;
      
      case 'claude':
        // Structure with XML tags if complex
        if (prompt.length > 200 && !prompt.includes('<')) {
          enhanced = `<task>\n${enhanced}\n</task>`;
        }
        break;
      
      case 'deepseek':
        // Add technical context for code-related tasks
        if (prompt.includes('代码') || prompt.includes('编程')) {
          enhanced = `作为一名专业的软件开发者，${enhanced}`;
        }
        break;
    }

    return enhanced;
  }

  private applyGeneralEnhancements(prompt: string, practices: BestPractice[]): string {
    let enhanced = prompt;

    // Check for clarity improvements
    const clarityPractices = practices.filter(p => p.category === 'clarity');
    if (clarityPractices.length > 0 && prompt.length < 100) {
      enhanced = `请详细说明：${enhanced}`;
    }

    // Check for structure improvements
    const structurePractices = practices.filter(p => p.category === 'structure');
    if (structurePractices.length > 0 && prompt.length > 200 && !prompt.includes('###')) {
      enhanced = `### 任务描述\n${enhanced}\n\n### 要求\n请提供详细和准确的回答。`;
    }

    return enhanced;
  }

  private addExamplesIfNeeded(prompt: string, practices: BestPractice[]): string {
    const examplePractices = practices.filter(p => p.category === 'examples');
    if (examplePractices.length > 0 && !prompt.includes('例如') && !prompt.includes('示例')) {
      return `${prompt}\n\n请提供具体的示例来说明你的回答。`;
    }
    return prompt;
  }

  private calculateConfidence(practices: BestPractice[], prompt: string): number {
    if (practices.length === 0) return 0.3;
    
    // Base confidence on number of relevant practices found
    let confidence = Math.min(practices.length / 5, 1) * 0.7;
    
    // Boost confidence if high-priority practices are found
    const highPriorityPractices = practices.filter(p => p.priority >= 8);
    confidence += highPriorityPractices.length * 0.1;
    
    // Reduce confidence for very short prompts
    if (prompt.length < 50) {
      confidence *= 0.8;
    }
    
    return Math.min(confidence, 1);
  }

  private generateSpecificSuggestion(practice: BestPractice, prompt: string): string {
    // Generate specific suggestions based on practice and prompt analysis
    const suggestions = {
      'clarity': '使用更具体和明确的语言来描述你的需求',
      'context': '添加相关的背景信息和上下文',
      'examples': '提供具体的示例来说明期望的输出格式',
      'structure': '使用清晰的结构来组织你的提示词',
      'constraints': '明确指定任何约束条件和限制',
      'role': '为AI分配一个特定的角色或专业身份',
      'iteration': '考虑测试和迭代优化你的提示词',
    };

    return suggestions[practice.category] || practice.title;
  }

  private async generateImprovements(
    prompt: string,
    practices: BestPractice[],
    level: 'basic' | 'advanced' | 'expert',
  ): Promise<Array<{
    type: string;
    description: string;
    example?: string;
    priority: number;
  }>> {
    const improvements = [];

    // Analyze prompt for common issues
    if (prompt.length < 50) {
      improvements.push({
        type: 'length',
        description: '提示词过于简短，可能缺乏必要的细节',
        example: '考虑添加更多的上下文和具体要求',
        priority: 8,
      });
    }

    if (!prompt.includes('请') && !prompt.includes('帮助')) {
      improvements.push({
        type: 'politeness',
        description: '使用礼貌的语言可以获得更好的回应',
        example: '在请求前添加"请"或"帮助我"',
        priority: 3,
      });
    }

    // Add improvements based on relevant practices
    practices.forEach(practice => {
      if (practice.priority >= 7) {
        improvements.push({
          type: practice.category,
          description: practice.content.substring(0, 100) + '...',
          priority: practice.priority,
        });
      }
    });

    // Sort by priority and limit based on optimization level
    const limits = { basic: 3, advanced: 5, expert: 8 };
    return improvements
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limits[level]);
  }
}