import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ description: 'SSE会话ID', example: 'sse-session-123456' })
  sessionId: string;
}

export class SessionStatusResponseDto {
  @ApiProperty({ description: '会话是否活跃', example: true })
  active: boolean;

  @ApiProperty({ description: 'SSE会话ID', example: 'sse-session-123456' })
  sessionId: string;
}

export class CloseSessionResponseDto {
  @ApiProperty({ description: '响应消息', example: 'Session closed successfully' })
  message: string;
}

export class SessionStatsResponseDto {
  @ApiProperty({ description: '总活跃会话数', example: 5 })
  total: number;

  @ApiProperty({ 
    description: '按用户分组的会话数',
    example: { 'user1': 2, 'user2': 3 },
    additionalProperties: { type: 'number' }
  })
  byUser: Record<string, number>;
}

export class SSEEventDto {
  @ApiProperty({ description: '事件类型', example: 'progress', enum: ['progress', 'result', 'error', 'complete'] })
  type: 'progress' | 'result' | 'error' | 'complete';

  @ApiProperty({ description: '事件数据' })
  data: any;

  @ApiProperty({ description: '时间戳', example: 1640995200000 })
  timestamp: number;

  @ApiProperty({ description: 'SSE会话ID', example: 'sse-session-123456' })
  sessionId: string;
}

export class OptimizationProgressDto {
  @ApiProperty({ description: '优化阶段', example: 'analyzing', enum: ['analyzing', 'optimizing', 'validating', 'formatting', 'complete'] })
  stage: 'analyzing' | 'optimizing' | 'validating' | 'formatting' | 'complete';

  @ApiProperty({ description: '完成百分比', example: 25, minimum: 0, maximum: 100 })
  percentage: number;

  @ApiProperty({ description: '进度消息', example: '正在分析提示词结构...' })
  message: string;

  @ApiPropertyOptional({ description: '当前步骤', example: '解析提示词组件' })
  currentStep?: string;

  @ApiPropertyOptional({ description: '详细信息' })
  details?: any;
}

export class OptimizationErrorDto {
  @ApiProperty({ description: '错误代码', example: 'OPTIMIZATION_FAILED' })
  code: string;

  @ApiProperty({ description: '错误消息', example: '优化过程中发生意外错误' })
  message: string;

  @ApiPropertyOptional({ description: '错误详情' })
  details?: any;

  @ApiProperty({ description: '是否可恢复', example: true })
  recoverable: boolean;
}