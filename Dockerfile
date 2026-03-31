# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Enable Corepack and use pnpm for dependency management
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --no-optional

COPY . .

RUN pnpm exec prisma generate
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
COPY .env.production .env.production

EXPOSE 5100

CMD ["node", "dist/src/main.js"]
