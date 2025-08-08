#!/bin/bash

# 开发环境启动脚本
set -e

echo "🚀 启动AI提示词优化工具开发环境"
echo ""

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 启动数据库服务
echo "🗄️ 启动数据库服务..."
docker compose up -d mongodb redis

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 检查数据库连接
echo "🔍 检查数据库连接..."
if docker compose exec mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB连接成功"
else
    echo "❌ MongoDB连接失败"
    exit 1
fi

if docker compose exec redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis连接成功"
else
    echo "❌ Redis连接失败"
    exit 1
fi

# 运行数据库迁移
echo "📊 运行数据库迁移..."
cd backend
pnpm run migrate:up
cd ..

# 测试基础设施
echo "🧪 测试基础设施..."
cd backend
pnpm run test:infrastructure
cd ..

echo ""
echo "🎉 开发环境启动完成！"
echo ""
echo "📝 接下来可以："
echo "1. 启动后端开发服务器: cd backend && pnpm run start:dev"
echo "2. 启动前端开发服务器: cd frontend && pnpm run dev"
echo "3. 或者使用Docker启动所有服务: docker compose up"
echo ""
echo "🌐 访问地址："
echo "- 前端: http://localhost:3000"
echo "- 后端API: http://localhost:3001"
echo "- 健康检查: http://localhost:3001/health"
echo ""