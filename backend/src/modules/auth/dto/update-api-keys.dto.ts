import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateApiKeysDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  openai?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  anthropic?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  deepseek?: string;
}