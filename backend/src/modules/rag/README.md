# RAG (Retrieval-Augmented Generation) Module

## 概述

RAG模块为AI提示词优化工具提供检索增强生成功能，通过向量数据库存储和检索最佳实践知识库，为用户提供更智能、更专业的提示词优化建议。

## 功能特性

### 1. 向量数据库集成
- **支持多种向量数据库**: Chroma (自托管) 和 Pinecone (云端)
- **自动向量化**: 使用OpenAI Embeddings或其他嵌入模型
- **高效检索**: 基于余弦相似度的语义搜索

### 2. 知识库管理
- **最佳实践库**: 预置AI提示词优化最佳实践
- **动态更新**: 支持添加、删除和更新知识库内容
- **分类管理**: 按类别、模型、优先级组织知识

### 3. 智能建议生成
- **上下文感知**: 基于用户输入的提示词内容生成相关建议
- **模型特定优化**: 针对不同AI模型提供定制化建议
- **置信度评估**: 为每个建议提供置信度评分

## 架构设计

```
RAGModule
├── RAGService (主服务)
├── VectorStoreService (向量存储)
├── EmbeddingService (嵌入生成)
├── KnowledgeBaseService (知识库管理)
└── RAGController (API接口)
```

## 核心服务

### RAGService
主要的RAG服务，提供：
- `enhancePromptWithRAG()`: 使用RAG增强提示词
- `generateOptimizationSuggestions()`: 生成优化建议

### VectorStoreService
向量数据库操作服务：
- 支持Chroma和Pinecone
- 文档向量化存储
- 相似度搜索

### EmbeddingService
嵌入向量生成服务：
- OpenAI text-embedding-3-small
- 支持批量嵌入生成
- 相似度计算

### KnowledgeBaseService
知识库管理服务：
- 最佳实践索引
- 上下文建议生成
- 知识库CRUD操作

## API接口

### POST /api/rag/enhance
增强提示词
```json
{
  "prompt": "写一个关于AI的文章",
  "targetModel": "openai",
  "includeExamples": true
}
```

### POST /api/rag/suggestions
生成优化建议
```json
{
  "originalPrompt": "写一个关于AI的文章",
  "targetModel": "openai",
  "userPreferences": {
    "optimizationLevel": "advanced",
    "includeExplanations": true
  }
}
```

### GET /api/rag/best-practices
搜索最佳实践
```
GET /api/rag/best-practices?query=clarity&model=openai&limit=5
```

## 配置选项

### 环境变量

```bash
# 向量数据库配置
VECTOR_STORE_PROVIDER=chroma
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=prompt-best-practices

# 嵌入模型配置
EMBEDDING_PROVIDER=openai
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536

# 知识库配置
RAG_AUTO_INDEX=true
RAG_UPDATE_INTERVAL=86400
RAG_SIMILARITY_THRESHOLD=0.7

# 搜索配置
RAG_DEFAULT_LIMIT=5
RAG_MAX_LIMIT=20

# 缓存配置
RAG_CACHE_ENABLED=true
RAG_CACHE_TTL=3600
```

## 使用示例

### 在PromptsService中集成RAG

```typescript
// 使用RAG增强的优化
const result = await this.promptsService.optimizePromptWithRAG({
  prompt: "写一个关于AI的文章",
  targetModel: "openai",
  optimizationLevel: "advanced",
  userId: "user123"
});

console.log(result.ragEnhancement.confidence); // 0.85
console.log(result.ragEnhancement.relevantPractices); // 相关最佳实践
```

### 直接使用RAG服务

```typescript
// 增强提示词
const enhanced = await this.ragService.enhancePromptWithRAG({
  prompt: "写一个关于AI的文章",
  targetModel: "openai",
  includeExamples: true
});

// 生成建议
const suggestions = await this.ragService.generateOptimizationSuggestions({
  originalPrompt: "写一个关于AI的文章",
  targetModel: "openai"
});
```

## 最佳实践数据结构

```typescript
interface BestPractice {
  id: string;
  title: string;
  content: string;
  category: 'clarity' | 'context' | 'examples' | 'structure' | 'constraints' | 'role' | 'iteration';
  model?: 'openai' | 'claude' | 'deepseek';
  tags: string[];
  source?: string;
  priority: number; // 1-10
}
```

## 部署说明

### 使用Chroma (推荐用于开发和小规模部署)

1. 启动Chroma服务器:
```bash
docker run -p 8000:8000 chromadb/chroma
```

2. 配置环境变量:
```bash
VECTOR_STORE_PROVIDER=chroma
CHROMA_URL=http://localhost:8000
```

### 使用Pinecone (推荐用于生产环境)

1. 在Pinecone创建索引
2. 配置环境变量:
```bash
VECTOR_STORE_PROVIDER=pinecone
PINECONE_API_KEY=your-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX=prompt-optimizer
```

## 性能优化

1. **缓存策略**: 缓存常用查询结果
2. **批量处理**: 批量生成嵌入向量
3. **索引优化**: 定期优化向量索引
4. **异步处理**: 异步更新知识库

## 监控和日志

- 查询响应时间监控
- 向量数据库连接状态
- 嵌入生成成功率
- 缓存命中率统计

## 故障排除

### 常见问题

1. **向量数据库连接失败**
   - 检查服务是否启动
   - 验证连接配置

2. **嵌入生成失败**
   - 检查OpenAI API密钥
   - 验证网络连接

3. **搜索结果质量差**
   - 调整相似度阈值
   - 更新知识库内容

## 扩展开发

### 添加新的向量数据库支持

1. 实现VectorStoreService接口
2. 更新配置文件
3. 添加相应的环境变量

### 添加新的嵌入模型

1. 扩展EmbeddingService
2. 添加模型配置
3. 更新服务初始化逻辑

## 测试

```bash
# 运行RAG模块测试
npm test -- --testPathPattern=rag

# 运行特定测试文件
npm test rag.service.spec.ts
```

## 许可证

本模块遵循项目主许可证。