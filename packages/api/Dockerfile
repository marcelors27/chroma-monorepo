# Simple Medusa API image using pnpm and workspace context
FROM node:18-alpine AS base

WORKDIR /app
RUN corepack enable

# Instalamos dependências da API (pnpm usa workspace)
COPY package.json pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/package.json
RUN pnpm install --filter @chroma/api... --prefer-offline

# Copiamos restante dos arquivos necessários
COPY . .

EXPOSE 9000
WORKDIR /app/packages/api
CMD ["pnpm", "start"]
