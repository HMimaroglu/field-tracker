# Field Tracker Architecture

## System Overview

Field Tracker is built as a distributed, offline-first system with three main components:

```
┌─────────────────────┐    ┌────────────────────┐    ┌─────────────────────┐
│     Mobile App      │    │    Fastify API     │    │  Admin Dashboard    │
│                     │    │                    │    │                     │
│ • React Native      │◄──►│ • Node.js/Fastify  │◄──►│ • Next.js           │
│ • SQLite (Offline)  │    │ • PostgreSQL       │    │ • Real-time Reports │
│ • Sync Queue        │    │ • File Storage     │    │ • Photo Management  │
│ • Photo Compression │    │ • Conflict Engine  │    │ • Conflict Resolution│
└─────────────────────┘    └────────────────────┘    └─────────────────────┘
         │                           │                           │
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                           ┌──────────────────┐
                           │  Infrastructure  │
                           │                  │
                           │ • PostgreSQL     │
                           │ • Redis Cache    │
                           │ • File Storage   │
                           │ • Docker Stack   │
                           └──────────────────┘
```

## Core Architecture Principles

### 1. Offline-First Design
- **Local Storage**: Every mobile device maintains complete SQLite database
- **Queue-Based Sync**: Changes queued locally and synced when network available
- **Conflict Resolution**: Intelligent merging of conflicting changes
- **Resilient Operation**: System continues functioning without server connectivity

### 2. Event-Driven Data Flow
```
Mobile Device                    Server                      Admin Dashboard
┌─────────────┐                 ┌─────────────┐              ┌─────────────┐
│ User Action │──┐              │             │              │             │
└─────────────┘  │              │             │              │             │
                 ▼              │             │              │             │
┌─────────────┐  │              │             │              │             │
│ Local Store │  │              │             │              │             │
│ (SQLite)    │  │              │             │              │             │
└─────────────┘  │              │             │              │             │
                 ▼              │             │              │             │
┌─────────────┐                 │             │              │             │
│ Sync Queue  │──────HTTP──────►│ API Handler │──────────────┤ Live Updates│
└─────────────┘                 │             │              │             │
                                │             │              │             │
                                ▼             │              │             │
                        ┌─────────────┐       │              │             │
                        │ PostgreSQL  │       │              │             │
                        │ (Canonical) │       │              │             │
                        └─────────────┘       │              │             │
                                              │              │             │
                                              ▼              ▼             │
                                      ┌─────────────┐ ┌─────────────┐      │
                                      │ Audit Log   │ │ Real-time   │      │
                                      │             │ │ Dashboard   │      │
                                      └─────────────┘ └─────────────┘      │
```

### 3. Microservices Architecture
Each component has distinct responsibilities:

- **Mobile Service**: Offline data management, sync coordination
- **API Service**: Data processing, conflict resolution, authentication
- **Admin Service**: Monitoring, reporting, configuration management
- **Storage Service**: Photo/file management, backup coordination

## Data Architecture

### Database Design

#### Mobile (SQLite)
```sql
-- Core entities with offline GUIDs
workers (id, employee_id, name, pin, server_id, last_sync)
jobs (id, job_code, name, description, server_id, last_sync) 
time_entries (id, offline_guid, worker_id, job_id, start_time, end_time, ...)
photos (id, offline_guid, time_entry_id, file_path, ...)
break_entries (id, offline_guid, time_entry_id, break_type_id, ...)

-- Sync management
sync_queue (id, type, entity_guid, data, retry_count, created_at)
sync_log (id, entity_type, entity_guid, action, status, timestamp)
```

#### Server (PostgreSQL)
```sql
-- Canonical data store
workers (id, employee_id, name, pin_hash, created_at, updated_at)
jobs (id, job_code, name, description, created_at, updated_at)
time_entries (id, offline_guid, worker_id, job_id, start_time, end_time, ...)
photos (id, offline_guid, time_entry_id, file_path, file_url, ...)
break_entries (id, offline_guid, time_entry_id, break_type_id, ...)

-- System management
licenses (id, key_hash, company_name, max_workers, expires_at)
audit_log (id, entity_type, entity_id, action, old_data, new_data, timestamp)
sync_conflicts (id, entity_type, offline_guid, local_data, server_data, resolved)
```

### Sync Strategy

#### 1. Change Detection
```typescript
interface SyncItem {
  id: string;
  type: 'time_entry' | 'photo' | 'break_entry';
  entityGuid: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retryCount: number;
}
```

#### 2. Conflict Resolution Rules
```typescript
enum ConflictStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  MERGE_FIELDS = 'merge_fields', 
  MANUAL_REVIEW = 'manual_review',
  REJECT_CHANGES = 'reject_changes'
}

const CONFLICT_RULES = {
  time_entries: {
    start_time: ConflictStrategy.MANUAL_REVIEW,
    end_time: ConflictStrategy.LAST_WRITE_WINS,
    notes: ConflictStrategy.MERGE_FIELDS,
    location: ConflictStrategy.LAST_WRITE_WINS
  },
  photos: {
    all_fields: ConflictStrategy.REJECT_CHANGES // Photos are immutable
  }
}
```

#### 3. Batch Processing
```typescript
interface SyncBatch {
  timeEntries: SyncItem[];
  photos: SyncItem[];
  breakEntries: SyncItem[];
  batchId: string;
  deviceId: string;
  timestamp: string;
}
```

