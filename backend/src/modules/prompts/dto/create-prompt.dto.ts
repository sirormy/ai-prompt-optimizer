import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export enum AIModel {
  OPENAI_GPT4 = 'openai-gpt4',
  OPENAI_GPT35 = 'openai-gpt3.5',
  CLAUDE_3_OPUS = 'claude-3-opus',
  CLAUDE_3_SONNET = 'claude-3-sonnet',
  DEEPSEEK_CHAT = 'deepseek-chat',
}

export class CreatePromptDto {
  @ApiProperty({
    description: '提示词标题',
    example: '用户查询优化提示词',
    minLength: 1,
    maxLength: 200
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '原始提示词文本',
    example: '请帮我写一个查询用户信息的SQL',
    minLength: 1,
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  originalText: string;

  @ApiPropertyOptional({
    description: '优化后的提示词文本（可选）',
    example: '请帮我写一个查询用户信息的SQL语句，要求包含用户ID、姓名、邮箱字段',
    maxLength: 5000
  })
  @IsString()
  @IsOptional()
  optimizedText?: string;

  @ApiProperty({
    description: '目标AI模型',
    enum: AIModel,
    example: AIModel.OPENAI_GPT4
  })
  @IsEnum(AIModel)
  targetModel: AIModel;

  @ApiProperty({
    description: '消息角色类型',
    enum: MessageRole,
    example: MessageRole.USER
  })
  @IsEnum(MessageRole)
  messageRole: MessageRole;

  @ApiPropertyOptional({
    description: '系统提示词（可选）',
    example: '你是一个专业的SQL开发助手',
    maxLength: 2000
  })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiPropertyOptional({
    description: '提示词描述',
    example: '用于生成用户信息查询SQL的提示词',
    maxLength: 500
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '标签列表',
    example: ['SQL', '查询', '用户管理'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}