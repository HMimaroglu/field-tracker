# Multi-stage build for Field Tracker Admin Dashboard
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/*/package.json ./packages/*/
COPY apps/web-admin/package.json ./apps/web-admin/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY packages/ ./packages/
COPY apps/web-admin/ ./apps/web-admin/

# Build packages that web-admin depends on
RUN pnpm --filter @field-tracker/db-schema build
RUN pnpm --filter @field-tracker/shared-utils build
RUN pnpm --filter @field-tracker/licence build
RUN pnpm --filter @field-tracker/api-client build

# Build web admin
RUN pnpm --filter @field-tracker/web-admin build

# Production stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built Next.js application
COPY --from=base --chown=nodejs:nodejs /app/apps/web-admin/.next/standalone ./
COPY --from=base --chown=nodejs:nodejs /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=base --chown=nodejs:nodejs /app/apps/web-admin/public ./apps/web-admin/public

# Switch to nodejs user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start Next.js
CMD ["node", "apps/web-admin/server.js"]