## Security Architecture

### Authentication Flow
```
1. Device Startup
   └─→ Validate License Key (Ed25519 signature)
       └─→ Load Worker List
           └─→ Worker PIN Entry
               └─→ Generate Session Token
                   └─→ API Access Granted

2. API Requests
   └─→ License Key Header Validation
       └─→ Session Token Verification  
           └─→ Worker Permission Check
               └─→ Action Authorization
```

### Data Protection

#### Transport Security
- **TLS 1.3**: All API communications encrypted
- **Certificate Pinning**: Mobile apps pin server certificates  
- **Request Signing**: Optional HMAC signing for critical operations

#### Storage Security
- **Database Encryption**: SQLite encrypted with device keychain
- **Photo Encryption**: Files encrypted at rest with AES-256
- **Key Management**: Device-generated keys, server-side key derivation

#### Access Control
```typescript
interface Permission {
  worker_id: number;
  actions: ('read' | 'write' | 'delete')[];
  entities: ('own_time_entries' | 'own_photos' | 'all_jobs')[];
  constraints: {
    time_range?: [string, string];
    job_ids?: number[];
  };
}
```

## Scalability Considerations

### Performance Targets
- **Mobile Sync**: 1000 items in <10 seconds on 3G
- **API Response**: 95th percentile <200ms
- **Database Queries**: <50ms for reports, <10ms for lookups
- **Photo Upload**: 5MB photos in <30 seconds

### Scaling Strategies

#### Horizontal Scaling
```yaml
# Load balancer configuration
api_servers: 3-5 instances
database: Primary + 2 read replicas  
file_storage: S3-compatible with CDN
cache: Redis cluster (3 nodes)
```

#### Caching Strategy
```typescript
// Multi-level caching
const CACHE_STRATEGY = {
  worker_list: { ttl: '1h', level: ['memory', 'redis'] },
  job_definitions: { ttl: '4h', level: ['memory', 'redis'] },
  reports: { ttl: '15m', level: ['redis'] },
  photos: { ttl: '24h', level: ['cdn', 'filesystem'] }
}
```

#### Database Optimization
```sql
-- Strategic indexing
CREATE INDEX idx_time_entries_worker_date ON time_entries(worker_id, DATE(start_time));
CREATE INDEX idx_sync_queue_pending ON sync_queue(retry_count, created_at) WHERE processed = false;
CREATE INDEX idx_photos_time_entry ON photos(time_entry_id, created_at);

-- Partitioning for large datasets
CREATE TABLE time_entries_y2024 PARTITION OF time_entries 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

## Monitoring & Observability

### Metrics Collection
```typescript
// Application metrics
interface Metrics {
  sync: {
    items_per_second: number;
    success_rate: number;
    conflict_rate: number;
    queue_depth: number;
  };
  api: {
    requests_per_second: number;
    response_times: number[];
    error_rate: number;
  };
  storage: {
    photo_upload_rate: number;
    storage_usage: number;
    backup_status: string;
  };
}
```

### Health Checks
```typescript
// Health monitoring endpoints
const HEALTH_CHECKS = [
  { name: 'database', endpoint: '/health/db', timeout: 5000 },
  { name: 'redis', endpoint: '/health/redis', timeout: 2000 },
  { name: 'storage', endpoint: '/health/storage', timeout: 10000 },
  { name: 'license', endpoint: '/health/license', timeout: 1000 }
];
```

### Alerting Rules
```yaml
alerts:
  - name: "High Sync Failure Rate"
    condition: "sync_failure_rate > 10%"
    duration: "5m"
    severity: "warning"
    
  - name: "Database Connection Pool Exhausted"  
    condition: "db_connections_active > 90%"
    duration: "2m"
    severity: "critical"
    
  - name: "Photo Upload Failures"
    condition: "photo_upload_failure_rate > 5%"
    duration: "10m"
    severity: "warning"
```

## Deployment Architecture

### Container Strategy
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder
# ... build steps ...

FROM node:18-alpine AS runtime
# ... runtime configuration ...
EXPOSE 8000
CMD ["node", "dist/index.js"]
```

### Service Orchestration
```yaml
# docker-compose.yml structure
services:
  app:      # Fastify API + Next.js admin
  postgres: # Primary database
  redis:    # Cache and session store
  minio:    # S3-compatible file storage
  nginx:    # Reverse proxy and SSL termination
```

### Environment Management
```bash
# Environment-specific configurations
environments/
├── development.env
├── staging.env  
├── production.env
└── testing.env
```

## Integration Points

### External Systems
```typescript
// Pluggable integrations
interface Integration {
  payroll?: {
    provider: 'quickbooks' | 'adp' | 'csv';
    config: PayrollConfig;
  };
  backup?: {
    provider: 's3' | 'gcs' | 'azure';
    config: BackupConfig;
  };
  notifications?: {
    provider: 'email' | 'slack' | 'webhook';
    config: NotificationConfig;
  };
}
```

### API Design
```typescript
// RESTful API with consistent patterns
interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  auth: 'license' | 'session' | 'admin';
  rateLimit: number;
  validation: ZodSchema;
  response: ResponseSchema;
}
```

This architecture supports the core requirements of offline-first operation, reliable data synchronization, and scalable deployment while maintaining simplicity for small field service operations.