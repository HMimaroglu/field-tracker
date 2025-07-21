import NetInfo from '@react-native-community/netinfo';
import { photoService, PhotoData } from './photo';
import { databaseService } from './database';
import { apiClient } from '@field-tracker/api-client';

export interface SyncQueueItem {
  id?: number;
  type: 'time_entry' | 'break_entry' | 'photo';
  entityGuid: string;
  data: string; // JSON stringified data
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingItems: number;
  lastSyncAt?: Date;
  lastError?: string;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ entityGuid: string; error: string }>;
}

class SyncService {
  private isOnline = false;
  private isSyncing = false;
  private syncInProgress = false;
  private listeners: Array<(status: SyncStatus) => void> = [];
  private autoSyncInterval?: NodeJS.Timeout;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly AUTO_SYNC_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.initializeNetworkListener();
    this.startAutoSync();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = Boolean(state.isConnected && state.isInternetReachable);
      
      if (!wasOnline && this.isOnline) {
        // Just came back online - trigger sync
        console.log('Network reconnected, triggering sync');
        this.syncPendingItems();
      }
      
      this.notifyListeners();
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      this.isOnline = Boolean(state.isConnected && state.isInternetReachable);
      this.notifyListeners();
    });
  }

  private startAutoSync() {
    this.autoSyncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncPendingItems();
      }
    }, this.AUTO_SYNC_INTERVAL);
  }

  private stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = undefined;
    }
  }

  public addListener(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async notifyListeners() {
    const status = await this.getSyncStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error notifying sync listener:', error);
      }
    });
  }

  public async getSyncStatus(): Promise<SyncStatus> {
    try {
      const db = await databaseService.getDatabase();
      const pendingResult = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM sync_queue'
      ) as { count: number } | null;

      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingItems: pendingResult?.count || 0,
        // TODO: Get last sync timestamp from storage
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingItems: 0,
      };
    }
  }

  public async addToQueue(type: SyncQueueItem['type'], entityGuid: string, data: any): Promise<void> {
    try {
      const db = await databaseService.getDatabase();
      
      // Check if item already exists in queue
      const existing = await db.getFirstAsync(
        'SELECT id FROM sync_queue WHERE entity_guid = ? AND type = ?',
        [entityGuid, type]
      );

      if (existing) {
        // Update existing item
        await db.runAsync(
          `UPDATE sync_queue 
           SET data = ?, updated_at = ?, retry_count = 0, last_error = NULL
           WHERE entity_guid = ? AND type = ?`,
          [JSON.stringify(data), new Date().toISOString(), entityGuid, type]
        );
      } else {
        // Insert new item
        await db.runAsync(
          `INSERT INTO sync_queue (type, entity_guid, data, retry_count, created_at, updated_at)
           VALUES (?, ?, ?, 0, ?, ?)`,
          [type, entityGuid, JSON.stringify(data), new Date().toISOString(), new Date().toISOString()]
        );
      }

      this.notifyListeners();

      // If online, try to sync immediately
      if (this.isOnline && !this.isSyncing) {
        setTimeout(() => this.syncPendingItems(), 1000); // Small delay to batch requests
      }
    } catch (error) {
      console.error('Failed to add item to sync queue:', error);
      throw error;
    }
  }

  public async syncPendingItems(): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        success: false,
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [{ entityGuid: '', error: 'No network connection' }],
      };
    }

    if (this.syncInProgress) {
      return {
        success: false,
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [{ entityGuid: '', error: 'Sync already in progress' }],
      };
    }

    this.syncInProgress = true;
    this.isSyncing = true;
    this.notifyListeners();

    try {
      const db = await databaseService.getDatabase();
      
      // Get pending items
      const items = await db.getAllAsync(
        'SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT 50'
      ) as any[];

      const result: SyncResult = {
        success: true,
        processed: items.length,
        succeeded: 0,
        failed: 0,
        errors: [],
      };

      // Process each item
      for (const item of items) {
        try {
          const success = await this.syncItem({
            id: item.id,
            type: item.type,
            entityGuid: item.entity_guid,
            data: item.data,
            retryCount: item.retry_count,
            lastError: item.last_error,
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at),
          });

          if (success) {
            // Remove from queue
            await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
            result.succeeded++;
          } else {
            result.failed++;
          }
        } catch (error) {
          console.error(`Failed to sync item ${item.entity_guid}:`, error);
          result.failed++;
          result.errors.push({
            entityGuid: item.entity_guid,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Update retry count and error
          await db.runAsync(
            `UPDATE sync_queue 
             SET retry_count = retry_count + 1, last_error = ?, updated_at = ?
             WHERE id = ?`,
            [
              error instanceof Error ? error.message : 'Unknown error',
              new Date().toISOString(),
              item.id,
            ]
          );

          // Remove items that have exceeded max retries
          if (item.retry_count >= this.MAX_RETRY_COUNT) {
            console.warn(`Removing item ${item.entity_guid} after ${this.MAX_RETRY_COUNT} failed retries`);
            await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
          }
        }
      }

      result.success = result.failed === 0;
      return result;

    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: [{ entityGuid: '', error: 'Sync process failed' }],
      };
    } finally {
      this.isSyncing = false;
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      const data = JSON.parse(item.data);

      switch (item.type) {
        case 'time_entry':
          return await this.syncTimeEntry(data, item.entityGuid);
        
        case 'break_entry':
          return await this.syncBreakEntry(data, item.entityGuid);
        
        case 'photo':
          return await this.syncPhoto(data, item.entityGuid);
        
        default:
          console.warn(`Unknown sync item type: ${item.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to sync ${item.type} ${item.entityGuid}:`, error);
      return false;
    }
  }

  private async syncTimeEntry(data: any, entityGuid: string): Promise<boolean> {
    try {
      // TODO: Implement time entry sync with server
      // This would typically involve:
      // 1. Transform local data to server format
      // 2. POST to /api/sync/time-entries
      // 3. Handle conflicts if they arise
      // 4. Update local record with server ID

      console.log('Syncing time entry:', entityGuid);
      
      // Placeholder - replace with actual API call
      const response = await apiClient.post('/sync/time-entries', {
        entries: [data],
      });

      if (response.success) {
        // Update local database to mark as synced
        const db = await databaseService.getDatabase();
        await db.runAsync(
          'UPDATE time_entries SET is_synced = 1 WHERE offline_guid = ?',
          [entityGuid]
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to sync time entry:', error);
      return false;
    }
  }

  private async syncBreakEntry(data: any, entityGuid: string): Promise<boolean> {
    try {
      console.log('Syncing break entry:', entityGuid);
      
      // Placeholder - replace with actual API call
      const response = await apiClient.post('/sync/break-entries', {
        entries: [data],
      });

      if (response.success) {
        const db = await databaseService.getDatabase();
        await db.runAsync(
          'UPDATE break_entries SET is_synced = 1 WHERE offline_guid = ?',
          [entityGuid]
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to sync break entry:', error);
      return false;
    }
  }

  private async syncPhoto(data: any, entityGuid: string): Promise<boolean> {
    try {
      console.log('Syncing photo:', entityGuid);
      
      // Get photo data from local storage
      const photo = await this.getLocalPhoto(entityGuid);
      if (!photo) {
        console.warn(`Photo ${entityGuid} not found locally`);
        return true; // Consider it synced if not found (might have been deleted)
      }

      // Read photo file as base64
      const base64Data = await photoService.getPhotoBlob(photo.filePath);
      
      // Prepare photo data for sync
      const photoSyncData = {
        offlineGuid: photo.offlineGuid,
        timeEntryId: photo.timeEntryId,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        compressedSize: photo.compressedSize,
        capturedAt: photo.capturedAt.toISOString(),
        latitude: photo.latitude,
        longitude: photo.longitude,
        base64Data,
      };

      // Use bulk photo sync endpoint
      const response = await apiClient.post('/photos/sync', {
        photos: [photoSyncData],
      });

      if (response.success && response.data.successful > 0) {
        // Mark as synced
        if (photo.id) {
          await photoService.markPhotoAsSynced(photo.id, new Date());
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to sync photo:', error);
      return false;
    }
  }

  private async getLocalPhoto(offlineGuid: string): Promise<PhotoData | null> {
    try {
      const db = await databaseService.getDatabase();
      const row = await db.getFirstAsync(
        'SELECT * FROM photos WHERE offline_guid = ?',
        [offlineGuid]
      ) as any;

      if (!row) return null;

      return {
        id: row.id,
        offlineGuid: row.offline_guid,
        timeEntryId: row.time_entry_id,
        fileName: row.file_name,
        filePath: row.file_path,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        compressedSize: row.compressed_size,
        capturedAt: new Date(row.captured_at),
        latitude: row.latitude,
        longitude: row.longitude,
        isSynced: Boolean(row.is_synced),
        syncedAt: row.synced_at ? new Date(row.synced_at) : undefined,
      };
    } catch (error) {
      console.error('Failed to get local photo:', error);
      return null;
    }
  }

  public async clearSyncQueue(): Promise<void> {
    try {
      const db = await databaseService.getDatabase();
      await db.runAsync('DELETE FROM sync_queue');
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
      throw error;
    }
  }

  public async getFailedItems(): Promise<SyncQueueItem[]> {
    try {
      const db = await databaseService.getDatabase();
      const rows = await db.getAllAsync(
        'SELECT * FROM sync_queue WHERE retry_count > 0 ORDER BY updated_at DESC'
      ) as any[];

      return rows.map(row => ({
        id: row.id,
        type: row.type,
        entityGuid: row.entity_guid,
        data: row.data,
        retryCount: row.retry_count,
        lastError: row.last_error,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error) {
      console.error('Failed to get failed items:', error);
      return [];
    }
  }

  public destroy() {
    this.stopAutoSync();
    this.listeners = [];
  }
}

export const syncService = new SyncService();