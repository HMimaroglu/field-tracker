# Installation Guide

This guide covers installing Field Tracker for both development and production environments.

## Prerequisites

### System Requirements

#### Development
- **OS**: macOS, Linux, or Windows with WSL2
- **Node.js**: 18.0 or higher
- **pnpm**: 8.0 or higher
- **Docker**: 20.10 or higher
- **Git**: 2.20 or higher

#### Production Server
- **OS**: Ubuntu 20.04 LTS or higher (recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum, SSD recommended
- **CPU**: 2 cores minimum, 4 cores recommended
- **Network**: Static IP or domain name

### Mobile Device Requirements
- **iOS**: 12.0+ (iPhone 6s or newer)
- **Android**: 7.0+ (API level 24+), 3GB RAM minimum

## Development Installation

### 1. Clone Repository
```bash
git clone https://github.com/your-org/field-tracker.git
cd field-tracker
```

### 2. Install Dependencies
```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install project dependencies
pnpm install
```

### 3. Environment Setup
```bash
# Copy environment templates
cp server/.env.example server/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web-admin/.env.example apps/web-admin/.env
```

### 4. Configure Environment Variables

#### Server Configuration (`server/.env`)
```env
# Database
DATABASE_URL="postgresql://fieldtracker:password@localhost:5432/fieldtracker"
REDIS_URL="redis://localhost:6379"

# Server
PORT=8000
NODE_ENV="development"
JWT_SECRET="dev-jwt-secret-change-in-production"

# File Storage
STORAGE_TYPE="local"
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE="10mb"

# License System (development)
REQUIRE_LICENSE=false
DEV_LICENSE_KEY="FT-DEV-LICENSE-2024-ABCD1234EFGH5678"
```

#### Mobile Configuration (`apps/mobile/.env`)
```env
# API Configuration
EXPO_PUBLIC_API_BASE_URL="http://localhost:8000"
EXPO_PUBLIC_WEB_ADMIN_URL="http://localhost:3000"

# Development
EXPO_PUBLIC_ENABLE_DEV_MENU=true
EXPO_PUBLIC_LOG_LEVEL="debug"
```

#### Admin Dashboard (`apps/web-admin/.env`)
```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"

# Admin Authentication
ADMIN_PASSWORD="admin123" # Change in production
```

### 5. Start Development Environment
```bash
# Start database services
docker-compose up -d postgres redis

# Start all development servers
pnpm dev

# Or start services individually:
# pnpm --filter server dev
# pnpm --filter @field-tracker/mobile dev
# pnpm --filter @field-tracker/web-admin dev
```

### 6. Initialize Database
```bash
# Run database migrations
pnpm --filter server db:migrate

# Seed with sample data (optional)
pnpm --filter server db:seed
```

### 7. Access Applications
- **Mobile App**: Use Expo Go app to scan QR code from terminal
- **Admin Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs

## Production Installation

### 1. Server Setup

#### Ubuntu 20.04/22.04
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Node.js (for management scripts)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm
```

### 2. Deploy Application

#### Option A: Automated Script (Recommended)
```bash
# Download and run installation script
curl -fsSL https://raw.githubusercontent.com/your-org/field-tracker/main/scripts/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh
```

#### Option B: Manual Deployment
```bash
# Clone repository
git clone https://github.com/your-org/field-tracker.git
cd field-tracker

# Create production environment
cp server/.env.production server/.env
cp apps/web-admin/.env.production apps/web-admin/.env

# Configure environment (see Production Configuration section)
nano server/.env
nano apps/web-admin/.env

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose exec app pnpm db:migrate
```

### 3. Production Configuration

#### Server Environment (`server/.env`)
```env
# Database
DATABASE_URL="postgresql://fieldtracker:SECURE_PASSWORD@postgres:5432/fieldtracker"
REDIS_URL="redis://redis:6379"

# Server
PORT=8000
NODE_ENV="production"
JWT_SECRET="GENERATE_SECURE_JWT_SECRET_HERE"

# File Storage
STORAGE_TYPE="s3" # or "local"
UPLOAD_PATH="/app/uploads"
MAX_FILE_SIZE="10mb"

# S3 Configuration (if using S3)
S3_BUCKET="field-tracker-uploads"
S3_REGION="us-east-1"
S3_ACCESS_KEY="YOUR_ACCESS_KEY"
S3_SECRET_KEY="YOUR_SECRET_KEY"
S3_ENDPOINT="https://s3.amazonaws.com" # or MinIO endpoint

# License System
REQUIRE_LICENSE=true
LICENSE_VALIDATION_ENDPOINT="https://api.fieldtracker.com/validate"

# Security
CORS_ORIGINS="https://yourdomain.com,https://admin.yourdomain.com"
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=900000

# Monitoring
LOG_LEVEL="info"
ENABLE_METRICS=true
```

#### Admin Dashboard (`apps/web-admin/.env`)
```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL="https://api.yourdomain.com"

# Admin Authentication
ADMIN_PASSWORD="SECURE_PASSWORD_HERE"

# Security
NEXTAUTH_SECRET="GENERATE_SECURE_NEXTAUTH_SECRET"
NEXTAUTH_URL="https://admin.yourdomain.com"
```

### 4. SSL Configuration

#### Using Let's Encrypt (Automatic)
```bash
# SSL is configured automatically via docker-compose
# Ensure your domain points to the server IP
```

#### Using Custom Certificates
```bash
# Place certificates in nginx/certs/
cp your-domain.crt nginx/certs/
cp your-domain.key nginx/certs/

# Update nginx configuration
nano nginx/nginx.conf
```

### 5. Backup Configuration
```bash
# Setup automated backups
cp scripts/backup.sh /usr/local/bin/field-tracker-backup
chmod +x /usr/local/bin/field-tracker-backup

# Add to crontab
echo "0 2 * * * /usr/local/bin/field-tracker-backup" | sudo crontab -
```

## Mobile App Installation

### Development (Expo Go)
1. Install Expo Go on your device
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Run `pnpm --filter @field-tracker/mobile dev`
3. Scan QR code with Expo Go

### Production Build

#### Prerequisites
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo account
eas login
```

#### Android Build
```bash
cd apps/mobile

# Configure build
eas build:configure

# Create production build
eas build --platform android --profile production

# Or create APK for direct distribution
eas build --platform android --profile preview
```

#### iOS Build (Requires Apple Developer Account)
```bash
cd apps/mobile

# Configure build
eas build:configure

# Create production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### Internal Distribution
```bash
# Build internal distribution
eas build --platform all --profile internal

# Share build links with team
eas build:list
```

## License Management

### Development License
```bash
# Generate development license
cd scripts
node generate-license.js --dev

# Or use provided development key
export DEV_LICENSE_KEY="FT-DEV-LICENSE-2024-ABCD1234EFGH5678"
```

### Production License
```bash
# Generate production license
cd scripts
node generate-license.js \
  --company "Your Company Name" \
  --max-workers 25 \
  --expires "2025-12-31" \
  --features "offline,photos,reports"

# Install license
curl -X POST http://your-server/api/license \
  -H "Content-Type: application/json" \
  -d '{"key": "YOUR_LICENSE_KEY"}'
```

## Database Management

### Migrations
```bash
# Run migrations
docker-compose exec app pnpm db:migrate

# Rollback migration
docker-compose exec app pnpm db:rollback

# Create new migration
docker-compose exec app pnpm db:create-migration add_new_feature
```

### Backup & Restore
```bash
# Create backup
docker-compose exec postgres pg_dump fieldtracker > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose exec -T postgres psql fieldtracker < backup.sql

# Automated backup script
./scripts/backup.sh
```

## Monitoring Setup

### Health Checks
```bash
# Server health
curl http://localhost:8000/health

# Database health  
docker-compose exec postgres pg_isready

# Check all services
docker-compose ps
```

### Log Management
```bash
# View logs
docker-compose logs -f app

# Export logs
docker-compose logs --since="24h" > logs_$(date +%Y%m%d).txt

# Log rotation (add to logrotate)
sudo nano /etc/logrotate.d/field-tracker
```

### Performance Monitoring
```bash
# Setup Prometheus + Grafana (optional)
docker-compose -f monitoring/docker-compose.yml up -d

# Access Grafana
# http://localhost:3001 (admin/admin)
```

## Troubleshooting

### Common Issues

#### "Cannot connect to server"
```bash
# Check server status
docker-compose ps

# Check server logs
docker-compose logs app

# Verify network connectivity
curl -I http://your-server:8000/health
```

#### "Database connection failed"
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# Check database logs
docker-compose logs postgres

# Verify connection string
docker-compose exec app node -e "console.log(process.env.DATABASE_URL)"
```

#### "Photo upload fails"
```bash
# Check storage configuration
docker-compose exec app ls -la /app/uploads

# Check file permissions
docker-compose exec app chmod 755 /app/uploads

# Verify storage service
curl -X POST http://your-server/api/health/storage
```

#### "Mobile app won't sync"
```bash
# Check sync queue
curl -H "x-license-key: YOUR_KEY" http://your-server/api/sync/status

# Clear sync queue (if corrupted)
curl -X DELETE -H "x-license-key: YOUR_KEY" http://your-server/api/sync/queue

# Check mobile app logs
# Enable debug logging in mobile app settings
```

### Performance Issues

#### Slow database queries
```bash
# Check query performance
docker-compose exec postgres psql fieldtracker -c "SELECT * FROM pg_stat_activity;"

# Analyze slow queries
docker-compose exec postgres psql fieldtracker -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

#### High memory usage
```bash
# Check container resources
docker stats

# Adjust memory limits in docker-compose.yml
```

## Security Hardening

### Production Security Checklist
- [ ] Change all default passwords
- [ ] Generate secure JWT secrets
- [ ] Configure firewall (ports 80, 443, 22 only)
- [ ] Setup SSL certificates
- [ ] Enable log monitoring
- [ ] Configure regular backups
- [ ] Update system packages
- [ ] Configure fail2ban for SSH protection

### Security Commands
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban -y

# Check security status
sudo ufw status
sudo fail2ban-client status
```

## Support

### Getting Help
- **Documentation**: https://docs.fieldtracker.com
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: support@fieldtracker.com

### Professional Support
- **Installation Support**: Available for production deployments
- **Custom Development**: Feature requests and modifications
- **Training**: Team training and best practices
- **Managed Hosting**: Fully managed cloud deployment

Contact support@fieldtracker.com for professional support options.