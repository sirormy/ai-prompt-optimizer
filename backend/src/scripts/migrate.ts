#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MigrationService } from '../database/migration.service';

async function runMigrations() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(MigrationService);

  try {
    console.log('Starting database migrations...');
    await migrationService.runMigrations();
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

async function rollbackMigrations() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(MigrationService);

  try {
    console.log('Starting database rollback...');
    await migrationService.rollbackMigrations();
    console.log('Rollback completed successfully!');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

const command = process.argv[2];

if (command === 'up') {
  runMigrations();
} else if (command === 'down') {
  rollbackMigrations();
} else {
  console.log('Usage: npm run migrate [up|down]');
  process.exit(1);
}