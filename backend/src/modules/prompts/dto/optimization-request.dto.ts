import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIModel, MessageRole } from './create-prompt.dto';

export enum OptimizationLevel {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export class OptimizationRequestDto {
  @ApiProperty({
    description: '需要优化的提示词文本',
    example: '请帮我写一个查询用户信息的SQL',
    minLength: 1,
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

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
    description: '优化级别',
    enum: OptimizationLevel,
    example: OptimizationLevel.BASIC,
    default: OptimizationLevel.BASIC
  })
  @IsEnum(OptimizationLevel)
  @IsOptional()
  optimizationLevel?: OptimizationLevel = OptimizationLevel.BASIC;
}