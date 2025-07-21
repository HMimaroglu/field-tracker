# Multi-stage build for Field Tracker Server
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/*/package.json ./packages/*/
COPY server/package.json ./server/
COPY apps/web-admin/package.json ./apps/web-admin/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY packages/ ./packages/
COPY server/ ./server/

# Build packages
RUN pnpm --filter @field-tracker/db-schema build
RUN pnpm --filter @field-tracker/shared-utils build
RUN pnpm --filter @field-tracker/licence build
RUN pnpm --filter @field-tracker/api-client build

# Build server
RUN pnpm --filter @field-tracker/server build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/*/package.json ./packages/*/
COPY server/package.json ./server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=base --chown=nodejs:nodejs /app/packages/*/dist ./packages/*/dist/
COPY --from=base --chown=nodejs:nodejs /app/packages/*/package.json ./packages/*/
COPY --from=base --chown=nodejs:nodejs /app/server/dist ./server/dist/
COPY --from=base --chown=nodejs:nodejs /app/server/package.json ./server/

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

# Create licenses directory
RUN mkdir -p /app/licenses && chown -R nodejs:nodejs /app/licenses

# Switch to nodejs user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "server/dist/index.js"]