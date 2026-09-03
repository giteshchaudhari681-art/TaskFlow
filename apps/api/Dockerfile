# Multi-stage production Dockerfile for TaskFlow Node.js / Express API
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL and libc compatibility for Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Copy workspace package manifests for optimized layer caching
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/validation/package*.json ./packages/validation/
COPY packages/config/package*.json ./packages/config/
COPY apps/api/package*.json ./apps/api/

# Install full dependencies including devDependencies for build
RUN npm ci

# Copy source trees and configurations
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/validation ./packages/validation
COPY packages/config ./packages/config
COPY apps/api ./apps/api

# Generate Prisma Client
RUN npm run prisma:generate --workspace=@taskflow/api

# Build shared packages and Express API
RUN npm run build:packages
RUN npm run build --workspace=@taskflow/api

# --- Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl libc6-compat

# Create non-root system group and user
RUN addgroup -g 10001 -S taskflow && \
    adduser -u 10001 -S taskflow -G taskflow

# Copy package manifests and built modules
COPY --chown=taskflow:taskflow --from=builder /app/node_modules ./node_modules
COPY --chown=taskflow:taskflow --from=builder /app/package*.json ./
COPY --chown=taskflow:taskflow --from=builder /app/packages ./packages
COPY --chown=taskflow:taskflow --from=builder /app/apps/api ./apps/api

USER taskflow

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

CMD ["node", "apps/api/dist/index.js"]
