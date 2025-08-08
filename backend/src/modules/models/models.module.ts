import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModelsService } from './models.service';

/**
 * 模型管理模块
 * 提供AI模型适配器的管理和配置功能
 */
@Module({
  imports: [ConfigModule],
  providers: [ModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}