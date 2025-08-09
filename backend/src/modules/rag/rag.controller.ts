import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { RAGService } from './rag.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  RAGQueryDto,
  OptimizationContextDto,
  BestPracticeDto,
  SearchBestPracticesDto,
} from './dto/rag.dto';

// Mock auth guard for now
class AuthGuard {
  canActivate(): boolean {
    return true;
  }
}

@Controller('api/rag')
@UseGuards(AuthGuard)
export class RAGController {
  constructor(
    private ragService: RAGService,
    private knowledgeBaseService: KnowledgeBaseService,
  ) {}

  @Post('enhance')
  @HttpCode(HttpStatus.OK)
  async enhancePrompt(@Body(ValidationPipe) query: RAGQueryDto) {
    try {
      const result = await this.ragService.enhancePromptWithRAG(query);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('suggestions')
  @HttpCode(HttpStatus.OK)
  async generateSuggestions(@Body(ValidationPipe) context: OptimizationContextDto) {
    try {
      const result = await this.ragService.generateOptimizationSuggestions(context);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('best-practices')
  async searchBestPractices(
    @Query('query') query: string,
    @Query('model') model?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const practices = await this.knowledgeBaseService.searchBestPractices(
        query,
        {
          model,
          category,
          limit: limit ? parseInt(limit) : 5,
        },
      );

      return {
        success: true,
        data: practices,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('best-practices')
  @HttpCode(HttpStatus.CREATED)
  async addBestPractice(@Body(ValidationPipe) practice: BestPracticeDto) {
    try {
      await this.knowledgeBaseService.addBestPractice(practice);
      return {
        success: true,
        message: 'Best practice added successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Delete('best-practices/:id')
  @HttpCode(HttpStatus.OK)
  async deleteBestPractice(@Param('id') id: string) {
    try {
      await this.knowledgeBaseService.deleteBestPractice(id);
      return {
        success: true,
        message: 'Best practice deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('health')
  async healthCheck() {
    return {
      success: true,
      message: 'RAG service is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}