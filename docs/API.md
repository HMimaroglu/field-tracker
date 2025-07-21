# Field Tracker API Documentation

## Overview

The Field Tracker API is built with Fastify and provides RESTful endpoints for mobile app synchronization, admin dashboard operations, and system management.

**Base URL**: `http://localhost:8000` (development) / `https://api.yourdomain.com` (production)

## Authentication

### License Key Authentication
All API requests require a valid license key in the header:

```http
X-License-Key: FT-PROD-LICENSE-2024-ABCD1234EFGH5678
```

### Worker PIN Authentication
Most endpoints also require worker PIN authentication:

```http
X-Worker-PIN: 1234
```

### Admin Authentication
Admin endpoints require additional authentication:

```http
Authorization: Bearer <admin-token>
```

## Rate Limiting

- **Default**: 1000 requests per 15 minutes per IP
- **File uploads**: 50 requests per 15 minutes per IP
- **Admin endpoints**: 200 requests per 15 minutes per user

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-02-05T12:00:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": { ... }
  },
  "timestamp": "2024-02-05T12:00:00Z"
}
```

## System Endpoints

### Health Check
Get system health status.

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-02-05T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "available"
  }
}
```

### License Validation
Validate license key and get system limits.

```http
POST /api/license/validate
Content-Type: application/json

{
  "key": "FT-PROD-LICENSE-2024-ABCD1234EFGH5678"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "company": "Your Company",
    "maxWorkers": 25,
    "features": ["offline", "photos", "reports"],
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

## Workers API

### List Workers
Get all workers in the system.

```http
GET /api/workers
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employeeId": "EMP001",
      "name": "John Doe",
      "isActive": true,
      "createdAt": "2024-02-01T08:00:00Z",
      "updatedAt": "2024-02-01T08:00:00Z"
    }
  ]
}
```

### Get Worker
Get specific worker details.

```http
GET /api/workers/{id}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

### Create Worker
Create a new worker.

```http
POST /api/workers
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN

{
  "employeeId": "EMP001",
  "name": "John Doe",
  "pin": "1234",
  "isActive": true
}
```

### Update Worker
Update existing worker.

```http
PUT /api/workers/{id}
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN

{
  "name": "John Doe Updated",
  "isActive": false
}
```

### Delete Worker
Delete a worker (soft delete).

```http
DELETE /api/workers/{id}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN
```

## Jobs API

### List Jobs
Get all jobs in the system.

```http
GET /api/jobs
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "jobCode": "MAINT-001",
      "name": "HVAC Maintenance",
      "description": "Regular maintenance of HVAC systems",
      "isActive": true,
      "createdAt": "2024-02-01T08:00:00Z"
    }
  ]
}
```

### Get Job
Get specific job details.

```http
GET /api/jobs/{id}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

### Create Job
Create a new job.

```http
POST /api/jobs
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN

{
  "jobCode": "MAINT-001",
  "name": "HVAC Maintenance",
  "description": "Regular maintenance of HVAC systems",
  "isActive": true
}
```

### Update Job
Update existing job.

```http
PUT /api/jobs/{id}
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN

{
  "name": "Updated Job Name",
  "description": "Updated description"
}
```

### Delete Job
Delete a job (soft delete).

```http
DELETE /api/jobs/{id}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN
```

## Time Entries API

### List Time Entries
Get time entries with optional filtering.

```http
GET /api/time-entries?workerId={id}&startDate={date}&endDate={date}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

