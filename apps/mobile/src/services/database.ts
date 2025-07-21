import * as SQLite from 'expo-sqlite';
import { generateOfflineId } from '@field-tracker/shared-utils';

export interface TimeEntry {
  id?: number;
  offlineGuid: string;
  workerId: number;
  jobId: number;
  startTime: string; // ISO string
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
  createdAt: string;
  updatedAt: string;
}

export interface BreakEntry {
  id?: number;
  offlineGuid: string;
  timeEntryOfflineGuid: string;
  breakTypeId: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  notes?: string;
  isSynced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id?: number;
  offlineGuid: string;
  timeEntryId?: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  compressedSize?: number;
  capturedAt: string;
  latitude?: number;
  longitude?: number;
  isSynced: boolean;
  syncedAt?: string;
  createdAt: string;
}

export interface Worker {
  id: number;
  employeeId: string;
  name: string;
  isActive: boolean;
  lastSyncAt?: string;
}

export interface Job {
  id: number;
  jobCode: string;
  name: string;
  description?: string;
  tags?: string[]; // JSON array
  isActive: boolean;
  lastSyncAt?: string;
}

export interface BreakType {
  id: number;
  name: string;
  isPaid: boolean;
  defaultMinutes: number;
  isActive: boolean;
}

export interface SyncQueue {
  id?: number;
  type: 'time_entry' | 'break_entry' | 'photo';
  entityGuid: string;
  data: string; // JSON stringified data
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

class DatabaseService {
  private db: SQLite.WebSQLDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    this.db = SQLite.openDatabase('fieldtracker.db');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        // Create time_entries table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            offline_guid TEXT UNIQUE NOT NULL,
            worker_id INTEGER NOT NULL,
            job_id INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            start_latitude REAL,
            start_longitude REAL,
            end_latitude REAL,
            end_longitude REAL,
            notes TEXT,
            regular_hours REAL,
            overtime_hours REAL,
            is_synced INTEGER DEFAULT 0,
            has_conflict INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);

