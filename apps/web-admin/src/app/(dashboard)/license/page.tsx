'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { adminApi } from '@/lib/api';
import { 
  KeyIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface LicenseStatus {
  isValid: boolean;
  seatsUsed: number;
  seatsMax: number;
  daysUntilExpiry?: number;
  warnings: string[];
  licenseId?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export default function LicensePage() {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadLicenseStatus();
  }, []);

  const loadLicenseStatus = async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.getLicenseStatus();
      
      if (response.success) {
        setLicenseStatus(response.data);
      } else {
        console.error('Failed to load license status:', response.error);
      }
    } catch (error) {
      console.error('Failed to load license status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.license') && file.type !== 'application/octet-stream') {
        setUploadError('Please select a valid .license file');
        return;
      }
      
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      
      const response = await adminApi.uploadLicense(selectedFile);
      
      if (response.success) {
        // Reload license status to show updated information
        await loadLicenseStatus();
        setSelectedFile(null);
        
        // Reset file input
        const fileInput = document.getElementById('license-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        alert('License uploaded successfully!');
      } else {
        setUploadError(response.error || 'Upload failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: LicenseStatus) => {
    if (!status.isValid) return 'text-red-600';
    if (status.warnings.length > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (status: LicenseStatus) => {
    if (!status.isValid) return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    if (status.warnings.length > 0) return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
    return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
  };

  const getSeatUsageColor = (used: number, max: number) => {
    const percentage = (used / max) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading license status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
        <p className="text-gray-600">Manage your Field Tracker license and monitor usage</p>
      </div>

      {/* License Status Overview */}
      {licenseStatus && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">License Status</p>
                  <p className={`text-xl font-bold ${getStatusColor(licenseStatus)}`}>
                    {licenseStatus.isValid ? 'Valid' : 'Invalid'}
                  </p>
                </div>
                {getStatusIcon(licenseStatus)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Seats Used</p>
                  <p className={`text-xl font-bold ${getSeatUsageColor(licenseStatus.seatsUsed, licenseStatus.seatsMax)}`}>
                    {licenseStatus.seatsUsed} / {licenseStatus.seatsMax}
                  </p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-primary-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Days Until Expiry</p>
                  <p className="text-xl font-bold text-gray-900">
                    {licenseStatus.daysUntilExpiry ?? 'Never'}
                  </p>
                </div>
                <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">License ID</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {licenseStatus.licenseId || 'N/A'}
                  </p>
                </div>
                <KeyIcon className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warnings */}
      {licenseStatus?.warnings && licenseStatus.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <CardTitle className="text-yellow-800">License Warnings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {licenseStatus.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-800 flex items-start">
                  <span className="mr-2">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* License Details */}
      {licenseStatus && (
        <Card>
          <CardHeader>
            <CardTitle>License Information</CardTitle>
            <CardDescription>Current license details and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">License ID</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {licenseStatus.licenseId || 'Not available'}
                </p>
              </div>
              
              <div>
                <label className="label">Maximum Seats</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {licenseStatus.seatsMax}
                </p>
              </div>
              
              {licenseStatus.uploadedAt && (
                <div>
                  <label className="label">Uploaded Date</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {new Date(licenseStatus.uploadedAt).toLocaleString()}
                  </p>
                </div>
              )}
              
              {licenseStatus.uploadedBy && (
                <div>
                  <label className="label">Uploaded By</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {licenseStatus.uploadedBy}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload New License */}
      <Card>
        <CardHeader>
          <CardTitle>Upload License File</CardTitle>
          <CardDescription>
            Upload a new .license file to update your system license
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="license-file" className="label">
                Select License File
              </label>
              <input
                id="license-file"
                type="file"
                accept=".license"
                onChange={handleFileSelect}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Only .license files are accepted
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <InformationCircleIcon className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-800">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-sm text-red-800">{uploadError}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              isLoading={isUploading}
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload License'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
            <CardTitle className="text-blue-800">Important Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              License files are cryptographically signed and cannot be modified
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Uploading a new license will replace the current one immediately
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Workers will need to re-authenticate if seat limits change
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Contact support if you need to increase your seat count
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}