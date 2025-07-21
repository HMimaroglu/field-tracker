import type { 
  Worker, 
  Job, 
  TimeEntry, 
  BreakEntry, 
  Photo, 
  SyncPushData, 
  SyncPullData, 
  ApiResponse,
  PaginatedResponse,
  CsvExportRequest
} from '@field-tracker/db-schema';

/**
 * API client types and interfaces for field tracker
 * Used by both mobile app and web admin
 */

export interface ApiClient {
  // Sync endpoints
  sync: {
    push(data: SyncPushData): Promise<ApiResponse<{ conflicts: any[] }>>;
    pull(lastSync?: Date): Promise<ApiResponse<SyncPullData>>;
    status(): Promise<ApiResponse<{ lastSync: Date; serverTime: Date }>>;
  };
  
  // Worker management (admin only)
  workers: {
    list(): Promise<ApiResponse<Worker[]>>;
    create(worker: Omit<Worker, 'id'>): Promise<ApiResponse<Worker>>;
    update(id: number, worker: Partial<Worker>): Promise<ApiResponse<Worker>>;
    delete(id: number): Promise<ApiResponse<void>>;
    bulkImport(workers: Omit<Worker, 'id'>[]): Promise<ApiResponse<{ created: Worker[]; errors: any[] }>>;
  };
  
  // Job management (admin only)
  jobs: {
    list(): Promise<ApiResponse<Job[]>>;
    create(job: Omit<Job, 'id'>): Promise<ApiResponse<Job>>;
    update(id: number, job: Partial<Job>): Promise<ApiResponse<Job>>;
    delete(id: number): Promise<ApiResponse<void>>;
  };
  
  // Time tracking
  timeEntries: {
    list(filters?: TimeEntryFilters): Promise<ApiResponse<PaginatedResponse<TimeEntryWithDetails>>>;
    create(entry: Omit<TimeEntry, 'id'>): Promise<ApiResponse<TimeEntry>>;
    update(id: number, entry: Partial<TimeEntry>): Promise<ApiResponse<TimeEntry>>;
    delete(id: number): Promise<ApiResponse<void>>;
  };
  
  // Reports and exports
  reports: {
    timesheet(request: TimesheetRequest): Promise<ApiResponse<TimesheetData>>;
    export(request: CsvExportRequest): Promise<ApiResponse<{ downloadUrl: string }>>;
    conflicts(): Promise<ApiResponse<ConflictRecord[]>>;
    resolveConflict(id: number, action: ConflictAction): Promise<ApiResponse<void>>;
  };
  
  // Photos
  photos: {
    upload(timeEntryId: number, file: File): Promise<ApiResponse<Photo>>;
    list(timeEntryId?: number): Promise<ApiResponse<Photo[]>>;
    delete(id: number): Promise<ApiResponse<void>>;
  };
  
  // License management (admin only)
  license: {
    upload(file: File): Promise<ApiResponse<LicenseStatus>>;
    status(): Promise<ApiResponse<LicenseStatus>>;
    validate(): Promise<ApiResponse<{ isValid: boolean; details: any }>>;
  };
}

export interface TimeEntryFilters {
  workerId?: number;
  jobId?: number;
  startDate?: Date;
  endDate?: Date;
  hasConflict?: boolean;
  page?: number;
  limit?: number;
}

export interface TimeEntryWithDetails extends TimeEntry {
  worker: Pick<Worker, 'id' | 'name' | 'employeeId'>;
  job: Pick<Job, 'id' | 'name' | 'jobCode'>;
  breakEntries: BreakEntry[];
  photos: Photo[];
}

export interface TimesheetRequest {
  startDate: Date;
  endDate: Date;
  workerIds?: number[];
  jobIds?: number[];
  includeBreaks?: boolean;
  groupBy?: 'worker' | 'job' | 'day';
}

export interface TimesheetData {
  entries: TimeEntryWithDetails[];
  summary: {
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    breakMinutes: number;
    workersCount: number;
    jobsCount: number;
  };
  workers: Worker[];
  jobs: Job[];
  period: {
    start: Date;
    end: Date;
    type: string;
  };
}

export interface ConflictRecord {
  id: number;
  type: 'time_overlap' | 'duplicate_entry' | 'invalid_data';
  description: string;
  affectedEntries: TimeEntryWithDetails[];
  suggestedResolution: string;
  createdAt: Date;
}

export type ConflictAction = 'split' | 'merge' | 'discard' | 'accept_as_is';

export interface LicenseStatus {
  isValid: boolean;
  seatsUsed: number;
  seatsMax: number;
  daysUntilExpiry: number | null;
  warnings: string[];
  errors: string[];
}

/**
 * Create API client with base configuration
 */
export function createApiClient(config: ApiConfig): ApiClient {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  
  const request = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    try {
      const url = `${baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...config.headers,
        ...options.headers,
      };
      
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
  
  return {
    sync: {
      push: (data) => request('/api/sync/push', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      pull: (lastSync) => request(`/api/sync/pull${lastSync ? `?since=${lastSync.toISOString()}` : ''}`),
      status: () => request('/api/sync/status'),
    },
    
    workers: {
      list: () => request('/api/workers'),
      create: (worker) => request('/api/workers', {
        method: 'POST',
        body: JSON.stringify(worker),
      }),
      update: (id, worker) => request(`/api/workers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(worker),
      }),
      delete: (id) => request(`/api/workers/${id}`, { method: 'DELETE' }),
      bulkImport: (workers) => request('/api/workers/bulk', {
        method: 'POST',
        body: JSON.stringify({ workers }),
      }),
    },
    
    jobs: {
      list: () => request('/api/jobs'),
      create: (job) => request('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(job),
      }),
      update: (id, job) => request(`/api/jobs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(job),
      }),
      delete: (id) => request(`/api/jobs/${id}`, { method: 'DELETE' }),
    },
    
    timeEntries: {
      list: (filters) => {
        const params = new URLSearchParams();
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
              params.append(key, value.toString());
            }
          });
        }
        return request(`/api/time-entries?${params.toString()}`);
      },
      create: (entry) => request('/api/time-entries', {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
      update: (id, entry) => request(`/api/time-entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      }),
      delete: (id) => request(`/api/time-entries/${id}`, { method: 'DELETE' }),
    },
    
    reports: {
      timesheet: (req) => request('/api/reports/timesheet', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
      export: (req) => request('/api/reports/export', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
      conflicts: () => request('/api/reports/conflicts'),
      resolveConflict: (id, action) => request(`/api/reports/conflicts/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }),
    },
    
    photos: {
      upload: async (timeEntryId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('timeEntryId', timeEntryId.toString());
        
        return request('/api/photos', {
          method: 'POST',
          body: formData,
          headers: {}, // Let browser set Content-Type for FormData
        });
      },
      list: (timeEntryId) => request(`/api/photos${timeEntryId ? `?timeEntryId=${timeEntryId}` : ''}`),
      delete: (id) => request(`/api/photos/${id}`, { method: 'DELETE' }),
    },
    
    license: {
      upload: async (file) => {
        const formData = new FormData();
        formData.append('license', file);
        
        return request('/api/license', {
          method: 'POST',
          body: formData,
          headers: {},
        });
      },
      status: () => request('/api/license/status'),
      validate: () => request('/api/license/validate'),
    },
  };
}

export interface ApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}