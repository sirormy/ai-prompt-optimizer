import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { VectorStoreService } from './vector-store.service';
import { EmbeddingService } from './embedding.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { RAGController } from './rag.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    RAGService,
    VectorStoreService,
    EmbeddingService,
    KnowledgeBaseService,
  ],
  controllers: [RAGController],
  exports: [RAGService, KnowledgeBaseService],
})
export class RAGModule {}