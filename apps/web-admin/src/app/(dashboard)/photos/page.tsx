'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon,
  PhotoIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Photo {
  id: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  compressedSize?: number;
  capturedAt: string;
  latitude?: number;
  longitude?: number;
  isSynced: boolean;
  timeEntryId?: number;
  workerName?: string;
  jobName?: string;
  jobCode?: string;
  hasConflict?: boolean;
  lastSync?: string;
}

interface TimeEntry {
  id: number;
  startTime: string;
  endTime?: string;
  workerName: string;
  jobName: string;
  jobCode: string;
  hasConflict: boolean;
}

interface ConflictResolution {
  photoId: number;
  action: 'keep' | 'replace' | 'merge';
  resolution: string;
}

const PhotosPage = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'pending' | 'conflict'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');

  useEffect(() => {
    fetchPhotos();
    fetchTimeEntries();
  }, []);

  const fetchPhotos = async () => {
    try {
      // Mock data for demonstration - replace with actual API call
      const mockPhotos: Photo[] = [
        {
          id: 1,
          fileName: 'photo_1707123456_abc12345.jpg',
          filePath: '/uploads/photos/photo_1707123456_abc12345.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2456789,
          compressedSize: 1234567,
          capturedAt: '2024-02-05T10:30:45Z',
          latitude: 40.7128,
          longitude: -74.0060,
          isSynced: true,
          timeEntryId: 1,
          workerName: 'John Doe',
          jobName: 'HVAC Maintenance',
          jobCode: 'MAINT-001',
          hasConflict: false,
          lastSync: '2024-02-05T10:35:12Z',
        },
        {
          id: 2,
          fileName: 'photo_1707123789_def67890.jpg',
          filePath: '/uploads/photos/photo_1707123789_def67890.jpg',
          mimeType: 'image/jpeg',
          fileSize: 3567890,
          compressedSize: 1789045,
          capturedAt: '2024-02-05T14:15:30Z',
          latitude: 40.7589,
          longitude: -73.9851,
          isSynced: false,
          timeEntryId: 2,
          workerName: 'Jane Smith',
          jobName: 'Plumbing Repair',
          jobCode: 'PLUMB-001',
          hasConflict: true,
        },
        {
          id: 3,
          fileName: 'photo_1707124000_ghi34567.jpg',
          filePath: '/uploads/photos/photo_1707124000_ghi34567.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1890234,
          capturedAt: '2024-02-05T16:45:00Z',
          isSynced: false,
          workerName: 'Mike Johnson',
          jobName: 'Electrical Work',
          jobCode: 'ELECT-001',
        },
      ];
      setPhotos(mockPhotos);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      // Mock data - replace with actual API call
      const mockTimeEntries: TimeEntry[] = [
        {
          id: 1,
          startTime: '2024-02-05T09:00:00Z',
          endTime: '2024-02-05T17:00:00Z',
          workerName: 'John Doe',
          jobName: 'HVAC Maintenance',
          jobCode: 'MAINT-001',
          hasConflict: false,
        },
        {
          id: 2,
          startTime: '2024-02-05T13:00:00Z',
          endTime: '2024-02-05T18:00:00Z',
          workerName: 'Jane Smith',
          jobName: 'Plumbing Repair',
          jobCode: 'PLUMB-001',
          hasConflict: true,
        },
      ];
      setTimeEntries(mockTimeEntries);
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
    }
  };

  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      const matchesSearch = 
        photo.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.workerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.jobName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.jobCode?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = 
        filterStatus === 'all' ||
        (filterStatus === 'synced' && photo.isSynced) ||
        (filterStatus === 'pending' && !photo.isSynced && !photo.hasConflict) ||
        (filterStatus === 'conflict' && photo.hasConflict);

      return matchesSearch && matchesFilter;
    });
  }, [photos, searchTerm, filterStatus]);

  const handleViewImage = (photo: Photo) => {
    // In a real app, this would be the actual image URL from storage
    setSelectedPhotoUrl(`/api/photos/${photo.id}/view`);
    setShowImageModal(true);
  };

  const handleResolveConflict = (photo: Photo) => {
    setSelectedPhoto(photo);
    setShowConflictDialog(true);
  };

  const handleConflictResolution = async (action: 'keep' | 'replace' | 'merge') => {
    if (!selectedPhoto) return;

    try {
      // Mock API call - replace with actual implementation
      const resolution: ConflictResolution = {
        photoId: selectedPhoto.id,
        action,
        resolution: `Photo conflict resolved with action: ${action}`,
      };

      // Update photo status locally
      setPhotos(prev => prev.map(p => 
        p.id === selectedPhoto.id 
          ? { ...p, hasConflict: false, isSynced: action === 'keep' }
          : p
      ));

      setShowConflictDialog(false);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const handleForceSync = async (photoId: number) => {
    try {
      // Mock API call - replace with actual implementation
      console.log('Force syncing photo:', photoId);
      
      setPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { ...p, isSynced: true, lastSync: new Date().toISOString() }
          : p
      ));
    } catch (error) {
      console.error('Failed to force sync photo:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (photo: Photo) => {
    if (photo.hasConflict) return 'text-red-600 bg-red-50';
    if (!photo.isSynced) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusText = (photo: Photo) => {
    if (photo.hasConflict) return 'Conflict';
    if (!photo.isSynced) return 'Pending';
    return 'Synced';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading photos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photo Gallery</h1>
          <p className="text-gray-600">Manage worker photos and resolve conflicts</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {filteredPhotos.length} of {photos.length} photos
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by filename, worker, or job..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Photos</option>
            <option value="synced">Synced</option>
            <option value="pending">Pending Sync</option>
            <option value="conflict">Conflicts</option>
          </select>
        </div>
      </Card>

      {/* Photos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPhotos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            <div className="aspect-w-16 aspect-h-12 bg-gray-200">
              {/* Placeholder image - in real app would show actual image */}
              <div className="flex items-center justify-center h-48 bg-gray-100">
                <PhotoIcon className="h-12 w-12 text-gray-400" />
              </div>
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(photo)}`}>
                  {getStatusText(photo)}
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-2">
                {/* File Info */}
                <div className="text-sm">
                  <p className="font-medium text-gray-900 truncate">{photo.fileName}</p>
                  <p className="text-gray-500">{formatFileSize(photo.fileSize)}</p>
                </div>

                {/* Worker and Job */}
                {photo.workerName && (
                  <div className="flex items-center text-sm text-gray-600">
                    <UserIcon className="h-4 w-4 mr-1" />
                    <span className="truncate">{photo.workerName}</span>
                  </div>
                )}
                
                {photo.jobName && (
                  <div className="flex items-center text-sm text-gray-600">
                    <BriefcaseIcon className="h-4 w-4 mr-1" />
                    <span className="truncate">{photo.jobCode} - {photo.jobName}</span>
                  </div>
                )}

                {/* Date and Location */}
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span>{formatDateTime(photo.capturedAt)}</span>
                </div>

                {photo.latitude && photo.longitude && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span>{photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewImage(photo)}
                    className="flex-1"
                  >
                    <PhotoIcon className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  {photo.hasConflict && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolveConflict(photo)}
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                  
                  {!photo.isSynced && !photo.hasConflict && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleForceSync(photo.id)}
                      className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                      Sync
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredPhotos.length === 0 && (
        <Card className="p-12 text-center">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No photos found</h3>
          <p className="mt-2 text-gray-600">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Photos captured by workers will appear here'}
          </p>
        </Card>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <img
              src={selectedPhotoUrl}
              alt="Photo preview"
              className="max-w-full max-h-full object-contain"
              onError={() => {
                // Fallback to placeholder if image fails to load
                console.log('Image failed to load, showing placeholder');
              }}
            />
          </div>
        </div>
      )}

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold">Resolve Photo Conflict</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                This photo has a sync conflict. Choose how to resolve it:
              </p>
              
              <div className="text-sm text-gray-700 mb-6 bg-gray-50 p-3 rounded-lg">
                <p><strong>File:</strong> {selectedPhoto.fileName}</p>
                <p><strong>Worker:</strong> {selectedPhoto.workerName}</p>
                <p><strong>Job:</strong> {selectedPhoto.jobName}</p>
                <p><strong>Captured:</strong> {formatDateTime(selectedPhoto.capturedAt)}</p>
              </div>

              <div className="space-y-3 mb-6">
                <Button
                  variant="outline"
                  onClick={() => handleConflictResolution('keep')}
                  className="w-full justify-start text-left"
                >
                  <CheckIcon className="h-5 w-5 mr-3 text-green-600" />
                  <div>
                    <div className="font-medium">Keep Local Version</div>
                    <div className="text-sm text-gray-600">Use the current photo data</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleConflictResolution('replace')}
                  className="w-full justify-start text-left"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-3 text-blue-600" />
                  <div>
                    <div className="font-medium">Replace with Server Version</div>
                    <div className="text-sm text-gray-600">Override with server data</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleConflictResolution('merge')}
                  className="w-full justify-start text-left"
                >
                  <CloudArrowUpIcon className="h-5 w-5 mr-3 text-purple-600" />
                  <div>
                    <div className="font-medium">Merge Data</div>
                    <div className="text-sm text-gray-600">Combine local and server information</div>
                  </div>
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConflictDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PhotosPage;