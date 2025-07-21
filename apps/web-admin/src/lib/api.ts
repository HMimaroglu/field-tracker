import { createApiClient } from '@field-tracker/api-client';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
});

// Admin API client with authentication
export class AdminApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async login(password: string) {
    const response = await this.request<any>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    if (response.success) {
      this.setToken(response.data.token);
    }

    return response;
  }

  // Workers
  async getWorkers(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, value.toString());
      });
    }
    
    return this.request<any>(`/api/workers?${query.toString()}`);
  }

  async createWorker(worker: { employeeId: string; name: string; pin: string; isActive?: boolean }) {
    return this.request<any>('/api/workers', {
      method: 'POST',
      body: JSON.stringify(worker),
    });
  }

  async updateWorker(id: number, updates: Partial<{ employeeId: string; name: string; pin: string; isActive: boolean }>) {
    return this.request<any>(`/api/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteWorker(id: number) {
    return this.request<any>(`/api/workers/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkImportWorkers(workers: Array<{ employeeId: string; name: string; pin: string; isActive?: boolean }>) {
    return this.request<any>('/api/workers/bulk', {
      method: 'POST',
      body: JSON.stringify({ workers }),
    });
  }

  // Jobs
  async getJobs(params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, value.toString());
      });
    }
    
    return this.request<any>(`/api/jobs?${query.toString()}`);
  }

  async createJob(job: { jobCode: string; name: string; description?: string; tags?: string[]; isActive?: boolean }) {
    return this.request<any>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  async updateJob(id: number, updates: Partial<{ jobCode: string; name: string; description: string; tags: string[]; isActive: boolean }>) {
    return this.request<any>(`/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteJob(id: number) {
    return this.request<any>(`/api/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  // Time Entries & Reports
  async getTimeEntries(params?: { 
    page?: number; 
    limit?: number; 
    workerId?: number; 
    jobId?: number; 
    startDate?: string; 
    endDate?: string;
    hasConflict?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, value.toString());
      });
    }
    
    return this.request<any>(`/api/time-entries?${query.toString()}`);
  }

  async exportTimesheet(params: {
    startDate: string;
    endDate: string;
    workerIds?: number[];
    jobIds?: number[];
    includeBreaks?: boolean;
    payrollPeriod?: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  }) {
    return this.request<any>('/api/reports/export', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getTimesheetReport(params: {
    startDate: string;
    endDate: string;
    workerIds?: number[];
    jobIds?: number[];
    includeBreaks?: boolean;
    groupBy?: 'worker' | 'job' | 'day';
  }) {
    return this.request<any>('/api/reports/timesheet', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // License Management
  async getLicenseStatus() {
    return this.request<any>('/api/auth/license/status');
  }

  async uploadLicense(file: File) {
    const formData = new FormData();
    formData.append('license', file);

    return fetch(`${API_BASE_URL}/api/license`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    }).then(res => res.json());
  }

  // Conflicts
  async getConflicts() {
    return this.request<any>('/api/reports/conflicts');
  }

  async resolveConflict(id: number, action: 'split' | 'merge' | 'discard' | 'accept_as_is') {
    return this.request<any>(`/api/reports/conflicts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }
}

export const adminApi = new AdminApiClient();