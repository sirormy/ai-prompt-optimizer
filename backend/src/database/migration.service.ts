import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';
import { up as createIndexes, down as dropIndexes } from './migrations/001-create-indexes';
import { seedOptimizationRules } from './seeds/optimization-rules.seed';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly configService: ConfigService) {}

  async runMigrations(): Promise<void> {
    const mongoUri = this.configService.get<string>('database.mongodb.uri');
    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      this.logger.log('Connected to MongoDB for migrations');

      // 运行迁移
      await this.runMigration001(client);

      // 运行种子数据
      await this.runSeeds(client);

      this.logger.log('All migrations completed successfully');
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    } finally {
      await client.close();
    }
  }

  private async runMigration001(client: MongoClient): Promise<void> {
    try {
      this.logger.log('Running migration 001: Create Indexes');
      await createIndexes(client);
      this.logger.log('Migration 001 completed');
    } catch (error) {
      this.logger.error('Migration 001 failed:', error);
      throw error;
    }
  }

  private async runSeeds(client: MongoClient): Promise<void> {
    try {
      this.logger.log('Running seed data');
      await seedOptimizationRules(client);
      this.logger.log('Seed data completed');
    } catch (error) {
      this.logger.error('Seed data failed:', error);
      throw error;
    }
  }

  async rollbackMigrations(): Promise<void> {
    const mongoUri = this.configService.get<string>('database.mongodb.uri');
    const client = new MongoClient(mongoUri);

    try {
      await client.connect();
      this.logger.log('Connected to MongoDB for rollback');

      await this.rollbackMigration001(client);

      this.logger.log('All rollbacks completed successfully');
    } catch (error) {
      this.logger.error('Rollback failed:', error);
      throw error;
    } finally {
      await client.close();
    }
  }

  private async rollbackMigration001(client: MongoClient): Promise<void> {
    try {
      this.logger.log('Rolling back migration 001: Drop Indexes');
      await dropIndexes(client);
      this.logger.log('Rollback 001 completed');
    } catch (error) {
      this.logger.error('Rollback 001 failed:', error);
      throw error;
    }
  }
}