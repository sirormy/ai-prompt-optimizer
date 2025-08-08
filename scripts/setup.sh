#!/bin/bash

# AI提示词优化工具 - 开发环境设置脚本

echo "🚀 开始设置AI提示词优化工具开发环境..."

# 检查Node.js版本
echo "📋 检查Node.js版本..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ 需要Node.js 18或更高版本，当前版本: $(node -v)"
    exit 1
fi
echo "✅ Node.js版本检查通过: $(node -v)"

# 检查pnpm
echo "📋 检查pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm未安装，正在安装pnpm..."
    npm install -g pnpm
fi
echo "✅ pnpm检查通过: $(pnpm --version)"

# 检查Docker
echo "📋 检查Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi
echo "✅ Docker检查通过: $(docker --version)"

# 检查Docker Compose
echo "📋 检查Docker Compose..."
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker和Docker Compose"
    exit 1
fi
echo "✅ Docker Compose检查通过: $(docker compose version)"

# 安装所有依赖
echo "📦 安装项目依赖..."
pnpm install

# 复制环境变量文件
echo "⚙️  设置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ 已创建根目录 .env 文件"
fi

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ 已创建后端 .env 文件"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ 已创建前端 .env 文件"
fi

echo ""
echo "🎉 开发环境设置完成！"
echo ""
echo "📝 接下来的步骤："
echo "1. 编辑 .env 文件，配置API密钥和其他环境变量"
echo "2. 运行 'docker compose up -d' 启动开发环境"
echo "3. 访问 http://localhost:3000 查看前端应用"
echo "4. 访问 http://localhost:3001 查看后端API"
echo ""
echo "🔧 常用命令："
echo "- pnpm run dev          # 启动开发服务器"
echo "- pnpm run build        # 构建应用"
echo "- pnpm run test         # 运行测试"
echo "- pnpm run lint         # 代码检查"
echo "- docker compose logs   # 查看服务日志"
echo ""