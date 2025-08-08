import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseHealthService } from './database/database-health.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly databaseHealthService: DatabaseHealthService,
  ) {}

  @Get()
  getHello(): object {
    this.logger.log('Root endpoint accessed');
    return {
      message: this.appService.getHello(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'running',
    };
  }

  @Get('health')
  async getHealth() {
    this.logger.log('Health check requested');
    return await this.databaseHealthService.getOverallHealth();
  }

  @Get('health/mongodb')
  async getMongoHealth() {
    this.logger.log('MongoDB health check requested');
    return await this.databaseHealthService.checkMongoHealth();
  }

  @Get('health/redis')
  async getRedisHealth() {
    this.logger.log('Redis health check requested');
    return await this.databaseHealthService.checkRedisHealth();
  }
}