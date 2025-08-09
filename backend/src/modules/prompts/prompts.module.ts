import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';
import { Prompt, PromptSchema } from '../../schemas/prompt.schema';
import { OptimizationRule, OptimizationRuleSchema } from '../../schemas/optimization-rule.schema';
import { PromptOptimizationService } from './services/prompt-optimization.service';
import { PromptAnalysisService } from './services/prompt-analysis.service';
import { OptimizationRulesEngine } from './services/optimization-rules-engine.service';
import { BestPracticesService } from './services/best-practices.service';
import { ModelsModule } from '../models/models.module';
import { SSEModule } from '../sse/sse.module';
import { RAGModule } from '../rag/rag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Prompt.name, schema: PromptSchema },
      { name: OptimizationRule.name, schema: OptimizationRuleSchema },
    ]),
    ModelsModule,
    SSEModule,
    RAGModule,
  ],
  controllers: [PromptsController],
  providers: [
    PromptsService,
    PromptOptimizationService,
    PromptAnalysisService,
    OptimizationRulesEngine,
    BestPracticesService,
  ],
  exports: [
    PromptsService,
    PromptOptimizationService,
    PromptAnalysisService,
    OptimizationRulesEngine,
    BestPracticesService,
  ],
})
export class PromptsModule {}