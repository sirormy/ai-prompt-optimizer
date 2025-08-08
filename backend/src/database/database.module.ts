import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from '../schemas/user.schema';
import { Prompt, PromptSchema } from '../schemas/prompt.schema';
import { OptimizationRule, OptimizationRuleSchema } from '../schemas/optimization-rule.schema';
import { DatabaseHealthService } from './database-health.service';
import { MigrationService } from './migration.service';
import { RedisModule } from '../modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodb.uri'),
        ...configService.get('database.mongodb.options'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Prompt.name, schema: PromptSchema },
      { name: OptimizationRule.name, schema: OptimizationRuleSchema },
    ]),
  ],
  providers: [DatabaseHealthService, MigrationService],
  exports: [MongooseModule, DatabaseHealthService, MigrationService],
})
export class DatabaseModule {}