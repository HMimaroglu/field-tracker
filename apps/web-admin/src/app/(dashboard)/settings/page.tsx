'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cog6ToothIcon,
  ClockIcon,
  MapPinIcon,
  PhotoIcon,
  CloudIcon,
  ShieldCheckIcon,
  BellIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface SystemSettings {
  // Time Tracking Settings
  defaultRegularHours: number;
  overtimeThreshold: number;
  autoBreakReminder: boolean;
  breakReminderMinutes: number;
  allowManualTimeEdit: boolean;
  
  // Location Settings
  requireLocationForTimeEntries: boolean;
  locationAccuracyThreshold: number; // meters
  trackLocationDuringWork: boolean;
  
  // Photo Settings
  maxPhotoSize: number; // MB
  photoCompressionQuality: number; // 0-1
  requirePhotosForCompletion: boolean;
  
  // Sync Settings
  autoSyncInterval: number; // minutes
  maxRetryAttempts: number;
  offlineStorageDays: number;
  
  // Security Settings
  sessionTimeout: number; // minutes
  requirePinForSensitiveActions: boolean;
  auditLogRetention: number; // days
  
  // Notification Settings
  enableEmailNotifications: boolean;
  notifyOnConflicts: boolean;
  notifyOnFailedSync: boolean;
  dailyReportEmail: boolean;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupRetention: number; // days
  lastBackup?: string;
}