        // Create break_entries table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS break_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            offline_guid TEXT UNIQUE NOT NULL,
            time_entry_offline_guid TEXT NOT NULL,
            break_type_id INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration_minutes INTEGER,
            notes TEXT,
            is_synced INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(time_entry_offline_guid) REFERENCES time_entries(offline_guid)
          );
        `);

        // Create photos table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            offline_guid TEXT UNIQUE NOT NULL,
            time_entry_id INTEGER,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            compressed_size INTEGER,
            captured_at TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            is_synced INTEGER DEFAULT 0,
            synced_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(time_entry_id) REFERENCES time_entries(id)
          );
        `);

        // Create workers table (cache from server)
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS workers (
            id INTEGER PRIMARY KEY,
            employee_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            last_sync_at TEXT
          );
        `);

        // Create jobs table (cache from server)
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY,
            job_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            tags TEXT,
            is_active INTEGER DEFAULT 1,
            last_sync_at TEXT
          );
        `);

        // Create break_types table (cache from server)
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS break_types (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            is_paid INTEGER NOT NULL,
            default_minutes INTEGER NOT NULL,
            is_active INTEGER DEFAULT 1
          );
        `);

        // Create sync_queue table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            entity_guid TEXT NOT NULL,
            data TEXT NOT NULL,
            retry_count INTEGER DEFAULT 0,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);

        // Create app_settings table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT NOT NULL
          );
        `);

        // Create indexes for performance
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_time_entries_worker ON time_entries(worker_id);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_time_entries_job ON time_entries(job_id);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_time_entries_sync ON time_entries(is_synced);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_break_entries_time_entry ON break_entries(time_entry_offline_guid);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_photos_time_entry ON photos(time_entry_id);');
        tx.executeSql('CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON sync_queue(type);');

      }, reject, resolve);
    });
  }

  private getDb(): SQLite.WebSQLDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  public async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    await this.init();
    // For the new SQLite API, we'll need to adapt this
    // For now, return a compatible interface
    const db = this.getDb();
    
    return {
      runAsync: (sql: string, params?: any[]) => {
        return new Promise((resolve, reject) => {
          db.transaction(tx => {
            tx.executeSql(sql, params, (_, result) => {
              resolve({ lastInsertRowId: result.insertId, changes: result.rowsAffected });
            }, (_, error) => {
              reject(error);
              return false;
            });
          });
        });
      },
      
      getAllAsync: (sql: string, params?: any[]) => {
        return new Promise((resolve, reject) => {
          db.transaction(tx => {
            tx.executeSql(sql, params, (_, { rows }) => {
              const result = [];
              for (let i = 0; i < rows.length; i++) {
                result.push(rows.item(i));
              }
              resolve(result);
            }, (_, error) => {
              reject(error);
              return false;
            });
          });
        });
      },
      
      getFirstAsync: (sql: string, params?: any[]) => {
        return new Promise((resolve, reject) => {
          db.transaction(tx => {
            tx.executeSql(sql, params, (_, { rows }) => {
              resolve(rows.length > 0 ? rows.item(0) : null);
            }, (_, error) => {
              reject(error);
              return false;
            });
          });
        });
      },
    } as SQLite.SQLiteDatabase;
  }

  // Time Entries
  async createTimeEntry(entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry> {
    const db = this.getDb();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(`
          INSERT INTO time_entries (
            offline_guid, worker_id, job_id, start_time, end_time,
            start_latitude, start_longitude, end_latitude, end_longitude,
            notes, regular_hours, overtime_hours, is_synced, has_conflict,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          entry.offlineGuid, entry.workerId, entry.jobId, entry.startTime, entry.endTime,
          entry.startLatitude, entry.startLongitude, entry.endLatitude, entry.endLongitude,
          entry.notes, entry.regularHours, entry.overtimeHours, 
          entry.isSynced ? 1 : 0, entry.hasConflict ? 1 : 0, now, now
        ], (_, result) => {
          resolve({
            ...entry,
            id: result.insertId,
            createdAt: now,
            updatedAt: now,
          });
        }, (_, error) => {
          reject(error);
          return false;
        });
      });
    });
  }

  async updateTimeEntry(offlineGuid: string, updates: Partial<TimeEntry>): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();
    
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'offlineGuid' && key !== 'createdAt') {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(offlineGuid);
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(`
          UPDATE time_entries 
          SET ${fields.join(', ')} 
          WHERE offline_guid = ?
        `, values, () => resolve(), (_, error) => {
          reject(error);
          return false;
        });
      });
    });
  }

  async getTimeEntries(workerId?: number, limit = 50): Promise<TimeEntry[]> {
    const db = this.getDb();
    
    const sql = workerId 
      ? 'SELECT * FROM time_entries WHERE worker_id = ? ORDER BY created_at DESC LIMIT ?'
      : 'SELECT * FROM time_entries ORDER BY created_at DESC LIMIT ?';
    
    const params = workerId ? [workerId, limit] : [limit];
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(sql, params, (_, { rows }) => {
          const entries = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            entries.push({
              id: row.id,
              offlineGuid: row.offline_guid,
              workerId: row.worker_id,
              jobId: row.job_id,
              startTime: row.start_time,
              endTime: row.end_time,
              startLatitude: row.start_latitude,
              startLongitude: row.start_longitude,
              endLatitude: row.end_latitude,
              endLongitude: row.end_longitude,
              notes: row.notes,
              regularHours: row.regular_hours,
              overtimeHours: row.overtime_hours,
              isSynced: Boolean(row.is_synced),
              hasConflict: Boolean(row.has_conflict),
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            });
          }
          resolve(entries);
        }, (_, error) => {
          reject(error);
          return false;
        });
      });
    });
  }

  async getUnsyncedTimeEntries(): Promise<TimeEntry[]> {
    const db = this.getDb();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM time_entries WHERE is_synced = 0 ORDER BY created_at ASC',
          [],
          (_, { rows }) => {
            const entries = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              entries.push({
                id: row.id,
                offlineGuid: row.offline_guid,
                workerId: row.worker_id,
                jobId: row.job_id,
                startTime: row.start_time,
                endTime: row.end_time,
                startLatitude: row.start_latitude,
                startLongitude: row.start_longitude,
                endLatitude: row.end_latitude,
                endLongitude: row.end_longitude,
                notes: row.notes,
                regularHours: row.regular_hours,
                overtimeHours: row.overtime_hours,
                isSynced: Boolean(row.is_synced),
                hasConflict: Boolean(row.has_conflict),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
              });
            }
            resolve(entries);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Workers (cached from server)
  async getWorkers(): Promise<Worker[]> {
    const db = this.getDb();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM workers WHERE is_active = 1 ORDER BY name ASC',
          [],
          (_, { rows }) => {
            const workers = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              workers.push({
                id: row.id,
                employeeId: row.employee_id,
                name: row.name,
                isActive: Boolean(row.is_active),
                lastSyncAt: row.last_sync_at,
              });
            }
            resolve(workers);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async upsertWorkers(workers: Worker[]): Promise<void> {
    const db = this.getDb();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        workers.forEach(worker => {
          tx.executeSql(`
            INSERT OR REPLACE INTO workers (id, employee_id, name, is_active, last_sync_at)
            VALUES (?, ?, ?, ?, ?)
          `, [
            worker.id, worker.employeeId, worker.name,
            worker.isActive ? 1 : 0, worker.lastSyncAt || new Date().toISOString()
          ]);
        });
      }, reject, resolve);
    });
  }

  // Jobs (cached from server)
  async getJobs(): Promise<Job[]> {
    const db = this.getDb();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM jobs WHERE is_active = 1 ORDER BY name ASC',
          [],
          (_, { rows }) => {
            const jobs = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              jobs.push({
                id: row.id,
                jobCode: row.job_code,
                name: row.name,
                description: row.description,
                tags: row.tags ? JSON.parse(row.tags) : undefined,
                isActive: Boolean(row.is_active),
                lastSyncAt: row.last_sync_at,
              });
            }
            resolve(jobs);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async upsertJobs(jobs: Job[]): Promise<void> {
    const db = this.getDb();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        jobs.forEach(job => {
          tx.executeSql(`
            INSERT OR REPLACE INTO jobs (id, job_code, name, description, tags, is_active, last_sync_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            job.id, job.jobCode, job.name, job.description,
            job.tags ? JSON.stringify(job.tags) : null,
            job.isActive ? 1 : 0, job.lastSyncAt || new Date().toISOString()
          ]);
        });
      }, reject, resolve);
    });
  }

  // App Settings
  async getSetting(key: string): Promise<string | null> {
    const db = this.getDb();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT value FROM app_settings WHERE key = ?',
          [key],
          (_, { rows }) => {
            resolve(rows.length > 0 ? rows.item(0).value : null);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async setSetting(key: string, value: string): Promise<void> {
    const db = this.getDb();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(`
          INSERT OR REPLACE INTO app_settings (key, value, updated_at)
          VALUES (?, ?, ?)
        `, [key, value, now], () => resolve(), (_, error) => {
          reject(error);
          return false;
        });
      });
    });
  }

  // Utility method to clear all data (for testing)
  async clearAllData(): Promise<void> {
    const db = this.getDb();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('DELETE FROM time_entries');
        tx.executeSql('DELETE FROM break_entries');
        tx.executeSql('DELETE FROM photos');
        tx.executeSql('DELETE FROM sync_queue');
        tx.executeSql('DELETE FROM app_settings');
        // Don't clear workers, jobs, break_types as they're cached from server
      }, reject, resolve);
    });
  }
}

export const databaseService = new DatabaseService();