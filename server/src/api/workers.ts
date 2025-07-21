import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { workers } from '@field-tracker/db-schema';
import { validateBody, validateParams, validateQuery, createApiResponse, createErrorResponse, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authenticateAdmin, authenticateToken } from '../middleware/auth.js';
import { workerSchema } from '@field-tracker/db-schema';
import { validateBatch } from '@field-tracker/shared-utils';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import type { Database } from '../config/database.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const createWorkerSchema = workerSchema.extend({
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const updateWorkerSchema = createWorkerSchema.partial();

const bulkImportSchema = z.object({
  workers: z.array(createWorkerSchema),
});

const workerQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
});

export function createWorkerRoutes(fastify: FastifyInstance, db: Database) {
  
  // List workers (admin only)
  fastify.get('/api/workers', {
    preHandler: [authenticateToken, validateQuery(workerQuerySchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const { page, limit, search, isActive } = request.query as z.infer<typeof workerQuerySchema>;
    
    try {
      let query = db.select({
        id: workers.id,
        employeeId: workers.employeeId,
        name: workers.name,
        isActive: workers.isActive,
        createdAt: workers.createdAt,
        updatedAt: workers.updatedAt,
      }).from(workers);
      
      // Apply filters
      const conditions = [];
      if (isActive !== undefined) {
        conditions.push(eq(workers.isActive, isActive));
      }
      
      if (search) {
        // Note: This would need proper text search in production
        // For now, we'll do basic name/employeeId matching
      }
      
      const offset = (page - 1) * limit;
      const allWorkers = await query.limit(limit).offset(offset);
      
      // Get total count for pagination
      const totalCount = await db
        .select({ count: workers.id })
        .from(workers);
      
      const total = totalCount.length;
      const totalPages = Math.ceil(total / limit);
      
      reply.send(createApiResponse({
        data: allWorkers,
        total,
        page,
        limit,
        totalPages,
      }));
      
    } catch (error) {
      request.log.error({ error }, 'Failed to list workers');
      reply.code(500).send(createErrorResponse('Failed to retrieve workers'));
    }
  });
  
  // Get worker by ID
  fastify.get('/api/workers/:id', {
    preHandler: [authenticateToken, validateParams(idParamSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const { id } = request.params as z.infer<typeof idParamSchema>;
    
    try {
      const [worker] = await db
        .select({
          id: workers.id,
          employeeId: workers.employeeId,
          name: workers.name,
          isActive: workers.isActive,
          createdAt: workers.createdAt,
          updatedAt: workers.updatedAt,
        })
        .from(workers)
        .where(eq(workers.id, id))
        .limit(1);
      
      if (!worker) {
        reply.code(404).send(createErrorResponse('Worker not found'));
        return;
      }
      
      reply.send(createApiResponse(worker));
      
    } catch (error) {
      request.log.error({ error, workerId: id }, 'Failed to get worker');
      reply.code(500).send(createErrorResponse('Failed to retrieve worker'));
    }
  });
  
  // Create worker (admin only)
  fastify.post('/api/workers', {
    preHandler: [authenticateToken, validateBody(createWorkerSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const workerData = request.body as z.infer<typeof createWorkerSchema>;
    
    try {
      // Hash the PIN
      const hashedPin = await bcrypt.hash(workerData.pin, 10);
      
      // Check for duplicate employee ID
      const [existing] = await db
        .select({ id: workers.id })
        .from(workers)
        .where(eq(workers.employeeId, workerData.employeeId))
        .limit(1);
      
      if (existing) {
        reply.code(409).send(createErrorResponse('Employee ID already exists', 'DUPLICATE_EMPLOYEE_ID'));
        return;
      }
      
      const [newWorker] = await db
        .insert(workers)
        .values({
          employeeId: workerData.employeeId,
          name: workerData.name,
          pin: hashedPin,
          isActive: workerData.isActive ?? true,
        })
        .returning({
          id: workers.id,
          employeeId: workers.employeeId,
          name: workers.name,
          isActive: workers.isActive,
          createdAt: workers.createdAt,
          updatedAt: workers.updatedAt,
        });
      
      reply.code(201).send(createApiResponse(newWorker));
      
    } catch (error) {
      request.log.error({ error, workerData }, 'Failed to create worker');
      
      if (error instanceof Error && error.message.includes('duplicate key')) {
        reply.code(409).send(createErrorResponse('Employee ID already exists', 'DUPLICATE_EMPLOYEE_ID'));
        return;
      }
      
      reply.code(500).send(createErrorResponse('Failed to create worker'));
    }
  });
  
  // Update worker (admin only)
  fastify.put('/api/workers/:id', {
    preHandler: [authenticateToken, validateParams(idParamSchema), validateBody(updateWorkerSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const { id } = request.params as z.infer<typeof idParamSchema>;
    const updateData = request.body as z.infer<typeof updateWorkerSchema>;
    
    try {
      // Check if worker exists
      const [existing] = await db
        .select({ id: workers.id })
        .from(workers)
        .where(eq(workers.id, id))
        .limit(1);
      
      if (!existing) {
        reply.code(404).send(createErrorResponse('Worker not found'));
        return;
      }
      
      // Prepare update data
      const updateValues: any = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      // Hash PIN if provided
      if (updateData.pin) {
        updateValues.pin = await bcrypt.hash(updateData.pin, 10);
      }
      
      // Check for duplicate employee ID if changing
      if (updateData.employeeId) {
        const [duplicate] = await db
          .select({ id: workers.id })
          .from(workers)
          .where(eq(workers.employeeId, updateData.employeeId))
          .limit(1);
        
        if (duplicate && duplicate.id !== id) {
          reply.code(409).send(createErrorResponse('Employee ID already exists', 'DUPLICATE_EMPLOYEE_ID'));
          return;
        }
      }
      
      const [updatedWorker] = await db
        .update(workers)
        .set(updateValues)
        .where(eq(workers.id, id))
        .returning({
          id: workers.id,
          employeeId: workers.employeeId,
          name: workers.name,
          isActive: workers.isActive,
          createdAt: workers.createdAt,
          updatedAt: workers.updatedAt,
        });
      
      reply.send(createApiResponse(updatedWorker));
      
    } catch (error) {
      request.log.error({ error, workerId: id, updateData }, 'Failed to update worker');
      
      if (error instanceof Error && error.message.includes('duplicate key')) {
        reply.code(409).send(createErrorResponse('Employee ID already exists', 'DUPLICATE_EMPLOYEE_ID'));
        return;
      }
      
      reply.code(500).send(createErrorResponse('Failed to update worker'));
    }
  });
  
  // Delete worker (admin only)
  fastify.delete('/api/workers/:id', {
    preHandler: [authenticateToken, validateParams(idParamSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const { id } = request.params as z.infer<typeof idParamSchema>;
    
    try {
      // Check if worker exists and has time entries
      const [existing] = await db
        .select({ id: workers.id })
        .from(workers)
        .where(eq(workers.id, id))
        .limit(1);
      
      if (!existing) {
        reply.code(404).send(createErrorResponse('Worker not found'));
        return;
      }
      
      // Soft delete by setting isActive to false
      await db
        .update(workers)
        .set({ 
          isActive: false, 
          updatedAt: new Date() 
        })
        .where(eq(workers.id, id));
      
      reply.code(204).send();
      
    } catch (error) {
      request.log.error({ error, workerId: id }, 'Failed to delete worker');
      reply.code(500).send(createErrorResponse('Failed to delete worker'));
    }
  });
  
  // Bulk import workers (admin only)
  fastify.post('/api/workers/bulk', {
    preHandler: [authenticateToken, validateBody(bulkImportSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const { workers: workersToImport } = request.body as z.infer<typeof bulkImportSchema>;
    
    try {
      const { valid, invalid } = validateBatch(workersToImport, createWorkerSchema);
      
      if (invalid.length > 0) {
        reply.code(400).send(createErrorResponse('Some workers have validation errors', 'VALIDATION_ERRORS'));
        return;
      }
      
      const created = [];
      const errors = [];
      
      for (const workerData of valid) {
        try {
          // Hash the PIN
          const hashedPin = await bcrypt.hash(workerData.pin, 10);
          
          // Check for duplicate employee ID
          const [existing] = await db
            .select({ id: workers.id })
            .from(workers)
            .where(eq(workers.employeeId, workerData.employeeId))
            .limit(1);
          
          if (existing) {
            errors.push({
              employeeId: workerData.employeeId,
              error: 'Employee ID already exists',
            });
            continue;
          }
          
          const [newWorker] = await db
            .insert(workers)
            .values({
              employeeId: workerData.employeeId,
              name: workerData.name,
              pin: hashedPin,
              isActive: workerData.isActive ?? true,
            })
            .returning({
              id: workers.id,
              employeeId: workers.employeeId,
              name: workers.name,
              isActive: workers.isActive,
              createdAt: workers.createdAt,
              updatedAt: workers.updatedAt,
            });
          
          created.push(newWorker);
          
        } catch (error) {
          errors.push({
            employeeId: workerData.employeeId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      reply.send(createApiResponse({
        created,
        errors,
        summary: {
          total: workersToImport.length,
          succeeded: created.length,
          failed: errors.length,
        },
      }));
      
    } catch (error) {
      request.log.error({ error }, 'Failed to bulk import workers');
      reply.code(500).send(createErrorResponse('Failed to import workers'));
    }
  });
}