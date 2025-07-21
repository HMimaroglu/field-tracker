'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { adminApi } from '@/lib/api';
import { 
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface TimeEntry {
  id: number;
  offlineGuid: string;
  workerId: number;
  jobId: number;
  startTime: string;
  endTime: string | null;
  regularHours: number | null;
  overtimeHours: number | null;
  notes: string | null;
  worker: {
    employeeId: string;
    name: string;
  };
  job: {
    jobCode: string;
    name: string;
  };
  createdAt: string;
}

interface Worker {
  id: number;
  employeeId: string;
  name: string;
}

interface Job {
  id: number;
  jobCode: string;
  name: string;
}

export default function ReportsPage() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    workerId: '',
    jobId: '',
    search: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTimeEntries();
  }, [filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load workers and jobs for filters
      const [workersResponse, jobsResponse] = await Promise.all([
        adminApi.getWorkers({ limit: 1000 }),
        adminApi.getJobs({ limit: 1000 }),
      ]);

      if (workersResponse.success) {
        setWorkers(workersResponse.data.data || []);
      }

      if (jobsResponse.success) {
        setJobs(jobsResponse.data.data || []);
      }

      await loadTimeEntries();
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load reports data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeEntries = async () => {
    try {
      const params: any = {
        limit: 1000,
        ...(filters.workerId && { workerId: parseInt(filters.workerId) }),
        ...(filters.jobId && { jobId: parseInt(filters.jobId) }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };

      const response = await adminApi.getTimeEntries(params);
      
      if (response.success) {
        let entries = response.data.data || [];
        
        // Apply search filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          entries = entries.filter((entry: TimeEntry) =>
            entry.worker?.name.toLowerCase().includes(searchTerm) ||
            entry.worker?.employeeId.toLowerCase().includes(searchTerm) ||
            entry.job?.jobCode.toLowerCase().includes(searchTerm) ||
            entry.job?.name.toLowerCase().includes(searchTerm) ||
            entry.notes?.toLowerCase().includes(searchTerm)
          );
        }
        
        setTimeEntries(entries);
      }
    } catch (error) {
      console.error('Failed to load time entries:', error);
      alert('Failed to load time entries');
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      
      const params = {
        format: 'csv' as const,
        ...(filters.workerId && { workerId: parseInt(filters.workerId) }),
        ...(filters.jobId && { jobId: parseInt(filters.jobId) }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };

      const response = await adminApi.exportTimesheet(params);
      
      if (response.success) {
        // Create and download CSV file
        const blob = new Blob([response.data.content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || 'timesheet-export.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'In Progress';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return `${diffHours.toFixed(2)}h`;
  };

  const getTotalHours = () => {
    return timeEntries.reduce((total, entry) => {
      if (entry.regularHours) total += parseFloat(entry.regularHours.toString());
      if (entry.overtimeHours) total += parseFloat(entry.overtimeHours.toString());
      return total;
    }, 0).toFixed(2);
  };

  const getDateRange = () => {
    if (!timeEntries.length) return '';
    
    const dates = timeEntries.map(entry => new Date(entry.startTime));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">View and export timesheet data</p>
        </div>
        
        <Button 
          onClick={handleExportCSV}
          disabled={isExporting || timeEntries.length === 0}
          isLoading={isExporting}
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{timeEntries.length}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{getTotalHours()}h</p>
              </div>
              <ClockIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Date Range</p>
                <p className="text-sm font-bold text-gray-900">{getDateRange()}</p>
              </div>
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Active Workers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(timeEntries.map(e => e.workerId)).size}
                </p>
              </div>
              <UserIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter timesheet data by date, worker, or job</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input mt-1"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input mt-1"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            
            <div>
              <label className="label">Worker</label>
              <select
                className="input mt-1"
                value={filters.workerId}
                onChange={(e) => setFilters({ ...filters, workerId: e.target.value })}
              >
                <option value="">All Workers</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name} ({worker.employeeId})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">Job</label>
              <select
                className="input mt-1"
                value={filters.jobId}
                onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
              >
                <option value="">All Jobs</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.jobCode} - {job.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">Search</label>
              <div className="relative mt-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Search entries..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries ({timeEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No time entries found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Job</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Duration</th>
                    <th>Regular</th>
                    <th>Overtime</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <div>
                          <div className="font-medium">{entry.worker?.name}</div>
                          <div className="text-sm text-gray-600">{entry.worker?.employeeId}</div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium">{entry.job?.jobCode}</div>
                          <div className="text-sm text-gray-600">{entry.job?.name}</div>
                        </div>
                      </td>
                      <td className="text-sm">
                        {new Date(entry.startTime).toLocaleDateString()}<br />
                        {new Date(entry.startTime).toLocaleTimeString()}
                      </td>
                      <td className="text-sm">
                        {entry.endTime ? (
                          <>
                            {new Date(entry.endTime).toLocaleDateString()}<br />
                            {new Date(entry.endTime).toLocaleTimeString()}
                          </>
                        ) : (
                          <span className="text-yellow-600">In Progress</span>
                        )}
                      </td>
                      <td className="font-medium">
                        {formatDuration(entry.startTime, entry.endTime)}
                      </td>
                      <td className="text-center">
                        {entry.regularHours ? `${entry.regularHours}h` : '-'}
                      </td>
                      <td className="text-center">
                        {entry.overtimeHours ? `${entry.overtimeHours}h` : '-'}
                      </td>
                      <td className="text-sm text-gray-600 max-w-xs truncate">
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}