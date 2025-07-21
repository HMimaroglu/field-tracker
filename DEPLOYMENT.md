# Field Tracker Deployment Guide

This guide covers deploying Field Tracker using Docker Compose for self-hosted installations.

## Prerequisites

- Docker (20.10+)
- Docker Compose (v2.0+)
- At least 2GB RAM
- 10GB free disk space
- Valid Field Tracker license file

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd field-tracker
   cp .env.example .env
   ```

2. **Configure Environment**
   Edit `.env` file with your settings:
   ```bash
   # IMPORTANT: Change these defaults!
   DB_PASSWORD=your_secure_db_password
   JWT_SECRET=your_64_character_jwt_secret
   ADMIN_PASSWORD=your_admin_password
   ```

3. **Deploy**
   ```bash
   ./scripts/deploy.sh
   ```

4. **Access Services**
   - Admin Dashboard: http://localhost:3001
   - API Server: http://localhost:3000
   - Health Check: http://localhost:3000/health

## Configuration Options

### Database Configuration
```env
DB_PASSWORD=secure_password_123    # PostgreSQL password
DB_PORT=5432                       # Database port (default: 5432)
```

### Server Configuration
```env
JWT_SECRET=your_jwt_secret         # 64+ character secret for JWT tokens
ADMIN_PASSWORD=admin123            # Admin dashboard password
SERVER_PORT=3000                   # API server port
ADMIN_PORT=3001                    # Admin dashboard port
```

### Storage Configuration

**Local Storage (Default)**
```env
STORAGE_TYPE=local
```

**S3-Compatible Storage**
```env
STORAGE_TYPE=s3
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com
```

### Security Configuration
```env
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
LICENSE_PUBLIC_KEY=your_license_public_key
```

## Production Deployment

### 1. SSL/TLS Setup

For production with SSL, uncomment the HTTPS server block in `nginx/nginx.conf` and:

```bash
# Place your SSL certificates
mkdir -p nginx/ssl
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
chmod 600 nginx/ssl/*
```

### 2. Deploy with Nginx
```bash
./scripts/deploy.sh production
```

This includes the Nginx reverse proxy with SSL termination and rate limiting.

### 3. Environment Variables for Production
```env
# Use secure, unique passwords
DB_PASSWORD=complex_secure_password_123
JWT_SECRET=64_character_random_string_for_jwt_signing_change_this_now
ADMIN_PASSWORD=complex_admin_password_456

# Configure for your domain
API_URL=https://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Use production storage
STORAGE_TYPE=s3
# ... S3 configuration
```

## Service Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f web-admin
docker-compose logs -f postgres
```

### Update Services
```bash
git pull
./scripts/deploy.sh
```

## Backup and Restore

### Create Backup
```bash
# Full backup
./scripts/backup.sh

# Database only
./scripts/backup.sh db-only

# Files only
./scripts/backup.sh files-only
```

### Restore from Backup
```bash
# Restore database
docker-compose exec -T postgres psql -U field_tracker -d field_tracker < backups/field_tracker_db_YYYYMMDD_HHMMSS.sql

# Restore files
docker run --rm -v field-tracker_uploads_data:/uploads -v $(pwd)/backups:/backup alpine tar xzf /backup/field_tracker_files_YYYYMMDD_HHMMSS.tar.gz -C /uploads
```

## Monitoring

### Health Checks
```bash
# API Server
curl http://localhost:3000/health

# Admin Dashboard
curl http://localhost:3001

# Database
docker-compose exec postgres pg_isready -U field_tracker
```

### Resource Usage
```bash
# Container stats
docker-compose exec server top
docker stats

# Disk usage
docker system df
du -sh ./
```

## Troubleshooting

### Common Issues

**Services not starting**
```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check memory
free -h
```

**Database connection errors**
```bash
# Check database status
docker-compose exec postgres pg_isready -U field_tracker

# Reset database password
docker-compose exec postgres psql -U postgres -c "ALTER USER field_tracker PASSWORD 'new_password';"
```

**File upload errors**
```bash
# Check upload directory permissions
ls -la uploads/

# Check storage configuration
docker-compose exec server env | grep STORAGE
```

### Performance Tuning

**Database Performance**
```bash
# Increase shared_buffers in postgres container
# Add to docker-compose.yml postgres service:
command: postgres -c shared_buffers=256MB -c max_connections=200
```

**File Storage Performance**
- Use SSD storage for database
- Configure S3 with CDN for file serving
- Enable nginx gzip compression

### Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT secret (64+ characters)
- [ ] Configured proper CORS origins
- [ ] Set up SSL certificates
- [ ] Configured firewall rules
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] License file security

## Scaling

### Horizontal Scaling
Field Tracker can be scaled horizontally by:

1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. **File Storage**: Use S3-compatible storage with CDN
3. **Load Balancing**: Multiple server instances behind load balancer
4. **Caching**: Redis for session storage and caching

### Vertical Scaling
- Increase container memory limits
- Use faster storage (NVMe SSDs)
- Optimize database queries
- Enable connection pooling

## Support

For deployment support:
1. Check the logs first: `docker-compose logs`
2. Verify configuration: `.env` file settings
3. Check system resources: CPU, memory, disk
4. Consult the troubleshooting section
5. Contact support with specific error messages

## License

This deployment is subject to your Field Tracker license agreement. Ensure you have a valid license file before deploying in production.