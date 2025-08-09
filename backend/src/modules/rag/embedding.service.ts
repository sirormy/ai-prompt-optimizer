import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;
  private readonly model = 'text-embedding-3-small';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OpenAI API key not configured, using mock embeddings');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.openai) {
        // Return mock embedding for development
        return this.generateMockEmbedding(text);
      }

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);
      // Fallback to mock embedding
      return this.generateMockEmbedding(text);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!this.openai) {
        // Return mock embeddings for development
        return texts.map(text => this.generateMockEmbedding(text));
      }

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      this.logger.error('Failed to generate embeddings:', error);
      // Fallback to mock embeddings
      return texts.map(text => this.generateMockEmbedding(text));
    }
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate a deterministic mock embedding based on text content
    const hash = this.simpleHash(text);
    const embedding = [];
    
    // Generate 1536 dimensions (same as OpenAI text-embedding-3-small)
    for (let i = 0; i < 1536; i++) {
      // Use hash and index to generate pseudo-random but deterministic values
      const value = Math.sin(hash + i) * 0.5;
      embedding.push(value);
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  async calculateSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}