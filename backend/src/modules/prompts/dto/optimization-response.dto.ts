import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImprovementDto {
  @ApiProperty({ description: '改进类型', example: 'clarity' })
  type: string;

  @ApiProperty({ description: '改进描述', example: '增加了具体的字段要求' })
  description: string;

  @ApiProperty({ description: '影响程度', example: 'high', enum: ['low', 'medium', 'high'] })
  impact: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: '修改前的文本', example: '请帮我写一个SQL' })
  before?: string;

  @ApiPropertyOptional({ description: '修改后的文本', example: '请帮我写一个查询用户信息的SQL语句' })
  after?: string;
}

export class SuggestionDto {
  @ApiProperty({ description: '建议ID', example: 'sug-001' })
  id: string;

  @ApiProperty({ description: '建议类型', example: 'specificity' })
  type: string;

  @ApiProperty({ description: '建议标题', example: '增加具体要求' })
  title: string;

  @ApiProperty({ description: '建议描述', example: '建议明确指定需要查询的字段和排序方式' })
  description: string;

  @ApiProperty({ description: '优先级', example: 'high', enum: ['low', 'medium', 'high'] })
  priority: 'low' | 'medium' | 'high';

  @ApiProperty({ description: '是否可应用', example: true })
  applicable: boolean;
}

export class TokenEstimateDto {
  @ApiProperty({ description: '原始token数', example: 15 })
  original: number;

  @ApiProperty({ description: '优化后token数', example: 25 })
  optimized: number;

  @ApiProperty({ description: '节省的token数', example: -10 })
  savings: number;

  @ApiPropertyOptional({ 
    description: '成本信息',
    properties: {
      original: { type: 'number', description: '原始成本' },
      optimized: { type: 'number', description: '优化后成本' },
      currency: { type: 'string', description: '货币单位' }
    }
  })
  cost?: {
    original: number;
    optimized: number;
    currency: string;
  };
}

export class OptimizationResultDto {
  @ApiProperty({ description: '优化结果ID', example: '507f1f77bcf86cd799439012' })
  id: string;

  @ApiProperty({ description: '原始提示词', example: '请帮我写一个查询用户信息的SQL' })
  originalPrompt: string;

  @ApiProperty({ description: '优化后的提示词', example: '请帮我写一个查询用户信息的SQL语句，要求包含用户ID、姓名、邮箱字段，并按创建时间降序排列' })
  optimizedPrompt: string;

  @ApiProperty({ description: '改进列表', type: [ImprovementDto] })
  improvements: ImprovementDto[];

  @ApiProperty({ description: '优化置信度', example: 0.95, minimum: 0, maximum: 1 })
  confidence: number;

  @ApiProperty({ description: '应用的规则列表', example: ['clarity', 'specificity'], type: [String] })
  appliedRules: string[];

  @ApiProperty({ description: '建议列表', type: [SuggestionDto] })
  suggestions: SuggestionDto[];

  @ApiPropertyOptional({ description: 'Token估算信息', type: TokenEstimateDto })
  estimatedTokens?: TokenEstimateDto;
}

export class StreamOptimizationResponseDto {
  @ApiProperty({ description: '响应消息', example: 'Optimization started' })
  message: string;

  @ApiProperty({ description: 'SSE会话ID', example: 'sse-session-123456' })
  sessionId: string;

  @ApiProperty({ description: '处理状态', example: 'processing' })
  status: string;
}