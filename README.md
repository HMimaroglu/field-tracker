# Field Crew Time Tracker

**Production-quality, offline-first mobile time tracking system for small field service crews**

🎯 **Core Value**: Works with zero cellular data; syncs later  
⚡ **Target**: Aggressively minimal feature set; shippable MVP in < 8 weeks  
👥 **Audience**: 3–25 field workers; owner-operator or office admin

## 🚀 Quick Start

```bash
# Install dependencies
make install

# Setup development environment (includes database)
make setup-dev

# Start all services in development mode
make dev
```

## 📱 Features

### Worker Mobile App (Offline-First)
- ✅ Worker selection + 4-digit PIN authentication
- ✅ Start/End job tracking with GPS coordinates
- ✅ Break tracking (paid/unpaid configurable)
- ✅ Photo capture (up to 3 per job, compressed)
- ✅ Short notes per time entry
- ✅ Local queue with sync status
- ✅ Works fully offline for multiple days

### Admin Web Dashboard
- ✅ Worker & job management
- ✅ Time tracking reports (daily, weekly, custom ranges)
- ✅ CSV export for payroll/QuickBooks
- ✅ Photo gallery per job/day
- ✅ Conflict resolution UI
- ✅ License management

### Sync & Data Management
- ✅ Couch-style bi-directional sync
- ✅ Conflict detection and resolution
- ✅ Last-write-wins with audit log
- ✅ Resilient offline queue

## 🏗️ Architecture

```
field-crew-time-tracker/
├── apps/
│   ├── mobile/              # React Native (bare workflow)
│   └── web-admin/           # Next.js admin console
├── packages/
│   ├── api-client/          # Shared API client
│   ├── db-schema/           # Drizzle schema + migrations
│   ├── licence/             # License key system
│   └── shared-utils/        # Common utilities
├── server/                  # Node.js + Fastify API
└── docs/                    # Documentation
```

### Tech Stack
- **Mobile**: React Native (bare workflow) + TypeScript + SQLite
- **Backend**: Node.js + Fastify + PostgreSQL + Drizzle ORM
- **Web**: Next.js + tRPC + Tailwind CSS
- **Storage**: PostgreSQL + S3-compatible (MinIO for self-host)
- **Auth**: License key + worker PIN (no user accounts in MVP)

## 🛠️ Development

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker (for development database)

### Available Commands

```bash
# Development
make dev                 # Run all services
make server-dev         # Server only
make mobile-dev         # Mobile app only
make admin-dev          # Admin web only

# Database
make db-setup           # Setup database with migrations
make db-reset           # Reset database completely
make docker-up          # Start PostgreSQL container
make docker-down        # Stop containers

# Utilities
make generate-keys      # Generate license keys
make type-check         # Type check all packages
make lint              # Lint and format code
make clean             # Clean build artifacts
```

### Database Schema

**Core Tables:**
- `workers` - Employee roster with PINs
- `jobs` - Job/project definitions
- `time_entries` - Clock in/out records
- `break_entries` - Break tracking
- `photos` - Job photos with metadata
- `licences` - License validation
- `sync_logs` - Sync audit trail

**Key Features:**
- UUID-based offline IDs for conflict-free replication
- GPS coordinates (optional, coarse location)
- Comprehensive audit logging
- Configurable break types and payroll periods

## 📄 License Model

- **Offline-first**: Ed25519 signature validation, no call-home required
- **Seat-based**: License enforces max worker count locally
- **One-time purchase**: No recurring subscription dependency
- **Self-hosted friendly**: Validation works without internet

```bash
# Generate development license
make generate-keys
```

## 🚚 Deployment

### Self-Hosted (Docker Compose)
```bash
# Production deployment on Ubuntu 22.04
./scripts/install.sh
```

Includes:
- PostgreSQL database
- MinIO S3-compatible storage
- Fastify API server
- Next.js admin interface
- Automated SSL with Let's Encrypt

### Managed Cloud (Future)
- Stub hooks ready for managed sync service
- Can be enabled via feature flag later

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E offline simulation
pnpm test:e2e

# Load testing (25 workers × 30 days × 10 shifts)
pnpm test:load
```

**Test Requirements:**
- Offline functionality: 3 shifts recorded in airplane mode
- Sync performance: 7,500 records sync in < 2 minutes on broadband
- Conflict resolution: Overlapping time entries handled gracefully

## 📊 CSV Export Format

Default columns for QuickBooks/payroll integration:
- EmployeeID, EmployeeName, Date, JobCode, JobName
- RegularHours, OvertimeHours, BreakMinutes, Notes
- Latitude, Longitude

Configurable payroll periods: weekly, bi-weekly, semi-monthly, monthly

## 📚 Documentation

- [Installation Guide](docs/INSTALL_SELF_HOST.md)
- [Architecture Overview](docs/ARCH.md)
- [Data Model](docs/DATA_MODEL.md)
- [Licensing](docs/LICENSING.md)

## 🎯 MVP Status

**✅ Milestone 1: Scaffolding & Schema** (Current)
- [x] Monorepo structure with pnpm workspaces
- [x] Database schema with Drizzle ORM
- [x] License key system with Ed25519 signatures
- [x] Shared utilities and API client types

**⏳ Next: Server API Implementation**
- [ ] Fastify server with sync endpoints
- [ ] Authentication middleware
- [ ] File upload handling
- [ ] Conflict resolution engine

**📅 Roadmap:**
1. Mobile app with offline SQLite
2. Admin web interface
3. Docker deployment
4. End-to-end testing
5. Production documentation

---

**🤝 Contributing**: This is a production MVP project. Focus on shipping core features quickly and reliably.

**📧 Support**: See [docs/LICENSING.md](docs/LICENSING.md) for support options.