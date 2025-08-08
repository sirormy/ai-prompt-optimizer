import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ServiceRegistryService.name);
  private readonly services = new Map<string, any>();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing service registry...');
    await this.registerServices();
    this.logger.log(`Service registry initialized with ${this.services.size} services`);
  }

  private async registerServices() {
    // Register core services
    this.services.set('config', this.configService);
    
    // Log registered services
    this.logger.log('Registered services:');
    for (const [name] of this.services) {
      this.logger.log(`  - ${name}`);
    }
  }

  getService<T>(name: string): T | undefined {
    return this.services.get(name);
  }

  registerService(name: string, service: any): void {
    this.services.set(name, service);
    this.logger.log(`Service registered: ${name}`);
  }

  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}