import { FastifyInstance } from 'fastify';
import { and, eq, desc } from 'drizzle-orm';
import { photos } from '@field-tracker/db-schema';
import { DatabaseConnection } from '../config/database.js';
import { StorageAdapter } from '../config/storage.js';
import { createApiResponse, createErrorResponse } from '../middleware/validation.js';

export function createPhotoRoutes(
  fastify: FastifyInstance,
  db: DatabaseConnection,
  storage: StorageAdapter
) {
  // Upload photo
  fastify.post('/api/photos', {
    schema: {
      tags: ['photos'],
      summary: 'Upload a photo for a time entry',
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send(createErrorResponse('No file uploaded'));
      }

      // Validate file type
      if (!data.mimetype.startsWith('image/')) {
        return reply.code(400).send(createErrorResponse('Only image files are allowed'));
      }

      // Validate file size (5MB max)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      const buffer = await data.toBuffer();
      
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.code(400).send(createErrorResponse('File too large. Maximum size is 5MB'));
      }

      // Extract form data
      const formData = request.body as any;
      const offlineGuid = formData.offlineGuid?.value;
      const timeEntryId = formData.timeEntryId?.value ? parseInt(formData.timeEntryId.value) : null;
      const capturedAt = formData.capturedAt?.value;
      const latitude = formData.latitude?.value ? parseFloat(formData.latitude.value) : null;
      const longitude = formData.longitude?.value ? parseFloat(formData.longitude.value) : null;
      const originalSize = formData.originalSize?.value ? parseInt(formData.originalSize.value) : buffer.length;
      
      if (!offlineGuid) {
        return reply.code(400).send(createErrorResponse('offlineGuid is required'));
      }

      if (!capturedAt) {
        return reply.code(400).send(createErrorResponse('capturedAt is required'));
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = data.filename?.split('.').pop() || 'jpg';
      const fileName = `photo_${timestamp}_${offlineGuid.slice(0, 8)}.${extension}`;

      // Upload file to storage
      const uploadResult = await storage.uploadFile(
        buffer,
        fileName,
        data.mimetype
      );

      if (!uploadResult.success) {
        fastify.log.error('Failed to upload photo to storage:', uploadResult.error);
        return reply.code(500).send(createErrorResponse('Failed to upload photo'));
      }

      // Save photo record to database
      const [photoRecord] = await db
        .insert(photos)
        .values({
          offlineGuid,
          timeEntryId,
          filename: fileName,
          originalName: data.filename,
          filePath: uploadResult.url,
          fileSize: originalSize,
          mimeType: data.mimetype,
          takenAt: new Date(capturedAt),
          latitude,
          longitude,
          isSynced: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      reply.send(createApiResponse({
        id: photoRecord.id,
        offlineGuid: photoRecord.offlineGuid,
        filename: photoRecord.filename,
        url: photoRecord.filePath,
        fileSize: photoRecord.fileSize,
        compressedSize: photoRecord.compressedSize,
        uploadedAt: photoRecord.createdAt,
      }));

    } catch (error) {
      fastify.log.error('Photo upload failed:', error);
      reply.code(500).send(createErrorResponse('Photo upload failed'));
    }
  });

  // Get photos for a time entry
  fastify.get('/api/photos/time-entry/:timeEntryId', {
    schema: {
      tags: ['photos'],
      summary: 'Get photos for a specific time entry',
      params: {
        type: 'object',
        properties: {
          timeEntryId: { type: 'integer' },
        },
        required: ['timeEntryId'],
      },
    },
  }, async (request, reply) => {
    try {
      const { timeEntryId } = request.params as any;

      const photoRecords = await db
        .select()
        .from(photos)
        .where(and(
          eq(photos.timeEntryId, timeEntryId),
          eq(photos.isDeleted, false)
        ))
        .orderBy(desc(photos.takenAt));

      const photosData = photoRecords.map(photo => ({
        id: photo.id,
        offlineGuid: photo.offlineGuid,
        filename: photo.filename,
        originalName: photo.originalName,
        url: photo.filePath,
        fileSize: photo.fileSize,
        compressedSize: photo.compressedSize,
        mimeType: photo.mimeType,
        takenAt: photo.takenAt,
        latitude: photo.latitude,
        longitude: photo.longitude,
        isSynced: photo.isSynced,
        createdAt: photo.createdAt,
      }));

      reply.send(createApiResponse(photosData));

    } catch (error) {
      fastify.log.error('Failed to get photos for time entry:', error);
      reply.code(500).send(createErrorResponse('Failed to retrieve photos'));
    }
  });

  // Get photo file
  fastify.get('/api/photos/:id/file', {
    schema: {
      tags: ['photos'],
      summary: 'Get photo file by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      const [photo] = await db
        .select()
        .from(photos)
        .where(and(
          eq(photos.id, id),
          eq(photos.isDeleted, false)
        ))
        .limit(1);

      if (!photo) {
        return reply.code(404).send(createErrorResponse('Photo not found'));
      }

      // Get file from storage
      const fileResult = await storage.getFile(photo.filename);

      if (!fileResult.success || !fileResult.data) {
        return reply.code(404).send(createErrorResponse('Photo file not found'));
      }

      reply
        .type(photo.mimeType || 'image/jpeg')
        .header('Content-Length', fileResult.data.length)
        .header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
        .send(fileResult.data);

    } catch (error) {
      fastify.log.error('Failed to serve photo file:', error);
      reply.code(500).send(createErrorResponse('Failed to serve photo'));
    }
  });

  // Delete photo
  fastify.delete('/api/photos/:id', {
    schema: {
      tags: ['photos'],
      summary: 'Delete a photo',
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;

      const [photo] = await db
        .select()
        .from(photos)
        .where(eq(photos.id, id))
        .limit(1);

      if (!photo) {
        return reply.code(404).send(createErrorResponse('Photo not found'));
      }

      // Mark as deleted in database (soft delete)
      await db
        .update(photos)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(eq(photos.id, id));

      // Optionally delete from storage (uncomment for hard delete)
      // await storage.deleteFile(photo.filename);

      reply.send(createApiResponse({ success: true }));

    } catch (error) {
      fastify.log.error('Failed to delete photo:', error);
      reply.code(500).send(createErrorResponse('Failed to delete photo'));
    }
  });

  // Bulk photo sync endpoint
  fastify.post('/api/photos/sync', {
    schema: {
      tags: ['photos'],
      summary: 'Sync multiple photos from mobile device',
      body: {
        type: 'object',
        properties: {
          photos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                offlineGuid: { type: 'string' },
                timeEntryId: { type: 'integer' },
                fileName: { type: 'string' },
                mimeType: { type: 'string' },
                fileSize: { type: 'integer' },
                compressedSize: { type: 'integer' },
                capturedAt: { type: 'string', format: 'date-time' },
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                base64Data: { type: 'string' },
              },
              required: ['offlineGuid', 'fileName', 'mimeType', 'fileSize', 'capturedAt', 'base64Data'],
            },
          },
        },
        required: ['photos'],
      },
    },
  }, async (request, reply) => {
    try {
      const { photos: photoData } = request.body as any;
      const results = [];

      for (const photoInfo of photoData) {
        try {
          // Check if photo already exists
          const [existingPhoto] = await db
            .select()
            .from(photos)
            .where(eq(photos.offlineGuid, photoInfo.offlineGuid))
            .limit(1);

          if (existingPhoto) {
            results.push({
              offlineGuid: photoInfo.offlineGuid,
              success: true,
              id: existingPhoto.id,
              message: 'Photo already synced',
            });
            continue;
          }

          // Decode base64 data
          const buffer = Buffer.from(photoInfo.base64Data, 'base64');

          // Generate filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = photoInfo.fileName.split('.').pop() || 'jpg';
          const fileName = `photo_${timestamp}_${photoInfo.offlineGuid.slice(0, 8)}.${extension}`;

          // Upload to storage
          const uploadResult = await storage.uploadFile(
            buffer,
            fileName,
            photoInfo.mimeType
          );

          if (!uploadResult.success) {
            results.push({
              offlineGuid: photoInfo.offlineGuid,
              success: false,
              error: 'Failed to upload to storage',
            });
            continue;
          }

          // Save to database
          const [photoRecord] = await db
            .insert(photos)
            .values({
              offlineGuid: photoInfo.offlineGuid,
              timeEntryId: photoInfo.timeEntryId || null,
              filename: fileName,
              originalName: photoInfo.fileName,
              filePath: uploadResult.url,
              fileSize: photoInfo.fileSize,
              compressedSize: photoInfo.compressedSize,
              mimeType: photoInfo.mimeType,
              takenAt: new Date(photoInfo.capturedAt),
              latitude: photoInfo.latitude || null,
              longitude: photoInfo.longitude || null,
              isSynced: true,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          results.push({
            offlineGuid: photoInfo.offlineGuid,
            success: true,
            id: photoRecord.id,
            url: photoRecord.filePath,
          });

        } catch (photoError) {
          fastify.log.error(`Failed to sync photo ${photoInfo.offlineGuid}:`, photoError);
          results.push({
            offlineGuid: photoInfo.offlineGuid,
            success: false,
            error: 'Processing failed',
          });
        }
      }

      reply.send(createApiResponse({
        results,
        totalProcessed: photoData.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }));

    } catch (error) {
      fastify.log.error('Bulk photo sync failed:', error);
      reply.code(500).send(createErrorResponse('Bulk photo sync failed'));
    }
  });
}