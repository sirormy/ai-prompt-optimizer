import { Module } from '@nestjs/common';
import { SSEService } from './sse.service';
import { SSEController } from './sse.controller';

@Module({
  controllers: [SSEController],
  providers: [SSEService],
  exports: [SSEService],
})
export class SSEModule {}