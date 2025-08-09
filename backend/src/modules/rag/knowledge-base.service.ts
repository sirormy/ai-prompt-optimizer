import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { EmbeddingService } from './embedding.service';

export interface BestPractice {
  id: string;
  title: string;
  content: string;
  category: string;
  model?: string;
  tags: string[];
  source?: string;
  priority: number;
}

export interface KnowledgeDocument {
  id: string;
  content: string;
  metadata: {
    title: string;
    category: string;
    model?: string;
    tags: string[];
    source?: string;
    priority: number;
    createdAt: Date;
  };
}

@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private vectorStoreService: VectorStoreService,
    private embeddingService: EmbeddingService,
  ) {}

  async onModuleInit() {
    await this.initializeKnowledgeBase();
  }

  private async initializeKnowledgeBase() {
    try {
      // Initialize with default best practices
      const defaultPractices = this.getDefaultBestPractices();
      await this.indexBestPractices(defaultPractices);
      this.logger.log('Knowledge base initialized with default best practices');
    } catch (error) {
      this.logger.error('Failed to initialize knowledge base:', error);
    }
  }

  private getDefaultBestPractices(): BestPractice[] {
    return [
      {
        id: 'clarity-1',
        title: '使用清晰具体的指令',
        content: '提供清晰、具体的指令比模糊的指令更有效。明确说明你想要AI做什么，而不是不想要它做什么。例如，使用"写一个关于气候变化的200字摘要"而不是"写一些关于气候变化的内容"。',
        category: 'clarity',
        tags: ['指令', '清晰度', '具体性'],
        source: 'OpenAI Best Practices',
        priority: 10,
      },
      {
        id: 'context-1',
        title: '提供充分的上下文',
        content: '为AI提供足够的背景信息和上下文，帮助它更好地理解任务。包括相关的背景信息、目标受众、期望的输出格式等。上下文越丰富，AI的回答越准确。',
        category: 'context',
        tags: ['上下文', '背景信息', '准确性'],
        source: 'OpenAI Best Practices',
        priority: 9,
      },
      {
        id: 'examples-1',
        title: '使用示例来说明期望的输出',
        content: '通过提供具体的示例来展示你期望的输出格式和风格。这种"few-shot"方法可以显著提高AI回答的质量和一致性。包含2-3个高质量的示例通常效果最佳。',
        category: 'examples',
        tags: ['示例', 'few-shot', '格式'],
        source: 'OpenAI Best Practices',
        priority: 8,
      },
      {
        id: 'structure-1',
        title: '使用结构化的提示词格式',
        content: '将复杂的提示词分解为清晰的部分：任务描述、上下文、示例、约束条件和输出格式。使用分隔符（如###、---）来区分不同部分，提高可读性。',
        category: 'structure',
        tags: ['结构化', '格式', '可读性'],
        source: 'Prompt Engineering Guide',
        priority: 7,
      },
      {
        id: 'constraints-1',
        title: '明确指定约束和限制',
        content: '清楚地说明任何约束条件，如字数限制、格式要求、禁止的内容等。这有助于AI生成符合要求的回答，避免不必要的修正。',
        category: 'constraints',
        tags: ['约束', '限制', '要求'],
        source: 'OpenAI Best Practices',
        priority: 6,
      },
      {
        id: 'role-1',
        title: '为AI分配特定角色',
        content: '通过为AI分配特定的角色或身份来改善回答质量。例如："作为一名经验丰富的数据科学家"或"作为一名专业的技术写作者"。这有助于AI采用相应的专业视角。',
        category: 'role',
        tags: ['角色', '身份', '专业性'],
        source: 'Prompt Engineering Guide',
        priority: 5,
      },
      {
        id: 'iteration-1',
        title: '迭代优化提示词',
        content: '提示词工程是一个迭代过程。测试不同的表述方式，分析结果，然后基于反馈进行改进。记录什么有效，什么无效，建立自己的最佳实践库。',
        category: 'iteration',
        tags: ['迭代', '优化', '测试'],
        source: 'Best Practices',
        priority: 4,
      },
      {
        id: 'openai-specific-1',
        title: 'OpenAI模型特定优化',
        content: 'OpenAI模型响应系统消息很好。使用system role设置行为和上下文。对于GPT-4，可以使用更复杂的推理任务。注意token限制，GPT-3.5-turbo为4096，GPT-4为8192或32768。',
        category: 'model-specific',
        model: 'openai',
        tags: ['OpenAI', 'GPT-4', 'system-role', 'token-limit'],
        source: 'OpenAI Documentation',
        priority: 8,
      },
      {
        id: 'claude-specific-1',
        title: 'Claude模型特定优化',
        content: 'Claude擅长长文本处理和分析。使用XML标签来结构化输入（如<document>、<question>）。Claude对道德和安全问题特别敏感，避免可能被误解的内容。支持更长的上下文窗口。',
        category: 'model-specific',
        model: 'claude',
        tags: ['Claude', 'XML标签', '长文本', '安全性'],
        source: 'Anthropic Documentation',
        priority: 8,
      },
      {
        id: 'deepseek-specific-1',
        title: 'DeepSeek模型特定优化',
        content: 'DeepSeek模型在代码生成和技术任务上表现出色。使用清晰的技术术语和具体的编程要求。支持多种编程语言，在提示中明确指定所需的语言和框架。',
        category: 'model-specific',
        model: 'deepseek',
        tags: ['DeepSeek', '代码生成', '技术任务', '编程语言'],
        source: 'DeepSeek Documentation',
        priority: 7,
      },
    ];
  }

  async indexBestPractices(practices: BestPractice[]): Promise<void> {
    try {
      const documents = await Promise.all(
        practices.map(async (practice) => {
          const embedding = await this.embeddingService.generateEmbedding(
            `${practice.title} ${practice.content}`,
          );
          
          return {
            id: practice.id,
            content: practice.content,
            embedding,
            metadata: {
              title: practice.title,
              category: practice.category,
              model: practice.model,
              tags: practice.tags,
              source: practice.source,
              priority: practice.priority,
              createdAt: new Date(),
            },
          };
        }),
      );

      await this.vectorStoreService.addDocuments(documents);
      this.logger.log(`Indexed ${practices.length} best practices`);
    } catch (error) {
      this.logger.error('Failed to index best practices:', error);
      throw error;
    }
  }

  async searchBestPractices(
    query: string,
    options: {
      limit?: number;
      model?: string;
      category?: string;
      minSimilarity?: number;
    } = {},
  ): Promise<BestPractice[]> {
    try {
      const { limit = 5, model, category, minSimilarity = 0.7 } = options;
      
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      // Build filter
      const filter: any = {};
      if (model) {
        filter.model = { $in: [model, null, undefined] };
      }
      if (category) {
        filter.category = category;
      }

      // Search similar documents
      const results = await this.vectorStoreService.searchSimilar(
        queryEmbedding,
        limit * 2, // Get more results to filter by similarity
        Object.keys(filter).length > 0 ? filter : undefined,
      );

      // Filter by similarity threshold and convert to BestPractice format
      return results
        .filter(result => result.similarity >= minSimilarity)
        .slice(0, limit)
        .map(result => ({
          id: result.id,
          title: result.metadata.title,
          content: result.content,
          category: result.metadata.category,
          model: result.metadata.model,
          tags: result.metadata.tags || [],
          source: result.metadata.source,
          priority: result.metadata.priority || 0,
        }));
    } catch (error) {
      this.logger.error('Failed to search best practices:', error);
      throw error;
    }
  }

  async addBestPractice(practice: BestPractice): Promise<void> {
    try {
      await this.indexBestPractices([practice]);
      this.logger.log(`Added best practice: ${practice.title}`);
    } catch (error) {
      this.logger.error('Failed to add best practice:', error);
      throw error;
    }
  }

  async deleteBestPractice(id: string): Promise<void> {
    try {
      await this.vectorStoreService.deleteDocuments([id]);
      this.logger.log(`Deleted best practice: ${id}`);
    } catch (error) {
      this.logger.error('Failed to delete best practice:', error);
      throw error;
    }
  }

  async generateContextualSuggestions(
    prompt: string,
    targetModel?: string,
  ): Promise<{
    suggestions: string[];
    relevantPractices: BestPractice[];
  }> {
    try {
      // Search for relevant best practices
      const practices = await this.searchBestPractices(prompt, {
        limit: 3,
        model: targetModel,
        minSimilarity: 0.6,
      });

      // Generate suggestions based on the practices
      const suggestions = practices.map(practice => {
        return this.generateSuggestionFromPractice(practice, prompt);
      }).filter(Boolean);

      return {
        suggestions,
        relevantPractices: practices,
      };
    } catch (error) {
      this.logger.error('Failed to generate contextual suggestions:', error);
      return { suggestions: [], relevantPractices: [] };
    }
  }

  private generateSuggestionFromPractice(practice: BestPractice, prompt: string): string {
    // Simple rule-based suggestion generation
    // In a real implementation, this could use an LLM to generate more sophisticated suggestions
    
    switch (practice.category) {
      case 'clarity':
        if (prompt.length < 50) {
          return '考虑提供更具体和详细的指令来提高清晰度';
        }
        break;
      case 'context':
        if (!prompt.includes('背景') && !prompt.includes('上下文')) {
          return '添加相关的背景信息和上下文可以提高回答质量';
        }
        break;
      case 'examples':
        if (!prompt.includes('例如') && !prompt.includes('示例')) {
          return '提供具体示例可以帮助AI更好地理解期望的输出格式';
        }
        break;
      case 'structure':
        if (!prompt.includes('###') && !prompt.includes('---')) {
          return '使用分隔符来结构化复杂的提示词可以提高可读性';
        }
        break;
      case 'role':
        if (!prompt.includes('作为') && !prompt.includes('角色')) {
          return '为AI分配特定角色可以获得更专业的回答';
        }
        break;
    }
    
    return practice.title;
  }
}