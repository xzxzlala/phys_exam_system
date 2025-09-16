FROM node:20-bookworm-slim AS base
ENV NODE_ENV=production
WORKDIR /app

FROM base AS deps
RUN apt-get update && apt-get install -y libreoffice fonts-noto-cjk && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm ci && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# 持久化数据库到 /data（Render 可挂载磁盘）
ENV DATABASE_URL="file:/data/dev.db"

COPY --from=deps /usr/bin/soffice /usr/bin/soffice
COPY --from=deps /usr/lib/libreoffice /usr/lib/libreoffice
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm","run","start"]
