import { randomUUID } from 'crypto';

/**
 * Offline-first utilities for field tracker app
 */

export interface QueuedRecord {
  id: string;
  type: 'time_entry' | 'break_entry' | 'photo';
  data: any;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingCount: number;
  failedCount: number;
  isInProgress: boolean;
}

/**
 * Generate offline-compatible UUID for records
 */
export function generateOfflineId(): string {
  return randomUUID();
}

/**
 * Create a queued record for offline operations
 */
export function createQueuedRecord(
  type: QueuedRecord['type'],
  data: any
): QueuedRecord {
  return {
    id: generateOfflineId(),
    type,
    data,
    createdAt: new Date(),
    retryCount: 0,
  };
}

/**
 * Validate network connectivity
 */
export async function checkConnectivity(
  testUrl: string = 'https://www.google.com'
): Promise<boolean> {
  try {
    // For Node.js/React Native environments
    if (typeof fetch !== 'undefined') {
      const response = await fetch(testUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000),
      });
      return true;
    }
    
    // Fallback for other environments
    return navigator.onLine;
  } catch {
    return false;
  }
}

/**
 * Implement exponential backoff for retry logic
 */
export function calculateBackoffDelay(retryCount: number, baseDelay: number = 1000): number {
  const maxDelay = 30000; // 30 seconds max
  const delay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
  
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Determine if a record should be retried based on error type
 */
export function shouldRetryRecord(
  record: QueuedRecord,
  error: Error,
  maxRetries: number = 5
): boolean {
  // Don't retry if we've exceeded max attempts
  if (record.retryCount >= maxRetries) {
    return false;
  }
  
  // Don't retry client errors (400-499)
  if (error.message.includes('400') || error.message.includes('401') || 
      error.message.includes('403') || error.message.includes('404') ||
      error.message.includes('422')) {
    return false;
  }
  
  // Don't retry validation errors
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return false;
  }
  
  // Retry network errors, server errors (500+), and timeouts
  return true;
}

/**
 * Compress data for efficient storage and sync
 */
export function compressRecord(record: any): string {
  try {
    return JSON.stringify(record);
  } catch (error) {
    throw new Error(`Failed to compress record: ${error}`);
  }
}

/**
 * Decompress data from storage
 */
export function decompressRecord<T = any>(compressedData: string): T {
  try {
    return JSON.parse(compressedData);
  } catch (error) {
    throw new Error(`Failed to decompress record: ${error}`);
  }
}

/**
 * Merge conflict resolution strategies
 */
export type ConflictStrategy = 'client_wins' | 'server_wins' | 'latest_wins' | 'manual_review';

export function resolveConflict<T extends { updatedAt?: Date | string }>(
  clientRecord: T,
  serverRecord: T,
  strategy: ConflictStrategy = 'latest_wins'
): { resolved: T; needsReview: boolean } {
  switch (strategy) {
    case 'client_wins':
      return { resolved: clientRecord, needsReview: false };
      
    case 'server_wins':
      return { resolved: serverRecord, needsReview: false };
      
    case 'latest_wins':
      const clientTime = new Date(clientRecord.updatedAt || 0);
      const serverTime = new Date(serverRecord.updatedAt || 0);
      
      return {
        resolved: clientTime > serverTime ? clientRecord : serverRecord,
        needsReview: false,
      };
      
    case 'manual_review':
    default:
      return { resolved: serverRecord, needsReview: true };
  }
}

/**
 * Calculate sync priority based on record type and age
 */
export function getSyncPriority(record: QueuedRecord): number {
  const ageMinutes = (Date.now() - record.createdAt.getTime()) / (1000 * 60);
  
  let basePriority: number;
  switch (record.type) {
    case 'time_entry':
      basePriority = 100;
      break;
    case 'break_entry':
      basePriority = 90;
      break;
    case 'photo':
      basePriority = 50;
      break;
    default:
      basePriority = 25;
  }
  
  // Increase priority based on age (older records get higher priority)
  const agePriority = Math.min(ageMinutes * 0.1, 50);
  
  // Decrease priority based on retry count (failed records get lower priority)
  const retryPenalty = record.retryCount * 10;
  
  return Math.max(basePriority + agePriority - retryPenalty, 1);
}

/**
 * Validate data integrity for sync operations
 */
export function validateSyncData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors };
  }
  
  // Check required fields based on type
  if (data.type === 'time_entry') {
    if (!data.workerId) errors.push('Worker ID is required');
    if (!data.jobId) errors.push('Job ID is required');
    if (!data.startTime) errors.push('Start time is required');
    if (!data.offlineGuid) errors.push('Offline GUID is required');
  }
  
  if (data.type === 'break_entry') {
    if (!data.timeEntryId) errors.push('Time entry ID is required');
    if (!data.breakTypeId) errors.push('Break type ID is required');
    if (!data.startTime) errors.push('Start time is required');
  }
  
  if (data.type === 'photo') {
    if (!data.timeEntryId) errors.push('Time entry ID is required');
    if (!data.filename) errors.push('Filename is required');
    if (!data.takenAt) errors.push('Taken at timestamp is required');
  }
  
  return { isValid: errors.length === 0, errors };
}