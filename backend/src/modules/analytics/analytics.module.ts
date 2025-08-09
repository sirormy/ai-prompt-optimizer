import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { DatabaseOptimizationService } from '../database/database-optimization.service';

@Module({
  controllers: [AnalyticsController],
  providers: [DatabaseOptimizationService],
  exports: [DatabaseOptimizationService],
})
export class AnalyticsModule {}