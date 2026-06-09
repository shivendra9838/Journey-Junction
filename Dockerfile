FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json ./
COPY artifacts ./artifacts
COPY lib ./lib
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3001
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
