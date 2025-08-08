# AI提示词优化工具

一个智能的AI提示词优化工具，帮助用户优化和完善他们的AI提示词，使其能够更好地与不同的AI大模型进行交互。

## 功能特性

- 🤖 支持多种主流AI模型（OpenAI、Claude、DeepSeek等）
- 🎯 基于最佳实践的智能优化建议
- 📝 消息角色和系统提示词设置
- 📊 优化前后对比展示
- 📚 历史记录管理
- 🔄 实时优化进度显示

## 技术栈

### 后端
- **框架**: NestJS (TypeScript)
- **数据库**: MongoDB
- **缓存**: Redis
- **认证**: JWT

### 前端
- **框架**: Next.js (React)
- **状态管理**: Zustand
- **UI组件**: Ant Design
- **样式**: Tailwind CSS

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- Docker & Docker Compose
- pnpm >= 8.0.0

### 安装依赖

```bash
# 安装所有依赖（推荐）
pnpm install

# 或者分别安装
pnpm --filter frontend install
pnpm --filter backend install
```

### 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. 配置环境变量：
   - 设置数据库连接信息
   - 配置AI API密钥
   - 设置JWT密钥

### 启动开发环境

#### 使用Docker Compose（推荐）

```bash
# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f
```

#### 本地开发

```bash
# 启动数据库服务
docker compose up -d mongodb redis

# 启动开发服务器
npm run dev
```

### 访问应用

- 前端应用: http://localhost:3000
- 后端API: http://localhost:3001
- API文档: http://localhost:3001/api (待实现)

## 开发命令

```bash
# 开发环境
pnpm run dev              # 同时启动前后端
pnpm run dev:frontend     # 仅启动前端
pnpm run dev:backend      # 仅启动后端

# 构建
pnpm run build            # 构建前后端
pnpm run build:frontend   # 构建前端
pnpm run build:backend    # 构建后端

# 测试
pnpm run test             # 运行所有测试
pnpm run test:frontend    # 前端测试
pnpm run test:backend     # 后端测试

# 代码质量
pnpm run lint             # 代码检查
pnpm run format           # 代码格式化
```

## 项目结构

```
ai-prompt-optimizer/
├── backend/                 # 后端服务
│   ├── src/                # 源代码
│   ├── test/               # 测试文件
│   ├── Dockerfile          # Docker配置
│   └── package.json        # 依赖配置
├── frontend/               # 前端应用
│   ├── src/                # 源代码
│   ├── public/             # 静态资源
│   ├── Dockerfile          # Docker配置
│   └── package.json        # 依赖配置
├── docker/                 # Docker相关配置
│   └── mongodb/            # MongoDB初始化脚本
├── .kiro/                  # Kiro规范文档
│   └── specs/              # 功能规范
├── docker-compose.yml      # Docker Compose配置
└── package.json            # 根目录配置
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。