import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TargetModelDto {
  @ApiProperty({ description: '模型ID', example: 'openai-gpt4' })
  id: string;

  @ApiProperty({ description: '模型名称', example: 'GPT-4' })
  name: string;

  @ApiProperty({ description: '模型提供商', example: 'openai' })
  provider: string;

  @ApiPropertyOptional({ description: '模型版本', example: 'gpt-4-0613' })
  version?: string;
}

export class PromptVersionDto {
  @ApiProperty({ description: '版本号', example: 1 })
  version: number;

  @ApiProperty({ description: '版本文本', example: '请帮我写一个查询用户信息的SQL' })
  text: string;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiPropertyOptional({ description: '变更描述', example: 'Initial version' })
  changeDescription?: string;
}

export class OptimizationImprovementDto {
  @ApiProperty({ description: '改进类型', example: 'clarity' })
  type: string;

  @ApiProperty({ description: '改进描述', example: '增加了具体的字段要求' })
  description: string;

  @ApiProperty({ description: '影响程度', example: 'high', enum: ['low', 'medium', 'high'] })
  impact: string;

  @ApiPropertyOptional({ description: '具体建议', example: '建议明确指定需要查询的字段' })
  suggestion?: string;
}

export class OptimizationMetadataDto {
  @ApiProperty({ description: '应用的优化规则', example: ['clarity', 'specificity'], type: [String] })
  appliedRules: string[];

  @ApiProperty({ description: '优化置信度', example: 0.95, minimum: 0, maximum: 1 })
  confidence: number;

  @ApiProperty({ description: '改进列表', type: [OptimizationImprovementDto] })
  improvements: OptimizationImprovementDto[];

  @ApiProperty({ description: '优化时间', example: '2024-01-01T00:00:00.000Z' })
  optimizedAt: string;

  @ApiPropertyOptional({ description: '优化级别', example: 'basic' })
  optimizationLevel?: string;
}

export class PromptResponseDto {
  @ApiProperty({ description: '提示词ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: '用户ID', example: '507f1f77bcf86cd799439010' })
  userId: string;

  @ApiProperty({ description: '提示词标题', example: '用户查询优化提示词' })
  title: string;

  @ApiProperty({ description: '原始提示词文本', example: '请帮我写一个查询用户信息的SQL' })
  originalText: string;

  @ApiProperty({ description: '优化后的提示词文本', example: '请帮我写一个查询用户信息的SQL语句，要求包含用户ID、姓名、邮箱字段' })
  optimizedText: string;

  @ApiProperty({ description: '目标模型信息', type: TargetModelDto })
  targetModel: TargetModelDto;

  @ApiProperty({ description: '消息角色', example: 'user', enum: ['system', 'user', 'assistant'] })
  messageRole: string;

  @ApiPropertyOptional({ description: '系统提示词', example: '你是一个专业的SQL开发助手' })
  systemPrompt?: string;

  @ApiProperty({ description: '优化元数据', type: OptimizationMetadataDto })
  optimizationMetadata: OptimizationMetadataDto;

  @ApiProperty({ description: '版本历史', type: [PromptVersionDto] })
  versions: PromptVersionDto[];

  @ApiProperty({ description: '当前版本号', example: 1 })
  currentVersion: number;

  @ApiPropertyOptional({ description: '描述', example: '用于生成用户信息查询SQL的提示词' })
  description?: string;

  @ApiPropertyOptional({ description: '标签列表', example: ['SQL', '查询', '用户管理'], type: [String] })
  tags?: string[];

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class PaginatedPromptsResponseDto {
  @ApiProperty({ description: '提示词列表', type: [PromptResponseDto] })
  data: PromptResponseDto[];

  @ApiProperty({ description: '总数量', example: 25 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  limit: number;

  @ApiProperty({ description: '总页数', example: 3 })
  totalPages: number;
}

export class UserStatsResponseDto {
  @ApiProperty({ description: '总提示词数', example: 25 })
  totalPrompts: number;

  @ApiProperty({ description: '已优化提示词数', example: 20 })
  optimizedPrompts: number;

  @ApiProperty({ description: '总优化次数', example: 35 })
  totalOptimizations: number;

  @ApiProperty({ description: '平均置信度', example: 0.87, minimum: 0, maximum: 1 })
  averageConfidence: number;

  @ApiProperty({ 
    description: '模型使用统计', 
    example: { 'openai-gpt4': 15, 'anthropic-claude': 8, 'deepseek-chat': 2 },
    additionalProperties: { type: 'number' }
  })
  modelUsage: Record<string, number>;

  @ApiProperty({ 
    description: '最近活动统计',
    example: { thisWeek: 5, thisMonth: 18 },
    properties: {
      thisWeek: { type: 'number', description: '本周活动数' },
      thisMonth: { type: 'number', description: '本月活动数' }
    }
  })
  recentActivity: {
    thisWeek: number;
    thisMonth: number;
  };
}