**Query Parameters:**
- `workerId` (optional): Filter by worker ID
- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `limit` (optional): Limit results (default 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "offlineGuid": "te_1707123456_abc123",
      "workerId": 1,
      "workerName": "John Doe",
      "jobId": 1,
      "jobCode": "MAINT-001",
      "jobName": "HVAC Maintenance",
      "startTime": "2024-02-05T09:00:00Z",
      "endTime": "2024-02-05T17:30:00Z",
      "regularHours": 8,
      "overtimeHours": 0.5,
      "startLatitude": 40.7128,
      "startLongitude": -74.0060,
      "endLatitude": 40.7589,
      "endLongitude": -73.9851,
      "notes": "Completed routine maintenance",
      "photoCount": 2,
      "breakCount": 1,
      "totalBreakMinutes": 30,
      "isSynced": true,
      "createdAt": "2024-02-05T09:00:00Z",
      "updatedAt": "2024-02-05T17:35:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

### Get Time Entry
Get specific time entry details.

```http
GET /api/time-entries/{id}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

### Create Time Entry
Create a new time entry.

```http
POST /api/time-entries
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234

{
  "offlineGuid": "te_1707123456_abc123",
  "workerId": 1,
  "jobId": 1,
  "startTime": "2024-02-05T09:00:00Z",
  "startLatitude": 40.7128,
  "startLongitude": -74.0060,
  "notes": "Starting HVAC maintenance work"
}
```

### Update Time Entry
Update existing time entry (typically to end it).

```http
PUT /api/time-entries/{id}
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234

{
  "endTime": "2024-02-05T17:30:00Z",
  "endLatitude": 40.7589,
  "endLongitude": -73.9851,
  "regularHours": 8,
  "overtimeHours": 0.5,
  "notes": "Completed maintenance work"
}
```

## Photos API

### Upload Photo
Upload a photo file.

```http
POST /api/photos/upload
Content-Type: multipart/form-data
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234

form-data:
  file: <photo-file>
  timeEntryId: 1
  capturedAt: 2024-02-05T12:30:00Z
  latitude: 40.7128
  longitude: -74.0060
  notes: "Before photo of equipment"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fileName": "photo_1707134400_abc123.jpg",
    "filePath": "photos/2024/02/05/photo_1707134400_abc123.jpg",
    "fileUrl": "https://your-domain.com/api/photos/1707134400_abc123.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 2456789,
    "timeEntryId": 1,
    "capturedAt": "2024-02-05T12:30:00Z",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "notes": "Before photo of equipment"
  }
}
```

### List Photos
Get photos with optional filtering.

```http
GET /api/photos?timeEntryId={id}&workerId={id}&date={date}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

### Get Photo
Get photo metadata and download URL.

```http
GET /api/photos/{id}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

### Download Photo
Download photo file.

```http
GET /api/photos/{id}/download
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

**Response:** Binary photo data with appropriate content-type headers.

## Sync API

### Sync Time Entries
Bulk sync time entries from mobile device.

```http
POST /api/sync/time-entries
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234

{
  "entries": [
    {
      "offlineGuid": "te_1707123456_abc123",
      "workerId": 1,
      "jobId": 1,
      "startTime": "2024-02-05T09:00:00Z",
      "endTime": "2024-02-05T17:30:00Z",
      "regularHours": 8,
      "overtimeHours": 0.5,
      "startLatitude": 40.7128,
      "startLongitude": -74.0060,
      "endLatitude": 40.7589,
      "endLongitude": -73.9851,
      "notes": "Completed routine maintenance"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 1,
    "successful": ["te_1707123456_abc123"],
    "failed": [],
    "conflicts": []
  }
}
```

### Sync Photos
Bulk sync photos with base64 data.

```http
POST /api/photos/sync
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234

{
  "photos": [
    {
      "offlineGuid": "photo_1707134400_abc123",
      "timeEntryId": 1,
      "fileName": "photo_001.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 2456789,
      "capturedAt": "2024-02-05T12:30:00Z",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE..."
    }
  ]
}
```

### Sync Status
Get synchronization status and queue information.

```http
GET /api/sync/status
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

**Response:**
```json
{
  "success": true,
  "data": {
    "queueLength": 5,
    "lastSyncAt": "2024-02-05T17:30:00Z",
    "pendingItems": [
      {
        "type": "time_entry",
        "entityGuid": "te_1707123456_def456",
        "retryCount": 2,
        "lastError": "Network timeout"
      }
    ]
  }
}
```

## Reports API

### Generate Timesheet Report
Generate timesheet data for specified date range.

```http
GET /api/reports/timesheet?startDate={date}&endDate={date}&workerId={id}&format={format}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN
```

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `workerId` (optional): Filter by worker ID
- `jobId` (optional): Filter by job ID
- `format` (optional): Response format ("json" or "csv", default "json")

**JSON Response:**
```json
{
  "success": true,
  "data": [
    {
      "workerId": 1,
      "workerName": "John Doe",
      "employeeId": "EMP001",
      "date": "2024-02-05",
      "jobCode": "MAINT-001",
      "jobName": "HVAC Maintenance",
      "regularHours": 8,
      "overtimeHours": 0.5,
      "totalBreakMinutes": 30,
      "startTime": "2024-02-05T09:00:00Z",
      "endTime": "2024-02-05T17:30:00Z",
      "startLatitude": 40.7128,
      "startLongitude": -74.0060,
      "notes": "Completed routine maintenance"
    }
  ],
  "meta": {
    "totalEntries": 1,
    "totalRegularHours": 8,
    "totalOvertimeHours": 0.5,
    "dateRange": {
      "start": "2024-02-05",
      "end": "2024-02-05"
    }
  }
}
```

### Export CSV
Generate CSV export for payroll systems.

```http
GET /api/reports/timesheet/csv?startDate={date}&endDate={date}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN
```

**Response Headers:**
```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="timesheet_20240205.csv"
```

**CSV Format:**
```csv
EmployeeID,EmployeeName,Date,JobCode,JobName,RegularHours,OvertimeHours,BreakMinutes,StartTime,EndTime,Latitude,Longitude,Notes
EMP001,John Doe,2024-02-05,MAINT-001,HVAC Maintenance,8.0,0.5,30,2024-02-05 09:00:00,2024-02-05 17:30:00,40.7128,-74.0060,Completed routine maintenance
```

### Summary Report
Get summary statistics for date range.

```http
GET /api/reports/summary?startDate={date}&endDate={date}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalWorkers": 5,
    "totalJobs": 12,
    "totalTimeEntries": 150,
    "totalRegularHours": 1200,
    "totalOvertimeHours": 75,
    "totalPhotos": 450,
    "averageHoursPerWorker": 255,
    "mostActiveWorker": {
      "id": 1,
      "name": "John Doe",
      "hours": 320
    },
    "mostActiveJob": {
      "id": 1,
      "code": "MAINT-001",
      "name": "HVAC Maintenance",
      "hours": 180
    }
  }
}
```

## Break Entries API

### List Breaks
Get break entries for a time entry.

```http
GET /api/break-entries?timeEntryId={id}
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234
```

### Create Break Entry
Start a new break.

```http
POST /api/break-entries
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234

