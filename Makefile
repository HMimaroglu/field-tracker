.PHONY: install dev build clean test setup-dev docker-up docker-down db-setup db-reset

# Install all dependencies
install:
	pnpm install

# Run all packages in development mode
dev: install
	pnpm run dev

# Build all packages for production
build: install
	pnpm run build

# Clean all build artifacts
clean:
	pnpm run clean
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	rm -rf server/node_modules

# Run all tests
test: install
	pnpm run test

# Type check all packages
type-check: install
	pnpm run type-check

# Lint and format code
lint: install
	pnpm run lint
	pnpm run format

# Setup development environment
setup-dev: install
	@echo "🚀 Setting up development environment..."
	@make db-setup
	@echo "✅ Development environment ready!"

# Docker development environment
docker-up:
	docker-compose -f server/docker/docker-compose.dev.yml up -d

docker-down:
	docker-compose -f server/docker/docker-compose.dev.yml down

# Database operations
db-setup:
	@echo "📄 Generating database migrations..."
	cd packages/db-schema && pnpm db:generate
	@echo "🗄️ Starting PostgreSQL with Docker..."
	@make docker-up
	@echo "⏳ Waiting for database to be ready..."
	@sleep 5
	@echo "🔄 Running migrations..."
	cd packages/db-schema && pnpm db:migrate
	@echo "🌱 Seeding database..."
	cd packages/db-schema && pnpm run seed

db-reset:
	@echo "🔄 Resetting database..."
	@make docker-down
	docker volume rm field-tracker_postgres-data 2>/dev/null || true
	@make db-setup

# Generate license keys for development
generate-keys:
	cd packages/licence && pnpm generate-keys

# Development helpers
server-dev:
	cd server && pnpm run dev

mobile-dev:
	cd apps/mobile && pnpm run start

admin-dev:
	cd apps/web-admin && pnpm run dev

# Production deployment
deploy-prod: build
	@echo "🚀 Deploying to production..."
	# Add production deployment commands here

# Show project structure
tree:
	@echo "📁 Project structure:"
	@find . -type d -name node_modules -prune -o -type d -name .git -prune -o -type f -print | head -50