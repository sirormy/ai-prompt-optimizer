import { IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn(['openai', 'claude', 'deepseek'])
  defaultModel?: string;

  @IsOptional()
  @IsString()
  @IsIn(['basic', 'advanced', 'expert'])
  optimizationLevel?: string;

  @IsOptional()
  @IsBoolean()
  autoSave?: boolean;
}