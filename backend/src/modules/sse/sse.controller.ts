import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SSEService } from './sse.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';
import {
  SessionResponseDto,
  SessionStatusResponseDto,
  CloseSessionResponseDto,
  SessionStatsResponseDto
} from './dto/sse-response.dto';

@ApiTags('sse')
@Controller('sse')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SSEController {
  constructor(private readonly sseService: SSEService) {}

  /**
   * 创建SSE连接用于优化进度推送
   */
  @Get('optimization/:sessionId')
  @ApiOperation({ 
    summary: '创建SSE连接',
    description: '建立Server-Sent Events连接，用于实时接收优化进度推送'
  })
  @ApiParam({ 
    name: 'sessionId', 
    description: 'SSE会话ID，需要先通过POST /sse/session获取',
    example: 'sse-session-123456'
  })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ 
    description: 'SSE连接建立成功，开始推送事件流',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: 'data: {"type":"progress","data":{"stage":"analyzing","percentage":25,"message":"分析提示词结构..."},"timestamp":1640995200000,"sessionId":"sse-session-123456"}\n\n'
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: '会话ID无效' })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async createOptimizationStream(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    // 验证sessionId格式
    if (!sessionId || sessionId.length < 10) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Invalid session ID',
        message: 'Session ID must be provided and valid',
      });
      return;
    }

    const userId = req.user.id;
    
    // 创建SSE连接
    this.sseService.createConnection(sessionId, userId, res);
  }

  /**
   * 生成新的会话ID
   */
  @Post('session')
  @ApiOperation({ 
    summary: '创建新的SSE会话',
    description: '生成一个新的会话ID，用于建立SSE连接'
  })
  @ApiOkResponse({ 
    description: '会话创建成功',
    type: SessionResponseDto
  })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async createSession(@Request() req): Promise<{ sessionId: string }> {
    const sessionId = uuidv4();
    return { sessionId };
  }

  /**
   * 手动关闭指定会话
   */
  @Delete('session/:sessionId')
  @ApiOperation({ 
    summary: '关闭指定SSE会话',
    description: '手动关闭指定的SSE连接会话'
  })
  @ApiParam({ 
    name: 'sessionId', 
    description: 'SSE会话ID',
    example: 'sse-session-123456'
  })
  @ApiOkResponse({ 
    description: '会话关闭成功',
    type: CloseSessionResponseDto
  })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async closeSession(
    @Param('sessionId') sessionId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    this.sseService.closeConnection(sessionId);
    return { message: 'Session closed successfully' };
  }

  /**
   * 关闭用户的所有会话
   */
  @Delete('sessions')
  async closeAllUserSessions(@Request() req): Promise<{ message: string }> {
    const userId = req.user.id;
    this.sseService.closeUserSessions(userId);
    return { message: 'All user sessions closed successfully' };
  }

  /**
   * 获取活跃会话统计（仅管理员）
   */
  @Get('stats')
  async getSessionStats(@Request() req) {
    // 这里可以添加管理员权限检查
    return this.sseService.getActiveSessionsStats();
  }

  /**
   * 检查会话状态
   */
  @Get('session/:sessionId/status')
  async getSessionStatus(
    @Param('sessionId') sessionId: string,
    @Request() req,
  ): Promise<{ active: boolean; sessionId: string }> {
    const active = this.sseService.isSessionActive(sessionId);
    return { active, sessionId };
  }

  /**
   * 测试SSE连接（开发用）
   */
  @Get('test/:sessionId')
  async testSSEConnection(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user.id;
    
    // 创建测试连接
    this.sseService.createConnection(sessionId, userId, res);

    // 发送测试事件
    setTimeout(() => {
      this.sseService.sendProgress(sessionId, {
        stage: 'analyzing',
        percentage: 25,
        message: 'Test progress event',
        currentStep: 'Testing SSE connection',
      });
    }, 1000);

    setTimeout(() => {
      this.sseService.sendProgress(sessionId, {
        stage: 'optimizing',
        percentage: 50,
        message: 'Another test progress event',
        currentStep: 'Testing progress updates',
      });
    }, 2000);

    setTimeout(() => {
      this.sseService.sendProgress(sessionId, {
        stage: 'validating',
        percentage: 75,
        message: 'Final test progress event',
        currentStep: 'Testing completion',
      });
    }, 3000);

    setTimeout(() => {
      this.sseService.sendComplete(sessionId, {
        message: 'Test completed successfully',
        testData: { timestamp: new Date().toISOString() },
      });
    }, 4000);
  }
}