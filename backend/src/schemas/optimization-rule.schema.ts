import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OptimizationRuleDocument = OptimizationRule & Document;

@Schema({
  collection: 'optimization_rules',
  timestamps: true,
})
export class OptimizationRule {
  @Prop({ required: true })
  name: string; // 规则名称

  @Prop({ required: true })
  description: string; // 规则描述

  @Prop({ required: true })
  category: string; // 规则分类（clarity/context/format/examples等）

  @Prop([{ type: String }])
  applicableModels: string[]; // 适用的AI模型列表

  @Prop({
    type: {
      pattern: { type: String, required: true },
      replacement: { type: String, required: true },
      condition: { type: String, default: '' },
    },
    required: true,
  })
  ruleLogic: {
    pattern: string; // 匹配模式（正则表达式）
    replacement: string; // 替换模板
    condition: string; // 应用条件
  };

  @Prop({ required: true, min: 1, max: 10 })
  priority: number; // 规则优先级（1-10，数字越大优先级越高）

  @Prop({ default: true })
  isActive: boolean; // 规则是否激活
}

export const OptimizationRuleSchema = SchemaFactory.createForClass(OptimizationRule);

// 创建索引
OptimizationRuleSchema.index({ category: 1, priority: -1 });
OptimizationRuleSchema.index({ applicableModels: 1 });
OptimizationRuleSchema.index({ isActive: 1 });