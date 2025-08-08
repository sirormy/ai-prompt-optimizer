import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User {
  @Prop({ required: true })
  email: string; // 用户邮箱地址，唯一标识

  @Prop({ required: true })
  password: string; // 加密后的密码

  @Prop({
    type: {
      defaultModel: { type: String, default: 'openai' },
      optimizationLevel: { type: String, default: 'basic' },
      autoSave: { type: Boolean, default: true },
    },
    default: {},
  })
  preferences: {
    defaultModel: string; // 默认使用的AI模型
    optimizationLevel: string; // 优化级别：basic/advanced/expert
    autoSave: boolean; // 是否自动保存优化结果
  };

  @Prop({
    type: {
      openai: { type: String, default: '' },
      anthropic: { type: String, default: '' },
      deepseek: { type: String, default: '' },
    },
    default: {},
  })
  apiKeys: {
    openai: string; // OpenAI API密钥
    anthropic: string; // Anthropic API密钥
    deepseek: string; // DeepSeek API密钥
  };

  @Prop({
    type: {
      totalOptimizations: { type: Number, default: 0 },
      monthlyUsage: { type: Number, default: 0 },
      lastUsed: { type: Date, default: Date.now },
    },
    default: {},
  })
  usage: {
    totalOptimizations: number; // 总优化次数
    monthlyUsage: number; // 本月使用次数
    lastUsed: Date; // 最后使用时间
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

// 创建索引
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ 'usage.lastUsed': -1 });