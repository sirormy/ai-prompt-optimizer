# 多阶段构建 - 开发环境
FROM node:18-alpine AS development

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制package文件
COPY package*.json pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 开发环境启动命令
CMD ["pnpm", "run", "start:dev"]

# 构建阶段
FROM node:18-alpine AS build

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制package文件
COPY package*.json pnpm-lock.yaml* ./

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 生产环境
FROM node:18-alpine AS production

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制package文件
COPY package*.json pnpm-lock.yaml* ./

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建结果
COPY --from=build /app/dist ./dist

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 更改文件所有权
USER nestjs

# 暴露端口
EXPOSE 3001

# 生产环境启动命令
CMD ["node", "dist/main"]