'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PhotoIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ConflictItem {
  id: number;
  type: 'time_entry' | 'photo' | 'break_entry';
  entityId: number;
  conflictType: 'sync' | 'duplicate' | 'mismatch';
  description: string;
  createdAt: string;
  workerName: string;
  jobName?: string;
  jobCode?: string;
  localData: any;
  serverData: any;
  severity: 'high' | 'medium' | 'low';
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

interface ConflictResolution {
  conflictId: number;
  action: 'keep_local' | 'keep_server' | 'merge' | 'manual';
  mergedData?: any;
  notes?: string;
}

const ConflictsPage = () => {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'time_entry' | 'photo' | 'break_entry'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [resolution, setResolution] = useState<ConflictResolution | null>(null);

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      // Mock data for demonstration - replace with actual API call
      const mockConflicts: ConflictItem[] = [
        {
          id: 1,
          type: 'time_entry',
          entityId: 123,
          conflictType: 'sync',
          description: 'Time entry has conflicting end times between local and server data',
          createdAt: '2024-02-05T14:30:00Z',
          workerName: 'John Doe',
          jobName: 'HVAC Maintenance',
          jobCode: 'MAINT-001',
          localData: {
            startTime: '2024-02-05T09:00:00Z',
            endTime: '2024-02-05T17:30:00Z',
            regularHours: 8.5,
            overtimeHours: 0,
          },
          serverData: {
            startTime: '2024-02-05T09:00:00Z',
            endTime: '2024-02-05T17:00:00Z',
            regularHours: 8,
            overtimeHours: 0,
          },
          severity: 'high',
          resolved: false,
        },
        {
          id: 2,
          type: 'photo',
          entityId: 456,
          conflictType: 'duplicate',
          description: 'Photo with same timestamp and location already exists on server',
          createdAt: '2024-02-05T11:15:00Z',
          workerName: 'Jane Smith',
          jobName: 'Plumbing Repair',
          jobCode: 'PLUMB-001',
          localData: {
            fileName: 'photo_1707123456_abc123.jpg',
            capturedAt: '2024-02-05T11:10:00Z',
            latitude: 40.7128,
            longitude: -74.0060,
            fileSize: 2456789,
          },
          serverData: {
            fileName: 'photo_1707123456_def456.jpg',
            capturedAt: '2024-02-05T11:10:00Z',
            latitude: 40.7128,
            longitude: -74.0060,
            fileSize: 2234567,
          },
          severity: 'medium',
          resolved: false,
        },
        {
          id: 3,
          type: 'break_entry',
          entityId: 789,
          conflictType: 'mismatch',
          description: 'Break duration mismatch - local shows 35 minutes, server shows 30 minutes',
          createdAt: '2024-02-05T10:45:00Z',
          workerName: 'Mike Johnson',
          jobName: 'Electrical Work',
          jobCode: 'ELECT-001',
          localData: {
            startTime: '2024-02-05T12:00:00Z',
            endTime: '2024-02-05T12:35:00Z',
            duration: 35,
            breakType: 'Lunch Break',
          },
          serverData: {
            startTime: '2024-02-05T12:00:00Z',
            endTime: '2024-02-05T12:30:00Z',
            duration: 30,
            breakType: 'Lunch Break',
          },
          severity: 'low',
          resolved: true,
          resolvedBy: 'Admin',
          resolvedAt: '2024-02-05T15:30:00Z',
          resolution: 'Kept local data - worker manually ended break late',
        },
      ];
      setConflicts(mockConflicts);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(conflict => {
      const matchesSearch = 
        conflict.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conflict.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conflict.jobName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conflict.jobCode?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || conflict.type === filterType;
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'resolved' && conflict.resolved) ||
        (filterStatus === 'unresolved' && !conflict.resolved);
      const matchesSeverity = filterSeverity === 'all' || conflict.severity === filterSeverity;

      return matchesSearch && matchesType && matchesStatus && matchesSeverity;
    });
  }, [conflicts, searchTerm, filterType, filterStatus, filterSeverity]);

  const handleResolveConflict = (conflict: ConflictItem) => {
    setSelectedConflict(conflict);
    setResolution({
      conflictId: conflict.id,
      action: 'keep_local',
    });
    setShowResolutionDialog(true);
  };

  const handleSubmitResolution = async () => {
    if (!selectedConflict || !resolution) return;

    try {
      // Mock API call - replace with actual implementation
      console.log('Resolving conflict:', resolution);
      
      // Update conflict status locally
      setConflicts(prev => prev.map(c => 
        c.id === selectedConflict.id 
          ? { 
              ...c, 
              resolved: true, 
              resolvedBy: 'Admin', 
              resolvedAt: new Date().toISOString(),
              resolution: `Action: ${resolution.action}${resolution.notes ? ` - ${resolution.notes}` : ''}`,
            }
          : c
      ));

      setShowResolutionDialog(false);
      setSelectedConflict(null);
      setResolution(null);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'time_entry':
        return <ClockIcon className="h-5 w-5" />;
      case 'photo':
        return <PhotoIcon className="h-5 w-5" />;
      case 'break_entry':
        return <ClockIcon className="h-5 w-5" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading conflicts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Conflicts</h1>
          <p className="text-gray-600">Resolve data synchronization conflicts</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {filteredConflicts.filter(c => !c.resolved).length} unresolved conflicts
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search conflicts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="time_entry">Time Entries</option>
              <option value="photo">Photos</option>
              <option value="break_entry">Break Entries</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Conflicts List */}
      <div className="space-y-4">
        {filteredConflicts.map((conflict) => (
          <Card key={conflict.id} className={`p-6 ${conflict.resolved ? 'bg-gray-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`p-2 rounded-lg ${getSeverityColor(conflict.severity)}`}>
                  {getTypeIcon(conflict.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(conflict.severity)}`}>
                      {conflict.severity.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {conflict.type.replace('_', ' ').toUpperCase()}
                    </span>
                    {conflict.resolved && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50 border border-green-200">
                        RESOLVED
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {conflict.description}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2" />
                      {conflict.workerName}
                    </div>
                    {conflict.jobName && (
                      <div className="flex items-center">
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        {conflict.jobCode} - {conflict.jobName}
                      </div>
                    )}
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {formatDateTime(conflict.createdAt)}
                    </div>
                  </div>

                  {conflict.resolved && conflict.resolution && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Resolution:</strong> {conflict.resolution}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Resolved by {conflict.resolvedBy} on {conflict.resolvedAt && formatDateTime(conflict.resolvedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {!conflict.resolved && (
                <Button
                  onClick={() => handleResolveConflict(conflict)}
                  className="ml-4"
                >
                  Resolve
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredConflicts.length === 0 && (
        <Card className="p-12 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No conflicts found</h3>
          <p className="mt-2 text-gray-600">
            {searchTerm || filterType !== 'all' || filterStatus !== 'unresolved'
              ? 'Try adjusting your search or filters' 
              : 'All sync conflicts have been resolved'}
          </p>
        </Card>
      )}

      {/* Resolution Dialog */}
      {showResolutionDialog && selectedConflict && resolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Resolve Conflict</h3>
                <button
                  onClick={() => setShowResolutionDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Conflict Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">{selectedConflict.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-medium">Worker:</p>
                      <p>{selectedConflict.workerName}</p>
                    </div>
                    <div>
                      <p className="font-medium">Job:</p>
                      <p>{selectedConflict.jobName || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Choose Resolution</h4>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="keep_local"
                      checked={resolution.action === 'keep_local'}
                      onChange={(e) => setResolution(prev => prev ? { ...prev, action: e.target.value as any } : null)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">Keep Local Data</div>
                      <div className="text-sm text-gray-600">Use the data from the mobile device</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="keep_server"
                      checked={resolution.action === 'keep_server'}
                      onChange={(e) => setResolution(prev => prev ? { ...prev, action: e.target.value as any } : null)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">Keep Server Data</div>
                      <div className="text-sm text-gray-600">Use the existing server data</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="merge"
                      checked={resolution.action === 'merge'}
                      onChange={(e) => setResolution(prev => prev ? { ...prev, action: e.target.value as any } : null)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">Merge Data</div>
                      <div className="text-sm text-gray-600">Combine both datasets intelligently</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes (Optional)
                </label>
                <textarea
                  value={resolution.notes || ''}
                  onChange={(e) => setResolution(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add notes about your resolution decision..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowResolutionDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitResolution}
                  className="flex-1"
                >
                  Resolve Conflict
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ConflictsPage;