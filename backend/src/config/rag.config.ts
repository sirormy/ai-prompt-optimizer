import { registerAs } from '@nestjs/config';

export default registerAs('rag', () => ({
  // Vector Database Configuration
  vectorStore: {
    provider: process.env.VECTOR_STORE_PROVIDER || 'chroma', // 'chroma' | 'pinecone'
    chroma: {
      url: process.env.CHROMA_URL || 'http://localhost:8000',
      collection: process.env.CHROMA_COLLECTION || 'prompt-best-practices',
    },
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
      index: process.env.PINECONE_INDEX || 'prompt-optimizer',
    },
  },

  // Embedding Configuration
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER || 'openai', // 'openai' | 'huggingface'
    openai: {
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      dimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || '1536'),
    },
    huggingface: {
      model: process.env.HUGGINGFACE_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
      apiKey: process.env.HUGGINGFACE_API_KEY,
    },
  },

  // Knowledge Base Configuration
  knowledgeBase: {
    autoIndex: process.env.RAG_AUTO_INDEX === 'true',
    updateInterval: parseInt(process.env.RAG_UPDATE_INTERVAL || '86400'), // 24 hours in seconds
    maxDocuments: parseInt(process.env.RAG_MAX_DOCUMENTS || '10000'),
    similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7'),
  },

  // Search Configuration
  search: {
    defaultLimit: parseInt(process.env.RAG_DEFAULT_LIMIT || '5'),
    maxLimit: parseInt(process.env.RAG_MAX_LIMIT || '20'),
    hybridSearch: process.env.RAG_HYBRID_SEARCH === 'true',
  },

  // Cache Configuration
  cache: {
    enabled: process.env.RAG_CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.RAG_CACHE_TTL || '3600'), // 1 hour
    maxSize: parseInt(process.env.RAG_CACHE_MAX_SIZE || '1000'),
  },
}));