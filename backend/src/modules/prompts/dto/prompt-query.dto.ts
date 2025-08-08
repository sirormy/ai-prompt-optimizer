import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max, IsEnum, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
  VIEW_COUNT = 'viewCount',
  LAST_VIEWED_AT = 'lastViewedAt',
}

export class PromptQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string; // 搜索关键词

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  tags?: string[]; // 标签过滤

  @IsOptional()
  @IsString()
  provider?: string; // 模型提供商过滤

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isFavorite?: boolean; // 只显示收藏

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isArchived?: boolean; // 是否显示归档

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}