import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromptDocument = Prompt & Document;

// 版本信息子文档
@Schema({ _id: false })
export class PromptVersion {
  @Prop({ required: true })
  version: number; // 版本号

  @Prop({ required: true })
  text: string; // 该版本的提示词文本

  @Prop({ required: true, default: Date.now })
  createdAt: Date; // 版本创建时间

  @Prop({ default: '' })
  changeDescription: string; // 版本变更描述
}

// 优化改进子文档
@Schema({ _id: false })
export class OptimizationImprovement {
  @Prop({ required: true })
  type: string; // 改进类型

  @Prop({ required: true })
  description: string; // 改进描述

  @Prop({ required: true })
  impact: string; // 影响程度

  @Prop({ default: '' })
  suggestion: string; // 具体建议
}

// 目标模型子文档
@Schema({ _id: false })
export class TargetModel {
  @Prop({ required: true })
  id: string; // 模型ID

  @Prop({ required: true })
  name: string; // 模型名称

  @Prop({ required: true })
  provider: string; // 模型提供商（openai/anthropic/deepseek）

  @Prop({ default: '' })
  version: string; // 模型版本
}

// 优化元数据子文档
@Schema({ _id: false })
export class OptimizationMetadata {
  @Prop({ type: [String], default: [] })
  appliedRules: string[]; // 应用的优化规则列表

  @Prop({ type: Number, min: 0, max: 1, default: 0 })
  confidence: number; // 优化置信度（0-1）

  @Prop({ type: [OptimizationImprovement], default: [] })
  improvements: OptimizationImprovement[]; // 改进列表

  @Prop({ default: Date.now })
  optimizedAt: Date; // 优化时间

  @Prop({ default: '' })
  optimizationLevel: string; // 优化级别 (basic/advanced/expert)
}

@Schema({
  collection: 'prompts',
  timestamps: true,
})
export class Prompt {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // 用户ID，关联到User表

  @Prop({ required: true })
  title: string; // 提示词标题

  @Prop({ required: true })
  originalText: string; // 原始提示词文本

  @Prop({ required: true })
  optimizedText: string; // 当前优化后的提示词文本

  @Prop({ type: TargetModel, required: true })
  targetModel: TargetModel; // 目标模型信息

  @Prop({ required: true, enum: ['system', 'user', 'assistant'] })
  messageRole: string; // 消息角色类型

  @Prop({ default: '' })
  systemPrompt: string; // 系统提示词（可选）

  @Prop({ type: OptimizationMetadata, default: () => ({}) })
  optimizationMetadata: OptimizationMetadata; // 优化元数据

  @Prop({ type: [PromptVersion], default: [] })
  versions: PromptVersion[]; // 版本历史

  @Prop({ type: Number, default: 1 })
  currentVersion: number; // 当前版本号

  @Prop({ type: [String], default: [] })
  tags: string[]; // 标签

  @Prop({ default: false })
  isArchived: boolean; // 是否归档

  @Prop({ default: false })
  isFavorite: boolean; // 是否收藏

  @Prop({ default: '' })
  description: string; // 描述

  // 统计信息
  @Prop({ type: Number, default: 0 })
  viewCount: number; // 查看次数

  @Prop({ type: Date })
  lastViewedAt: Date; // 最后查看时间
}

export const PromptVersionSchema = SchemaFactory.createForClass(PromptVersion);
export const OptimizationImprovementSchema = SchemaFactory.createForClass(OptimizationImprovement);
export const TargetModelSchema = SchemaFactory.createForClass(TargetModel);
export const OptimizationMetadataSchema = SchemaFactory.createForClass(OptimizationMetadata);
export const PromptSchema = SchemaFactory.createForClass(Prompt);

// 创建索引
PromptSchema.index({ userId: 1, createdAt: -1 });
PromptSchema.index({ userId: 1, isArchived: 1 });
PromptSchema.index({ userId: 1, isFavorite: 1 });
PromptSchema.index({ 'targetModel.provider': 1 });
PromptSchema.index({ messageRole: 1 });
PromptSchema.index({ tags: 1 });
PromptSchema.index({ title: 'text', description: 'text' }); // 文本搜索索引