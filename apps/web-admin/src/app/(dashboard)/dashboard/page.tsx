'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { adminApi } from '@/lib/api';
import {
  UserGroupIcon,
  BriefcaseIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalWorkers: number;
  activeWorkers: number;
  totalJobs: number;
  activeJobs: number;
  pendingTimeEntries: number;
  conflictsCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load basic stats
      const [workersResponse, jobsResponse, licenseResponse] = await Promise.all([
        adminApi.getWorkers({ limit: 1000 }),
        adminApi.getJobs({ limit: 1000 }),
        adminApi.getLicenseStatus(),
      ]);

      if (workersResponse.success && jobsResponse.success) {
        const workers = workersResponse.data.data || [];
        const jobs = jobsResponse.data.data || [];

        setStats({
          totalWorkers: workers.length,
          activeWorkers: workers.filter((w: any) => w.isActive).length,
          totalJobs: jobs.length,
          activeJobs: jobs.filter((j: any) => j.isActive).length,
          pendingTimeEntries: 0, // TODO: Get from API
          conflictsCount: 0, // TODO: Get from API
        });
      }

      if (licenseResponse.success) {
        setLicenseStatus(licenseResponse.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your field tracking system</p>
      </div>

      {/* License Status */}
      {licenseStatus && (
        <Card>
          <CardHeader>
            <CardTitle>License Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Seats Used: {licenseStatus.seatsUsed} / {licenseStatus.seatsMax}
                </p>
                {licenseStatus.daysUntilExpiry && (
                  <p className="text-sm text-gray-600">
                    Expires in {licenseStatus.daysUntilExpiry} days
                  </p>
                )}
              </div>
              <div className={`badge ${licenseStatus.isValid ? 'badge-success' : 'badge-error'}`}>
                {licenseStatus.isValid ? 'Valid' : 'Invalid'}
              </div>
            </div>
            {licenseStatus.warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {licenseStatus.warnings.map((warning: string, index: number) => (
                  <p key={index} className="text-sm text-yellow-600">
                    ⚠️ {warning}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Workers</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalWorkers || 0}</p>
                <p className="text-xs text-gray-500">
                  {stats?.activeWorkers || 0} active
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
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalJobs || 0}</p>
                <p className="text-xs text-gray-500">
                  {stats?.activeJobs || 0} active
                </p>
              </div>
              <BriefcaseIcon className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pending Sync</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.pendingTimeEntries || 0}</p>
                <p className="text-xs text-gray-500">time entries</p>
              </div>
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Conflicts</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.conflictsCount || 0}</p>
                <p className="text-xs text-gray-500">need review</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Workers</CardTitle>
            <CardDescription>Latest worker registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-4">
              Feature coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Server and sync status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Server Status</span>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="badge badge-success">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">License</span>
                <span className={`badge ${licenseStatus?.isValid ? 'badge-success' : 'badge-error'}`}>
                  {licenseStatus?.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}