# 使用官方Node.js镜像作为基础镜像
FROM node:20-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 构建阶段
FROM base AS builder

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM base AS production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 创建必要的目录
RUN mkdir -p /app/public/uploads /app/workspace /app/temp
RUN chown -R nextjs:nodejs /app

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# 启动应用
CMD ["node", "server.js"]