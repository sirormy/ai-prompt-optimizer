import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Mock ChromaDB client interface for now
interface ChromaClient {
  createCollection(params: { name: string; metadata?: any }): Promise<Collection>;
  getCollection(params: { name: string }): Promise<Collection>;
  deleteCollection(params: { name: string }): Promise<void>;
}

interface Collection {
  add(params: {
    ids: string[];
    embeddings?: number[][];
    documents?: string[];
    metadatas?: any[];
  }): Promise<void>;
  query(params: {
    queryEmbeddings?: number[][];
    queryTexts?: string[];
    nResults?: number;
    where?: any;
  }): Promise<QueryResult>;
  delete(params: { ids: string[] }): Promise<void>;
}

interface QueryResult {
  ids: string[][];
  distances: number[][];
  documents: string[][];
  metadatas: any[][];
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private client: ChromaClient;
  private collection: Collection;
  private readonly collectionName = 'prompt-best-practices';

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeChroma();
  }

  private async initializeChroma() {
    try {
      // In a real implementation, you would use:
      // const { ChromaApi, Configuration } = require('chromadb');
      // this.client = new ChromaApi(new Configuration({
      //   basePath: this.configService.get('CHROMA_URL', 'http://localhost:8000')
      // }));
      
      // For now, we'll create a mock implementation
      this.client = this.createMockClient();
      
      // Create or get collection
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
        });
        this.logger.log(`Connected to existing collection: ${this.collectionName}`);
      } catch (error) {
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: 'AI prompt optimization best practices and knowledge base',
          },
        });
        this.logger.log(`Created new collection: ${this.collectionName}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize Chroma vector store:', error);
      throw error;
    }
  }

  private createMockClient(): ChromaClient {
    // Mock implementation for development
    const mockData = new Map<string, any>();
    
    return {
      async createCollection({ name, metadata }) {
        const collection = this.createMockCollection(name);
        mockData.set(name, { collection, documents: new Map() });
        return collection;
      },
      
      async getCollection({ name }) {
        const data = mockData.get(name);
        if (!data) {
          throw new Error(`Collection ${name} not found`);
        }
        return data.collection;
      },
      
      async deleteCollection({ name }) {
        mockData.delete(name);
      },
    };
  }

  private createMockCollection(name: string): Collection {
    return {
      async add({ ids, embeddings, documents, metadatas }) {
        const data = mockData.get(name);
        if (data) {
          ids.forEach((id, index) => {
            data.documents.set(id, {
              document: documents?.[index],
              embedding: embeddings?.[index],
              metadata: metadatas?.[index],
            });
          });
        }
      },
      
      async query({ queryEmbeddings, queryTexts, nResults = 5 }) {
        const data = mockData.get(name);
        if (!data) {
          return { ids: [[]], distances: [[]], documents: [[]], metadatas: [[]] };
        }
        
        // Simple mock search - in reality this would use vector similarity
        const results = Array.from(data.documents.entries()).slice(0, nResults);
        
        return {
          ids: [results.map(([id]) => id)],
          distances: [results.map(() => Math.random())],
          documents: [results.map(([, doc]) => doc.document || '')],
          metadatas: [results.map(([, doc]) => doc.metadata || {})],
        };
      },
      
      async delete({ ids }) {
        const data = mockData.get(name);
        if (data) {
          ids.forEach(id => data.documents.delete(id));
        }
      },
    };
  }

  async addDocuments(documents: {
    id: string;
    content: string;
    embedding: number[];
    metadata?: any;
  }[]): Promise<void> {
    try {
      await this.collection.add({
        ids: documents.map(doc => doc.id),
        documents: documents.map(doc => doc.content),
        embeddings: documents.map(doc => doc.embedding),
        metadatas: documents.map(doc => doc.metadata || {}),
      });
      
      this.logger.log(`Added ${documents.length} documents to vector store`);
    } catch (error) {
      this.logger.error('Failed to add documents to vector store:', error);
      throw error;
    }
  }

  async searchSimilar(
    queryEmbedding: number[],
    limit: number = 5,
    filter?: any,
  ): Promise<{
    id: string;
    content: string;
    similarity: number;
    metadata?: any;
  }[]> {
    try {
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where: filter,
      });

      return results.ids[0].map((id, index) => ({
        id,
        content: results.documents[0][index],
        similarity: 1 - results.distances[0][index], // Convert distance to similarity
        metadata: results.metadatas[0][index],
      }));
    } catch (error) {
      this.logger.error('Failed to search vector store:', error);
      throw error;
    }
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    try {
      await this.collection.delete({ ids });
      this.logger.log(`Deleted ${ids.length} documents from vector store`);
    } catch (error) {
      this.logger.error('Failed to delete documents from vector store:', error);
      throw error;
    }
  }
}