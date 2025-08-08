import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { ModelsModule } from './modules/models/models.module';
import { SSEModule } from './modules/sse/sse.module';
import { ServiceRegistryService } from './common/services/service-registry.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig, redisConfig],
    }),
    
    // 数据库模块
    DatabaseModule,
    
    // Redis模块
    RedisModule,
    
    // 业务模块
    AuthModule,
    PromptsModule,
    ModelsModule,
    SSEModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ServiceRegistryService,
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorsMiddleware, LoggerMiddleware)
      .forRoutes('*');
  }
}