{
  "offlineGuid": "break_1707134400_abc123",
  "timeEntryId": 1,
  "breakTypeId": 1,
  "startTime": "2024-02-05T12:00:00Z",
  "notes": "Lunch break"
}
```

### Update Break Entry
End a break.

```http
PUT /api/break-entries/{id}
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: 1234

{
  "endTime": "2024-02-05T12:30:00Z",
  "durationMinutes": 30
}
```

## Admin API

### Get Dashboard Stats
Get real-time dashboard statistics.

```http
GET /api/admin/stats
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeWorkers": 8,
    "activeJobs": 12,
    "todayHours": 64,
    "pendingSyncItems": 23,
    "conflictsCount": 2,
    "storageUsed": "2.4 GB",
    "lastSyncAt": "2024-02-05T17:30:00Z"
  }
}
```

### List Conflicts
Get synchronization conflicts requiring resolution.

```http
GET /api/admin/conflicts
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN
```

### Resolve Conflict
Resolve a specific conflict.

```http
POST /api/admin/conflicts/{id}/resolve
Content-Type: application/json
X-License-Key: YOUR_LICENSE_KEY
X-Worker-PIN: ADMIN_PIN

{
  "resolution": "keep_local", // or "keep_server", "merge"
  "mergedData": { ... }, // if resolution is "merge"
  "notes": "Resolved by keeping local data"
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_LICENSE` | 401 | Invalid or expired license key |
| `INVALID_PIN` | 401 | Invalid worker PIN |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Data conflict detected |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `STORAGE_ERROR` | 500 | File storage operation failed |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `SYNC_ERROR` | 500 | Synchronization operation failed |

## Rate Limits

Rate limits are applied per IP address and license key combination:

| Endpoint Category | Limit | Window |
|-------------------|--------|---------|
| General API | 1000 requests | 15 minutes |
| File Upload | 50 requests | 15 minutes |
| Sync Operations | 200 requests | 15 minutes |
| Reports | 100 requests | 15 minutes |
| Admin Operations | 200 requests | 15 minutes |

## Testing

### API Testing
```bash
# Test server health
curl http://localhost:8000/health

# Test authentication
curl -H "X-License-Key: FT-DEV-LICENSE-2024-ABCD1234EFGH5678" \
     -H "X-Worker-PIN: 1234" \
     http://localhost:8000/api/workers

# Test file upload
curl -X POST \
     -H "X-License-Key: FT-DEV-LICENSE-2024-ABCD1234EFGH5678" \
     -H "X-Worker-PIN: 1234" \
     -F "file=@test-photo.jpg" \
     -F "timeEntryId=1" \
     http://localhost:8000/api/photos/upload
```

### Postman Collection
A complete Postman collection is available at `/docs/postman/field-tracker-api.json` with all endpoints and example requests.

## SDK

### JavaScript/TypeScript SDK
```typescript
import { FieldTrackerAPI } from '@field-tracker/api-client';

const api = new FieldTrackerAPI({
  baseURL: 'https://api.yourdomain.com',
  licenseKey: 'YOUR_LICENSE_KEY',
  workerPIN: '1234'
});

// Get workers
const workers = await api.workers.list();

// Create time entry
const timeEntry = await api.timeEntries.create({
  workerId: 1,
  jobId: 1,
  startTime: new Date().toISOString()
});

// Upload photo
const photo = await api.photos.upload(file, {
  timeEntryId: timeEntry.id,
  latitude: 40.7128,
  longitude: -74.0060
});
```