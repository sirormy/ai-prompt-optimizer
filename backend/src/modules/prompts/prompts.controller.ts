import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { PromptsService } from './prompts.service';
import {
  CreatePromptDto,
  UpdatePromptDto,
  CreateVersionDto,
  PromptQueryDto,
  OptimizationRequestDto,
  PromptResponseDto,
  PaginatedPromptsResponseDto,
  UserStatsResponseDto,
  OptimizationResultDto,
  StreamOptimizationResponseDto
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SSEService } from '../sse/sse.service';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { CacheEvictInterceptor } from '../../common/interceptors/cache-evict.interceptor';
import { Cache, CacheEvict } from '../../common/decorators/cache.decorator';

@ApiTags('prompts')
@Controller('prompts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PromptsController {
  constructor(
    private readonly promptsService: PromptsService,
    private readonly sseService: SSEService,
  ) { }

  @Post()
  @UseInterceptors(CacheEvictInterceptor)
  @CacheEvict(['prompts', 'user-stats'])
  @ApiOperation({
    summary: '创建新的提示词',
    description: '创建一个新的提示词记录，包含原始文本、目标模型等信息'
  })
  @ApiBody({
    type: CreatePromptDto,
    description: '创建提示词的请求数据'
  })
  @ApiCreatedResponse({
    description: '提示词创建成功',
    type: PromptResponseDto
  })
  @ApiBadRequestResponse({ description: '请求参数错误' })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async createPrompt(@Body() createPromptDto: CreatePromptDto, @Request() req: any) {
    return this.promptsService.create({
      ...createPromptDto,
      userId: req.user.id,
    });
  }

  @Post('optimize')
  @ApiOperation({
    summary: '优化提示词',
    description: '使用AI模型对提示词进行优化，返回优化结果和改进建议'
  })
  @ApiBody({
    type: OptimizationRequestDto,
    description: '优化请求数据'
  })
  @ApiOkResponse({
    description: '优化成功',
    type: OptimizationResultDto
  })
  @ApiBadRequestResponse({ description: '请求参数错误' })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async optimizePrompt(
    @Body() optimizationRequest: OptimizationRequestDto,
    @Request() req,
  ) {
    return this.promptsService.optimizePrompt({
      ...optimizationRequest,
      userId: req.user.id,
    });
  }

  @Post('optimize/rag')
  @ApiOperation({
    summary: 'RAG增强的提示词优化',
    description: '使用RAG知识库增强的AI模型对提示词进行优化，提供更专业的优化建议'
  })
  @ApiBody({
    type: OptimizationRequestDto,
    description: '优化请求数据'
  })
  @ApiOkResponse({
    description: 'RAG增强优化成功',
    type: OptimizationResultDto
  })
  @ApiBadRequestResponse({ description: '请求参数错误' })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async optimizePromptWithRAG(
    @Body() optimizationRequest: OptimizationRequestDto,
    @Request() req,
  ) {
    return this.promptsService.optimizePromptWithRAG({
      ...optimizationRequest,
      userId: req.user.id,
    });
  }

  @Post('optimize/stream')
  @ApiOperation({
    summary: '实时优化提示词',
    description: '使用SSE实时推送优化进度，需要先建立SSE连接'
  })
  @ApiBody({
    description: '优化请求数据（包含sessionId）',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/OptimizationRequestDto' },
        {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'SSE会话ID',
              example: 'sse-session-123456'
            }
          },
          required: ['sessionId']
        }
      ]
    }
  })
  @ApiOkResponse({
    description: '优化任务已启动',
    type: StreamOptimizationResponseDto
  })
  @ApiBadRequestResponse({ description: '会话无效或请求参数错误' })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async optimizePromptWithSSE(
    @Body() optimizationRequest: OptimizationRequestDto & { sessionId: string },
    @Request() req,
  ) {
    const { sessionId, ...request } = optimizationRequest;

    // 验证会话是否存在且活跃
    if (!this.sseService.isSessionActive(sessionId)) {
      return {
        error: 'Invalid or inactive session',
        message: 'Please establish an SSE connection first',
      };
    }

    // 异步执行优化，通过SSE推送进度
    this.promptsService.optimizePromptWithSSE({
      ...request,
      userId: req.user.id,
    }, sessionId, this.sseService).catch(error => {
      // 发送错误到SSE流
      this.sseService.sendError(sessionId, {
        code: 'OPTIMIZATION_ERROR',
        message: error.message || 'Optimization failed',
        details: error,
        recoverable: true,
      });
    });

    return {
      message: 'Optimization started',
      sessionId,
      status: 'processing',
    };
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 600, tags: ['prompts'] })
  @ApiOperation({
    summary: '获取用户的提示词列表',
    description: '分页获取当前用户的所有提示词，支持搜索和过滤'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码，从1开始' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量，默认10' })
  @ApiQuery({ name: 'search', required: false, type: String, description: '搜索关键词' })
  @ApiQuery({ name: 'targetModel', required: false, type: String, description: '目标模型过滤' })
  @ApiOkResponse({
    description: '获取成功',
    type: PaginatedPromptsResponseDto
  })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async findUserPrompts(
    @Request() req: any,
    @Query() queryDto: PromptQueryDto,
  ) {
    return this.promptsService.findByUserId(req.user.id, queryDto);
  }

  @Get('stats')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 900, tags: ['user-stats'] })
  @ApiOperation({
    summary: '获取用户统计信息',
    description: '获取当前用户的提示词统计数据'
  })
  @ApiOkResponse({
    description: '统计信息获取成功',
    type: UserStatsResponseDto
  })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async getUserStats(@Request() req: any) {
    return this.promptsService.getUserStats(req.user.id);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 1800, tags: ['prompt-detail'] })
  @ApiOperation({
    summary: '获取单个提示词详情',
    description: '根据ID获取提示词的详细信息'
  })
  @ApiParam({ name: 'id', description: '提示词ID' })
  @ApiOkResponse({
    description: '获取成功',
    type: PromptResponseDto
  })
  @ApiNotFoundResponse({ description: '提示词不存在' })
  @ApiUnauthorizedResponse({ description: '未授权访问' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.promptsService.findOneByUserAndId(req.user.id, id);
  }

  @Put(':id')
  @UseInterceptors(CacheEvictInterceptor)
  @CacheEvict(['prompts', 'prompt-detail', 'user-stats'])
  async updatePrompt(
    @Param('id') id: string,
    @Body() updatePromptDto: UpdatePromptDto,
    @Request() req: any,
  ) {
    return this.promptsService.update(req.user.id, id, updatePromptDto);
  }

  @Delete(':id')
  async removePrompt(@Param('id') id: string, @Request() req) {
    await this.promptsService.remove(req.user.id, id);
    return { message: 'Prompt deleted successfully' };
  }

  @Delete()
  async removeBatchPrompts(
    @Body('ids') ids: string[],
    @Request() req,
  ) {
    const result = await this.promptsService.removeBatch(req.user.id, ids);
    return { message: `${result.deletedCount} prompts deleted successfully` };
  }

  // Version management endpoints
  @Post(':id/versions')
  async createVersion(
    @Param('id') id: string,
    @Body() createVersionDto: CreateVersionDto,
    @Request() req,
  ) {
    return this.promptsService.createVersion(req.user.id, id, createVersionDto);
  }

  @Get(':id/versions')
  async getVersionHistory(@Param('id') id: string, @Request() req) {
    return this.promptsService.getVersionHistory(req.user.id, id);
  }

  @Get(':id/versions/compare')
  async compareVersions(
    @Param('id') id: string,
    @Query('v1', ParseIntPipe) version1: number,
    @Query('v2', ParseIntPipe) version2: number,
    @Request() req,
  ) {
    return this.promptsService.compareVersions(req.user.id, id, version1, version2);
  }

  @Post(':id/versions/:version/revert')
  async revertToVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req,
  ) {
    return this.promptsService.revertToVersion(req.user.id, id, version);
  }
}