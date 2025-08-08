import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
    
    const configService = app.get(ConfigService);

    // 全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // 全局前缀
    app.setGlobalPrefix('api', {
      exclude: ['health', '/', 'docs', 'docs-json'],
    });

    // 配置 Swagger 文档
    const config = new DocumentBuilder()
      .setTitle('AI提示词优化工具 API')
      .setDescription('AI提示词优化工具的后端API文档，提供提示词优化、管理和实时通信功能')
      .setVersion('1.0.0')
      .addTag('auth', '用户认证相关接口')
      .addTag('prompts', '提示词管理相关接口')
      .addTag('models', 'AI模型管理相关接口')
      .addTag('sse', '实时通信相关接口')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer('http://localhost:3001', '开发环境')
      .addServer('https://api.example.com', '生产环境')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'AI提示词优化工具 API 文档',
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6 }
      `,
    });

    // 启用关闭钩子
    app.enableShutdownHooks();

    const port = configService.get('PORT', 3001);
    const host = configService.get('HOST', '127.0.0.1');
    
    await app.listen(port, host);
    
    logger.log(`🚀 AI提示词优化工具后端服务启动成功`);
    logger.log(`📍 服务地址: http://${host}:${port}`);
    logger.log(`📋 API文档: http://${host}:${port}/docs`);
    logger.log(`�  API JSON: http://${host}:${port}/docs-json`);
    logger.log(`💚 健康检查: http://${host}:${port}/health`);
    
  } catch (error) {
    logger.error('应用启动失败:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});