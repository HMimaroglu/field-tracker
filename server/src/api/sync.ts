import { FastifyInstance } from 'fastify';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { timeEntries, breakEntries, photos, workers, jobs, breakTypes, systemSettings, syncLogs } from '@field-tracker/db-schema';
import { validateBody, validateQuery, createApiResponse, createErrorResponse } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { resolveConflict, validateSyncData, getSyncPriority } from '@field-tracker/shared-utils';
import { z } from 'zod';
import type { Database } from '../config/database.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const syncPushSchema = z.object({
  timeEntries: z.array(z.object({
    offlineGuid: z.string().uuid(),
    workerId: z.number().int().positive(),
    jobId: z.number().int().positive(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date().optional(),
    startLatitude: z.number().min(-90).max(90).optional(),
    startLongitude: z.number().min(-180).max(180).optional(),
    endLatitude: z.number().min(-90).max(90).optional(),
    endLongitude: z.number().min(-180).max(180).optional(),
    notes: z.string().max(1000).optional(),
  })).optional(),
  breakEntries: z.array(z.object({
    offlineGuid: z.string().uuid(),
    timeEntryOfflineGuid: z.string().uuid(),
    breakTypeId: z.number().int().positive(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date().optional(),
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().max(500).optional(),
  })).optional(),
  photos: z.array(z.object({
    offlineGuid: z.string().uuid(),
    timeEntryOfflineGuid: z.string().uuid(),
    filename: z.string().min(1).max(255),
    originalName: z.string().max(255).optional(),
    fileSize: z.number().int().positive().optional(),
    mimeType: z.string().max(100).optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    takenAt: z.coerce.date(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })).optional(),
  deviceId: z.string().min(1).max(255),
  lastSyncAt: z.coerce.date().optional(),
});

const syncPullQuerySchema = z.object({
  since: z.coerce.date().optional(),
});

export function createSyncRoutes(fastify: FastifyInstance, db: Database) {
  
  // Push local changes to server
  fastify.post('/api/sync/push', {
    preHandler: [authenticateToken, validateBody(syncPushSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    const { timeEntries: clientTimeEntries = [], breakEntries: clientBreakEntries = [], photos: clientPhotos = [], deviceId } = request.body as z.infer<typeof syncPushSchema>;
    const workerId = request.user?.workerId;
    
    if (!workerId) {
      reply.code(403).send(createErrorResponse('Worker authentication required'));
      return;
    }
    
    // Start sync log
    const [syncLog] = await db.insert(syncLogs).values({
      deviceId,
      syncType: 'push',
      recordsProcessed: clientTimeEntries.length + clientBreakEntries.length + clientPhotos.length,
      startedAt: new Date(),
      status: 'running',
    }).returning();
    
    const conflicts: any[] = [];
    const processedRecords = { succeeded: 0, failed: 0 };
    
    try {
      // Process time entries
      for (const clientEntry of clientTimeEntries) {
        try {
          // Validate data
          const validation = validateSyncData({ type: 'time_entry', ...clientEntry });
          if (!validation.isValid) {
            conflicts.push({
              type: 'validation_error',
              offlineGuid: clientEntry.offlineGuid,
              errors: validation.errors,
            });
            processedRecords.failed++;
            continue;
          }
          
          // Check if entry already exists
          const [existingEntry] = await db
            .select()
            .from(timeEntries)
            .where(eq(timeEntries.offlineGuid, clientEntry.offlineGuid))
            .limit(1);
          
          if (existingEntry) {
            // Handle conflict resolution
            const conflict = resolveConflict(clientEntry, existingEntry, 'latest_wins');
            if (conflict.needsReview) {
              conflicts.push({
                type: 'time_overlap',
                offlineGuid: clientEntry.offlineGuid,
                clientData: clientEntry,
                serverData: existingEntry,
                suggestedResolution: 'manual_review',
              });
            } else {
              // Update with resolved data
              await db
                .update(timeEntries)
                .set({
                  ...conflict.resolved,
                  hasConflict: false,
                  updatedAt: new Date(),
                })
                .where(eq(timeEntries.offlineGuid, clientEntry.offlineGuid));
            }
          } else {
            // Check for time overlaps with other entries
            const overlappingEntries = await db
              .select()
              .from(timeEntries)
              .where(
                and(
                  eq(timeEntries.workerId, workerId),
                  // Add overlap detection logic here
                )
              );
            
            if (overlappingEntries.length > 0) {
              conflicts.push({
                type: 'time_overlap',
                offlineGuid: clientEntry.offlineGuid,
                conflictWith: overlappingEntries.map(e => e.offlineGuid),
                suggestedResolution: 'auto_close_previous',
              });
            }
            
            // Insert new entry
            await db.insert(timeEntries).values({
              offlineGuid: clientEntry.offlineGuid,
              workerId,
              jobId: clientEntry.jobId,
              startTime: clientEntry.startTime,
              endTime: clientEntry.endTime,
              startLatitude: clientEntry.startLatitude?.toString(),
              startLongitude: clientEntry.startLongitude?.toString(),
              endLatitude: clientEntry.endLatitude?.toString(),
              endLongitude: clientEntry.endLongitude?.toString(),
              notes: clientEntry.notes,
              isSynced: true,
              hasConflict: false,
            });
          }
          
          processedRecords.succeeded++;
          
        } catch (error) {
          request.log.error({ error, entry: clientEntry }, 'Failed to process time entry');
          processedRecords.failed++;
        }
      }
      
      // Process break entries
      for (const clientBreak of clientBreakEntries) {
        try {
          // Find corresponding time entry
          const [timeEntry] = await db
            .select()
            .from(timeEntries)
            .where(eq(timeEntries.offlineGuid, clientBreak.timeEntryOfflineGuid))
            .limit(1);
          
          if (!timeEntry) {
            conflicts.push({
              type: 'missing_reference',
              offlineGuid: clientBreak.offlineGuid,
              missingRef: clientBreak.timeEntryOfflineGuid,
              error: 'Time entry not found',
            });
            processedRecords.failed++;
            continue;
          }
          
          // Check if break entry already exists
          const [existingBreak] = await db
            .select()
            .from(breakEntries)
            .where(eq(breakEntries.offlineGuid, clientBreak.offlineGuid))
            .limit(1);
          
          if (!existingBreak) {
            await db.insert(breakEntries).values({
              offlineGuid: clientBreak.offlineGuid,
              timeEntryId: timeEntry.id,
              breakTypeId: clientBreak.breakTypeId,
              startTime: clientBreak.startTime,
              endTime: clientBreak.endTime,
              durationMinutes: clientBreak.durationMinutes,
              notes: clientBreak.notes,
              isSynced: true,
            });
          }
          
          processedRecords.succeeded++;
          
        } catch (error) {
          request.log.error({ error, entry: clientBreak }, 'Failed to process break entry');
          processedRecords.failed++;
        }
      }
      
      // Process photos
      for (const clientPhoto of clientPhotos) {
        try {
          // Find corresponding time entry
          const [timeEntry] = await db
            .select()
            .from(timeEntries)
            .where(eq(timeEntries.offlineGuid, clientPhoto.timeEntryOfflineGuid))
            .limit(1);
          
          if (!timeEntry) {
            conflicts.push({
              type: 'missing_reference',
              offlineGuid: clientPhoto.offlineGuid,
              missingRef: clientPhoto.timeEntryOfflineGuid,
              error: 'Time entry not found',
            });
            processedRecords.failed++;
            continue;
          }
          
          // Check if photo already exists
          const [existingPhoto] = await db
            .select()
            .from(photos)
            .where(eq(photos.offlineGuid, clientPhoto.offlineGuid))
            .limit(1);
          
          if (!existingPhoto) {
            await db.insert(photos).values({
              offlineGuid: clientPhoto.offlineGuid,
              timeEntryId: timeEntry.id,
              filename: clientPhoto.filename,
              originalName: clientPhoto.originalName,
              fileSize: clientPhoto.fileSize,
              mimeType: clientPhoto.mimeType,
              width: clientPhoto.width,
              height: clientPhoto.height,
              takenAt: clientPhoto.takenAt,
              latitude: clientPhoto.latitude?.toString(),
              longitude: clientPhoto.longitude?.toString(),
              isSynced: true,
              isDeleted: false,
            });
          }
          
          processedRecords.succeeded++;
          
        } catch (error) {
          request.log.error({ error, entry: clientPhoto }, 'Failed to process photo');
          processedRecords.failed++;
        }
      }
      
      // Update sync log
      await db
        .update(syncLogs)
        .set({
          recordsSucceeded: processedRecords.succeeded,
          recordsFailed: processedRecords.failed,
          completedAt: new Date(),
          status: 'completed',
          ...(conflicts.length > 0 && { errorDetails: conflicts }),
        })
        .where(eq(syncLogs.id, syncLog.id));
      
      reply.send(createApiResponse({ 
        conflicts,
        processed: processedRecords.succeeded + processedRecords.failed,
        succeeded: processedRecords.succeeded,
        failed: processedRecords.failed,
      }));
      
    } catch (error) {
      await db
        .update(syncLogs)
        .set({
          recordsSucceeded: processedRecords.succeeded,
          recordsFailed: processedRecords.failed,
          completedAt: new Date(),
          status: 'failed',
          errorDetails: { error: error instanceof Error ? error.message : 'Unknown error' },
        })
        .where(eq(syncLogs.id, syncLog.id));
      
      throw error;
    }
  });
  
  // Pull server changes to client
  fastify.get('/api/sync/pull', {
    preHandler: [authenticateToken, validateQuery(syncPullQuerySchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    const { since } = request.query as z.infer<typeof syncPullQuerySchema>;
    const workerId = request.user?.workerId;
    
    if (!workerId) {
      reply.code(403).send(createErrorResponse('Worker authentication required'));
      return;
    }
    
    try {
      // Get updated workers (if admin has made changes)
      const updatedWorkers = await db
        .select({
          id: workers.id,
          employeeId: workers.employeeId,
          name: workers.name,
          isActive: workers.isActive,
          updatedAt: workers.updatedAt,
        })
        .from(workers)
        .where(since ? gte(workers.updatedAt, since) : undefined);
      
      // Get updated jobs
      const updatedJobs = await db
        .select()
        .from(jobs)
        .where(since ? gte(jobs.updatedAt, since) : undefined);
      
      // Get break types
      const updatedBreakTypes = await db
        .select()
        .from(breakTypes)
        .where(eq(breakTypes.isActive, true));
      
      // Get system settings
      const settings = await db
        .select()
        .from(systemSettings);
      
      const systemSettingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
      
      reply.send(createApiResponse({
        workers: updatedWorkers,
        jobs: updatedJobs,
        breakTypes: updatedBreakTypes,
        systemSettings: systemSettingsMap,
        lastServerUpdate: new Date(),
      }));
      
    } catch (error) {
      request.log.error({ error }, 'Failed to pull sync data');
      reply.code(500).send(createErrorResponse('Failed to retrieve sync data'));
    }
  });
  
  // Get sync status
  fastify.get('/api/sync/status', {
    preHandler: [authenticateToken],
  }, async (request: AuthenticatedRequest, reply) => {
    const { deviceId } = request.query as { deviceId?: string };
    
    try {
      // Get latest sync logs
      const recentSyncs = await db
        .select()
        .from(syncLogs)
        .where(deviceId ? eq(syncLogs.deviceId, deviceId) : undefined)
        .orderBy(syncLogs.startedAt)
        .limit(10);
      
      const lastSync = recentSyncs[0];
      
      reply.send(createApiResponse({
        lastSync: lastSync?.completedAt || null,
        serverTime: new Date(),
        recentSyncs: recentSyncs.map(sync => ({
          id: sync.id,
          type: sync.syncType,
          startedAt: sync.startedAt,
          completedAt: sync.completedAt,
          status: sync.status,
          recordsProcessed: sync.recordsProcessed,
          recordsSucceeded: sync.recordsSucceeded,
          recordsFailed: sync.recordsFailed,
        })),
      }));
      
    } catch (error) {
      request.log.error({ error }, 'Failed to get sync status');
      reply.code(500).send(createErrorResponse('Failed to get sync status'));
    }
  });
}