import { IsString, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { MessageRole, AIModel } from './create-prompt.dto';

export class UpdatePromptDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  optimizedText?: string;

  @IsEnum(AIModel)
  @IsOptional()
  targetModel?: AIModel;

  @IsEnum(MessageRole)
  @IsOptional()
  messageRole?: MessageRole;

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}