const SettingsPage = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    // Default values
    defaultRegularHours: 8,
    overtimeThreshold: 40,
    autoBreakReminder: true,
    breakReminderMinutes: 240, // 4 hours
    allowManualTimeEdit: false,
    
    requireLocationForTimeEntries: true,
    locationAccuracyThreshold: 100,
    trackLocationDuringWork: false,
    
    maxPhotoSize: 5,
    photoCompressionQuality: 0.8,
    requirePhotosForCompletion: false,
    
    autoSyncInterval: 15,
    maxRetryAttempts: 3,
    offlineStorageDays: 30,
    
    sessionTimeout: 60,
    requirePinForSensitiveActions: true,
    auditLogRetention: 90,
    
    enableEmailNotifications: true,
    notifyOnConflicts: true,
    notifyOnFailedSync: true,
    dailyReportEmail: false,
  });

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    lastBackup: '2024-02-05T02:00:00Z',
  });

  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // In a real app, fetch from API
      console.log('Loading settings...');
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setSaveMessage('');

    try {
      // In a real app, save to API
      console.log('Saving settings:', settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      // In a real app, trigger backup API
      console.log('Creating backup...');
      
      setBackupSettings(prev => ({
        ...prev,
        lastBackup: new Date().toISOString(),
      }));
      
      setSaveMessage('Backup created successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create backup:', error);
      setSaveMessage('Failed to create backup. Please try again.');
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    try {
      // Reset to default values
      setSettings({
        defaultRegularHours: 8,
        overtimeThreshold: 40,
        autoBreakReminder: true,
        breakReminderMinutes: 240,
        allowManualTimeEdit: false,
        requireLocationForTimeEntries: true,
        locationAccuracyThreshold: 100,
        trackLocationDuringWork: false,
        maxPhotoSize: 5,
        photoCompressionQuality: 0.8,
        requirePhotosForCompletion: false,
        autoSyncInterval: 15,
        maxRetryAttempts: 3,
        offlineStorageDays: 30,
        sessionTimeout: 60,
        requirePinForSensitiveActions: true,
        auditLogRetention: 90,
        enableEmailNotifications: true,
        notifyOnConflicts: true,
        notifyOnFailedSync: true,
        dailyReportEmail: false,
      });

      setSaveMessage('Settings reset to defaults!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure Field Tracker system behavior and preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
          <Button
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Tracking Settings */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold">Time Tracking</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Regular Hours per Day
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.defaultRegularHours}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultRegularHours: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weekly Overtime Threshold (hours)
              </label>
              <input
                type="number"
                min="35"
                max="60"
                value={settings.overtimeThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, overtimeThreshold: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoBreakReminder}
                onChange={(e) => setSettings(prev => ({ ...prev, autoBreakReminder: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Enable automatic break reminders
              </label>
            </div>

            {settings.autoBreakReminder && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Break Reminder Interval (minutes)
                </label>
                <input
                  type="number"
                  min="60"
                  max="480"
                  step="30"
                  value={settings.breakReminderMinutes}
                  onChange={(e) => setSettings(prev => ({ ...prev, breakReminderMinutes: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.allowManualTimeEdit}
                onChange={(e) => setSettings(prev => ({ ...prev, allowManualTimeEdit: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Allow manual time entry editing
              </label>
            </div>
          </div>
        </Card>

        {/* Location Settings */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <MapPinIcon className="h-6 w-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold">Location Tracking</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.requireLocationForTimeEntries}
                onChange={(e) => setSettings(prev => ({ ...prev, requireLocationForTimeEntries: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Require location for time entries
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Accuracy Threshold (meters)
              </label>
              <input
                type="number"
                min="5"
                max="1000"
                value={settings.locationAccuracyThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, locationAccuracyThreshold: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower values require more precise location data
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.trackLocationDuringWork}
                onChange={(e) => setSettings(prev => ({ ...prev, trackLocationDuringWork: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Track location continuously during work
              </label>
            </div>
          </div>
        </Card>

        {/* Photo Settings */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <PhotoIcon className="h-6 w-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold">Photo Management</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Photo Size (MB)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.maxPhotoSize}
                onChange={(e) => setSettings(prev => ({ ...prev, maxPhotoSize: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo Compression Quality ({Math.round(settings.photoCompressionQuality * 100)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.photoCompressionQuality}
                onChange={(e) => setSettings(prev => ({ ...prev, photoCompressionQuality: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Lower Quality</span>
                <span>Higher Quality</span>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.requirePhotosForCompletion}
                onChange={(e) => setSettings(prev => ({ ...prev, requirePhotosForCompletion: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Require photos before completing jobs
              </label>
            </div>
          </div>
        </Card>

        {/* Sync Settings */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <CloudIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold">Data Synchronization</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-sync Interval (minutes)
              </label>
              <select
                value={settings.autoSyncInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, autoSyncInterval: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={0}>Manual only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Retry Attempts
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxRetryAttempts}
                onChange={(e) => setSettings(prev => ({ ...prev, maxRetryAttempts: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offline Storage Retention (days)
              </label>
              <input
                type="number"
                min="7"
                max="90"
                value={settings.offlineStorageDays}
                onChange={(e) => setSettings(prev => ({ ...prev, offlineStorageDays: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold">Security</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <select
                value={settings.sessionTimeout}
                onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.requirePinForSensitiveActions}
                onChange={(e) => setSettings(prev => ({ ...prev, requirePinForSensitiveActions: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Require PIN for sensitive actions
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audit Log Retention (days)
              </label>
              <input
                type="number"
                min="30"
                max="365"
                value={settings.auditLogRetention}
                onChange={(e) => setSettings(prev => ({ ...prev, auditLogRetention: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="h-6 w-6 text-yellow-600 mr-3" />
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableEmailNotifications}
                onChange={(e) => setSettings(prev => ({ ...prev, enableEmailNotifications: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Enable email notifications
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifyOnConflicts}
                onChange={(e) => setSettings(prev => ({ ...prev, notifyOnConflicts: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={!settings.enableEmailNotifications}
              />
              <label className="ml-2 text-sm text-gray-700">
                Notify on sync conflicts
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifyOnFailedSync}
                onChange={(e) => setSettings(prev => ({ ...prev, notifyOnFailedSync: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={!settings.enableEmailNotifications}
              />
              <label className="ml-2 text-sm text-gray-700">
                Notify on failed synchronization
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.dailyReportEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, dailyReportEmail: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={!settings.enableEmailNotifications}
              />
              <label className="ml-2 text-sm text-gray-700">
                Send daily summary reports
              </label>
            </div>
          </div>
        </Card>
      </div>

      {/* Backup & Maintenance */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <DocumentTextIcon className="h-6 w-6 text-indigo-600 mr-3" />
          <h3 className="text-lg font-semibold">Backup & Maintenance</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={backupSettings.autoBackupEnabled}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, autoBackupEnabled: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Enable automatic backups
              </label>
            </div>

            {backupSettings.autoBackupEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Frequency
                </label>
                <select
                  value={backupSettings.backupFrequency}
                  onChange={(e) => setBackupSettings(prev => ({ ...prev, backupFrequency: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Retention (days)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={backupSettings.backupRetention}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, backupRetention: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Backup
              </label>
              <p className="text-sm text-gray-600">
                {backupSettings.lastBackup 
                  ? new Date(backupSettings.lastBackup).toLocaleString()
                  : 'Never'}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleBackupNow}
                className="w-full"
              >
                Create Backup Now
              </Button>

              <Button
                variant="outline"
                onClick={handleResetSettings}
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;