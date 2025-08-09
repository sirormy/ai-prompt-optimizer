import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prompt, PromptDocument } from '../../schemas/prompt.schema';

@Injectable()
export class PromptIndexService implements OnModuleInit {
  private readonly logger = new Logger(PromptIndexService.name);

  constructor(
    @InjectModel(Prompt.name) private promptModel: Model<PromptDocument>,
  ) {}

  async onModuleInit() {
    await this.createIndexes();
  }

  private async createIndexes() {
    try {
      this.logger.log('Creating database indexes for prompts collection...');

      // 用户ID索引 - 最常用的查询条件
      await this.promptModel.collection.createIndex(
        { userId: 1 },
        { name: 'idx_userId', background: true }
      );

      // 用户ID + 创建时间复合索引 - 用于分页查询
      await this.promptModel.collection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'idx_userId_createdAt', background: true }
      );

      // 用户ID + 更新时间复合索引 - 用于最近活动查询
      await this.promptModel.collection.createIndex(
        { userId: 1, updatedAt: -1 },
        { name: 'idx_userId_updatedAt', background: true }
      );

      // 文本搜索索引 - 用于全文搜索
      await this.promptModel.collection.createIndex(
        {
          title: 'text',
          description: 'text',
          originalText: 'text',
          optimizedText: 'text'
        },
        {
          name: 'idx_text_search',
          background: true,
          weights: {
            title: 10,
            description: 5,
            originalText: 3,
            optimizedText: 3
          }
        }
      );

      // 标签索引 - 用于标签过滤
      await this.promptModel.collection.createIndex(
        { tags: 1 },
        { name: 'idx_tags', background: true }
      );

      // 模型提供商索引 - 用于模型过滤
      await this.promptModel.collection.createIndex(
        { 'targetModel.provider': 1 },
        { name: 'idx_model_provider', background: true }
      );

      // 收藏状态索引 - 用于收藏过滤
      await this.promptModel.collection.createIndex(
        { userId: 1, isFavorite: 1 },
        { name: 'idx_userId_favorite', background: true }
      );

      // 归档状态索引 - 用于归档过滤
      await this.promptModel.collection.createIndex(
        { userId: 1, isArchived: 1 },
        { name: 'idx_userId_archived', background: true }
      );

      // 查看统计索引 - 用于热门内容排序
      await this.promptModel.collection.createIndex(
        { userId: 1, viewCount: -1 },
        { name: 'idx_userId_viewCount', background: true }
      );

      // 优化时间索引 - 用于优化历史查询
      await this.promptModel.collection.createIndex(
        { userId: 1, 'optimizationMetadata.optimizedAt': -1 },
        { 
          name: 'idx_userId_optimizedAt', 
          background: true,
          sparse: true // 只为有优化数据的文档创建索引
        }
      );

      // 复合索引用于复杂查询
      await this.promptModel.collection.createIndex(
        { 
          userId: 1, 
          isArchived: 1, 
          'targetModel.provider': 1, 
          createdAt: -1 
        },
        { name: 'idx_complex_query', background: true }
      );

      // TTL索引 - 自动清理临时数据（如果有的话）
      await this.promptModel.collection.createIndex(
        { tempExpiresAt: 1 },
        { 
          name: 'idx_temp_ttl', 
          background: true,
          expireAfterSeconds: 0,
          sparse: true
        }
      );

      this.logger.log('Database indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create database indexes:', error);
    }
  }

  /**
   * 获取索引统计信息
   */
  async getIndexStats(): Promise<any> {
    try {
      const stats = await this.promptModel.collection.indexStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get index stats:', error);
      return null;
    }
  }

  /**
   * 分析查询性能
   */
  async analyzeQuery(query: any): Promise<any> {
    try {
      const explanation = await this.promptModel.collection
        .find(query)
        .explain('executionStats');
      
      return {
        executionStats: explanation.executionStats,
        indexUsed: explanation.executionStats.executionStages?.indexName || 'COLLSCAN',
        documentsExamined: explanation.executionStats.totalDocsExamined,
        documentsReturned: explanation.executionStats.totalDocsReturned,
        executionTimeMillis: explanation.executionStats.executionTimeMillis,
      };
    } catch (error) {
      this.logger.error('Failed to analyze query:', error);
      return null;
    }
  }

  /**
   * 优化建议
   */
  async getOptimizationSuggestions(): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      // 检查集合统计
      const stats = await this.promptModel.collection.stats();
      
      if (stats.count > 10000) {
        suggestions.push('Consider partitioning large collections by userId');
      }
      
      if (stats.avgObjSize > 16000) {
        suggestions.push('Consider storing large text fields in GridFS');
      }
      
      // 检查索引使用情况
      const indexStats = await this.getIndexStats();
      if (indexStats) {
        for (const index of indexStats) {
          if (index.accesses.ops === 0 && index.name !== '_id_') {
            suggestions.push(`Consider removing unused index: ${index.name}`);
          }
        }
      }
      
      return suggestions;
    } catch (error) {
      this.logger.error('Failed to generate optimization suggestions:', error);
      return ['Unable to generate suggestions due to error'];
    }
  }
}