import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsNumber, Min, Max } from 'class-validator';

export class RAGQueryDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  targetModel?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  includeExamples?: boolean;
}

export class OptimizationContextDto {
  @IsString()
  originalPrompt: string;

  @IsOptional()
  @IsString()
  targetModel?: string;

  @IsOptional()
  userPreferences?: {
    @IsEnum(['basic', 'advanced', 'expert'])
    optimizationLevel: 'basic' | 'advanced' | 'expert';

    @IsBoolean()
    includeExplanations: boolean;
  };
}

export class BestPracticeDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsOptional()
  @IsString()
  source?: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  priority: number;
}

export class SearchBestPracticesDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number;
}