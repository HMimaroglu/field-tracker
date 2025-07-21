'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon,
  ClockIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  MapPinIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface TimeEntry {
  id: number;
  offlineGuid: string;
  workerId: number;
  workerName: string;
  workerEmployeeId: string;
  jobId: number;
  jobName: string;
  jobCode: string;
  startTime: string;
  endTime?: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  notes?: string;
  regularHours?: number;
  overtimeHours?: number;
  isSynced: boolean;
  hasConflict: boolean;
  photoCount: number;
  breakCount: number;
  totalBreakMinutes: number;
  createdAt: string;
  lastSyncAt?: string;
}

interface Break {
  id: number;
  breakTypeName: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  isPaid: boolean;
  notes?: string;
}

const TimeEntriesPage = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'synced' | 'pending' | 'conflict'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [entryBreaks, setEntryBreaks] = useState<Break[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchTimeEntries();
  }, [dateRange]);

  const fetchTimeEntries = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration - replace with actual API call
      const mockTimeEntries: TimeEntry[] = [
        {
          id: 1,
          offlineGuid: 'te_123456789_abc',
          workerId: 1,
          workerName: 'John Doe',
          workerEmployeeId: 'EMP001',
          jobId: 1,
          jobName: 'HVAC Maintenance',
          jobCode: 'MAINT-001',
          startTime: '2024-02-05T09:00:00Z',
          endTime: '2024-02-05T17:30:00Z',
          startLatitude: 40.7128,
          startLongitude: -74.0060,
          endLatitude: 40.7589,
          endLongitude: -73.9851,
          notes: 'Replaced air filters and checked system pressure',
          regularHours: 8,
          overtimeHours: 0.5,
          isSynced: true,
          hasConflict: false,
          photoCount: 3,
          breakCount: 2,
          totalBreakMinutes: 45,
          createdAt: '2024-02-05T09:00:00Z',
          lastSyncAt: '2024-02-05T17:35:00Z',
        },
        {
          id: 2,
          offlineGuid: 'te_123456790_def',
          workerId: 2,
          workerName: 'Jane Smith',
          workerEmployeeId: 'EMP002',
          jobId: 2,
          jobName: 'Plumbing Repair',
          jobCode: 'PLUMB-001',
          startTime: '2024-02-05T08:30:00Z',
          endTime: '2024-02-05T16:45:00Z',
          startLatitude: 40.7831,
          startLongitude: -73.9712,
          endLatitude: 40.7831,
          endLongitude: -73.9712,
          notes: 'Fixed kitchen sink leak and replaced faucet',
          regularHours: 8,
          overtimeHours: 0.25,
          isSynced: false,
          hasConflict: true,
          photoCount: 5,
          breakCount: 1,
          totalBreakMinutes: 30,
          createdAt: '2024-02-05T08:30:00Z',
        },
        {
          id: 3,
          offlineGuid: 'te_123456791_ghi',
          workerId: 3,
          workerName: 'Mike Johnson',
          workerEmployeeId: 'EMP003',
          jobId: 3,
          jobName: 'Electrical Work',
          jobCode: 'ELECT-001',
          startTime: '2024-02-05T10:00:00Z',
          startLatitude: 40.7580,
          startLongitude: -73.9855,
          regularHours: 0,
          overtimeHours: 0,
          isSynced: false,
          hasConflict: false,
          photoCount: 1,
          breakCount: 0,
          totalBreakMinutes: 0,
          createdAt: '2024-02-05T10:00:00Z',
        },
      ];
      setTimeEntries(mockTimeEntries);
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntryBreaks = async (timeEntryId: number) => {
    try {
      // Mock data for demonstration - replace with actual API call
      const mockBreaks: Break[] = [
        {
          id: 1,
          breakTypeName: 'Lunch Break',
          startTime: '2024-02-05T12:00:00Z',
          endTime: '2024-02-05T12:30:00Z',
          durationMinutes: 30,
          isPaid: false,
          notes: 'Lunch at nearby cafe',
        },
        {
          id: 2,
          breakTypeName: 'Coffee Break',
          startTime: '2024-02-05T15:00:00Z',
          endTime: '2024-02-05T15:15:00Z',
          durationMinutes: 15,
          isPaid: true,
        },
      ];
      setEntryBreaks(mockBreaks);
    } catch (error) {
      console.error('Failed to fetch breaks:', error);
      setEntryBreaks([]);
    }
  };

  const filteredEntries = useMemo(() => {
    let filtered = timeEntries.filter(entry => {
      const matchesSearch = 
        entry.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.jobName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.jobCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'active' && !entry.endTime) ||
        (filterStatus === 'completed' && entry.endTime) ||
        (filterStatus === 'synced' && entry.isSynced) ||
        (filterStatus === 'pending' && !entry.isSynced && !entry.hasConflict) ||
        (filterStatus === 'conflict' && entry.hasConflict);

      return matchesSearch && matchesStatus;
    });

    // Apply date range filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    if (dateRange !== 'all') {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.startTime);
        switch (dateRange) {
          case 'today':
            return entryDate >= today;
          case 'week':
            return entryDate >= weekAgo;
          case 'month':
            return entryDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [timeEntries, searchTerm, filterStatus, dateRange]);

  const handleViewDetails = async (entry: TimeEntry) => {
    setSelectedEntry(entry);
    await fetchEntryBreaks(entry.id);
    setShowDetailsModal(true);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'In Progress';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusIcon = (entry: TimeEntry) => {
    if (entry.hasConflict) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
    if (!entry.endTime) {
      return <PlayCircleIcon className="h-5 w-5 text-green-600" />;
    }
    if (!entry.isSynced) {
      return <PauseCircleIcon className="h-5 w-5 text-orange-600" />;
    }
    return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
  };

  const getStatusText = (entry: TimeEntry) => {
    if (entry.hasConflict) return 'Conflict';
    if (!entry.endTime) return 'Active';
    if (!entry.isSynced) return 'Pending Sync';
    return 'Synced';
  };

  const getStatusColor = (entry: TimeEntry) => {
    if (entry.hasConflict) return 'text-red-600 bg-red-50';
    if (!entry.endTime) return 'text-green-600 bg-green-50';
    if (!entry.isSynced) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading time entries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Entries</h1>
          <p className="text-gray-600">Monitor worker time tracking and productivity</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {filteredEntries.length} entries found
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-2xl font-bold text-green-600">
            {timeEntries.filter(e => !e.endTime).length}
          </div>
          <div className="text-sm text-gray-600">Active Jobs</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-blue-600">
            {timeEntries.filter(e => e.endTime && e.isSynced).length}
          </div>
          <div className="text-sm text-gray-600">Completed Today</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-orange-600">
            {timeEntries.filter(e => !e.isSynced && !e.hasConflict).length}
          </div>
          <div className="text-sm text-gray-600">Pending Sync</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-red-600">
            {timeEntries.filter(e => e.hasConflict).length}
          </div>
          <div className="text-sm text-gray-600">Conflicts</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending Sync</option>
              <option value="conflict">Conflicts</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Time Entries List */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="p-2 rounded-lg bg-blue-50">
                  {getStatusIcon(entry)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry)}`}>
                      {getStatusText(entry)}
                    </span>
                    {entry.hasConflict && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50">
                        NEEDS ATTENTION
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <UserIcon className="h-4 w-4 mr-2" />
                        Worker
                      </div>
                      <div className="font-medium">{entry.workerName}</div>
                      <div className="text-sm text-gray-500">{entry.workerEmployeeId}</div>
                    </div>
                    
                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        Job
                      </div>
                      <div className="font-medium">{entry.jobName}</div>
                      <div className="text-sm text-gray-500">{entry.jobCode}</div>
                    </div>
                    
                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        Duration
                      </div>
                      <div className="font-medium">{formatDuration(entry.startTime, entry.endTime)}</div>
                      <div className="text-sm text-gray-500">
                        {entry.regularHours ? `${entry.regularHours}h regular` : 'In progress'}
                        {entry.overtimeHours ? `, ${entry.overtimeHours}h overtime` : ''}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Started
                      </div>
                      <div className="font-medium">{formatDateTime(entry.startTime)}</div>
                      {entry.endTime && (
                        <div className="text-sm text-gray-500">
                          Ended: {formatDateTime(entry.endTime)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {(entry.startLatitude && entry.startLongitude) && (
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        GPS Tracked
                      </div>
                    )}
                    {entry.photoCount > 0 && (
                      <div className="flex items-center">
                        <PhotoIcon className="h-4 w-4 mr-1" />
                        {entry.photoCount} Photos
                      </div>
                    )}
                    {entry.breakCount > 0 && (
                      <div className="flex items-center">
                        <PauseCircleIcon className="h-4 w-4 mr-1" />
                        {entry.breakCount} Breaks ({entry.totalBreakMinutes}m)
                      </div>
                    )}
                  </div>

                  {entry.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{entry.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => handleViewDetails(entry)}
                className="ml-4"
              >
                View Details
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <Card className="p-12 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No time entries found</h3>
          <p className="mt-2 text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filters' 
              : 'Time entries will appear here when workers start tracking time'}
          </p>
        </Card>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Time Entry Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Worker:</span>
                      <span>{selectedEntry.workerName} ({selectedEntry.workerEmployeeId})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Job:</span>
                      <span>{selectedEntry.jobCode} - {selectedEntry.jobName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Time:</span>
                      <span>{formatDateTime(selectedEntry.startTime)}</span>
                    </div>
                    {selectedEntry.endTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Time:</span>
                        <span>{formatDateTime(selectedEntry.endTime)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span>{formatDuration(selectedEntry.startTime, selectedEntry.endTime)}</span>
                    </div>
                    {selectedEntry.regularHours && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Regular Hours:</span>
                        <span>{selectedEntry.regularHours}h</span>
                      </div>
                    )}
                    {selectedEntry.overtimeHours && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overtime Hours:</span>
                        <span>{selectedEntry.overtimeHours}h</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Location & Media</h4>
                  <div className="space-y-2 text-sm">
                    {selectedEntry.startLatitude && selectedEntry.startLongitude && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Location:</span>
                        <span>{selectedEntry.startLatitude.toFixed(4)}, {selectedEntry.startLongitude.toFixed(4)}</span>
                      </div>
                    )}
                    {selectedEntry.endLatitude && selectedEntry.endLongitude && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Location:</span>
                        <span>{selectedEntry.endLatitude.toFixed(4)}, {selectedEntry.endLongitude.toFixed(4)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Photos:</span>
                      <span>{selectedEntry.photoCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Breaks:</span>
                      <span>{selectedEntry.breakCount} ({selectedEntry.totalBreakMinutes}m total)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sync Status:</span>
                      <span className={selectedEntry.isSynced ? 'text-green-600' : 'text-orange-600'}>
                        {selectedEntry.isSynced ? 'Synced' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedEntry.notes}</p>
                  </div>
                </div>
              )}

              {entryBreaks.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Break History</h4>
                  <div className="space-y-2">
                    {entryBreaks.map((breakEntry) => (
                      <div key={breakEntry.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{breakEntry.breakTypeName}</div>
                            <div className="text-xs text-gray-600">
                              {formatDateTime(breakEntry.startTime)} - {breakEntry.endTime ? formatDateTime(breakEntry.endTime) : 'Ongoing'}
                            </div>
                            {breakEntry.notes && (
                              <div className="text-xs text-gray-600 mt-1">{breakEntry.notes}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{breakEntry.durationMinutes}m</div>
                            <div className={`text-xs ${breakEntry.isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                              {breakEntry.isPaid ? 'Paid' : 'Unpaid'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TimeEntriesPage;