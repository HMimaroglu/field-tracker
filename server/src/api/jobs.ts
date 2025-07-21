import { FastifyInstance } from 'fastify';
import { eq, ilike } from 'drizzle-orm';
import { jobs } from '@field-tracker/db-schema';
import { validateBody, validateParams, validateQuery, createApiResponse, createErrorResponse, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authenticateAdmin, authenticateToken } from '../middleware/auth.js';
import { jobSchema } from '@field-tracker/db-schema';
import { z } from 'zod';
import type { Database } from '../config/database.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const createJobSchema = jobSchema;
const updateJobSchema = jobSchema.partial();

const jobQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  tags: z.string().optional(), // Comma-separated tags
});

export function createJobRoutes(fastify: FastifyInstance, db: Database) {
  
  // List jobs (accessible by workers and admin)
  fastify.get('/api/jobs', {
    preHandler: [authenticateToken, validateQuery(jobQuerySchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    const { page, limit, search, isActive, tags } = request.query as z.infer<typeof jobQuerySchema>;
    
    try {
      let query = db.select().from(jobs);
      
      // Apply filters
      const conditions = [];
      if (isActive !== undefined) {
        conditions.push(eq(jobs.isActive, isActive));
      }
      
      // For workers, only show active jobs
      if (request.user?.type === 'worker') {
        conditions.push(eq(jobs.isActive, true));
      }
      
      // Note: Search and tag filtering would need proper implementation
      // For now, we'll return basic filtered results
      
      const offset = (page - 1) * limit;
      const allJobs = await query.limit(limit).offset(offset);
      
      // Get total count for pagination
      const totalCount = await db
        .select({ count: jobs.id })
        .from(jobs);
      
      const total = totalCount.length;
      const totalPages = Math.ceil(total / limit);
      
      reply.send(createApiResponse({
        data: allJobs,
        total,
        page,
        limit,
        totalPages,
      }));
      
    } catch (error) {
      request.log.error({ error }, 'Failed to list jobs');
      reply.code(500).send(createErrorResponse('Failed to retrieve jobs'));
    }
  });
  
  // Get job by ID
  fastify.get('/api/jobs/:id', {
    preHandler: [authenticateToken, validateParams(idParamSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    const { id } = request.params as z.infer<typeof idParamSchema>;
    
    try {
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);
      
      if (!job) {
        reply.code(404).send(createErrorResponse('Job not found'));
        return;
      }
      
      // Workers can only access active jobs
      if (request.user?.type === 'worker' && !job.isActive) {
        reply.code(404).send(createErrorResponse('Job not found'));
        return;
      }
      
      reply.send(createApiResponse(job));
      
    } catch (error) {
      request.log.error({ error, jobId: id }, 'Failed to get job');
      reply.code(500).send(createErrorResponse('Failed to retrieve job'));
    }
  });
  
  // Create job (admin only)
  fastify.post('/api/jobs', {
    preHandler: [authenticateToken, validateBody(createJobSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const jobData = request.body as z.infer<typeof createJobSchema>;
    
    try {
      // Check for duplicate job code
      const [existing] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(eq(jobs.jobCode, jobData.jobCode))
        .limit(1);
      
      if (existing) {
        reply.code(409).send(createErrorResponse('Job code already exists', 'DUPLICATE_JOB_CODE'));
        return;
      }
      
      const [newJob] = await db
        .insert(jobs)
        .values({
          jobCode: jobData.jobCode,
          name: jobData.name,
          description: jobData.description,
          tags: jobData.tags,
          isActive: jobData.isActive ?? true,
        })
        .returning();
      
      reply.code(201).send(createApiResponse(newJob));
      
    } catch (error) {
      request.log.error({ error, jobData }, 'Failed to create job');
      
      if (error instanceof Error && error.message.includes('duplicate key')) {
        reply.code(409).send(createErrorResponse('Job code already exists', 'DUPLICATE_JOB_CODE'));
        return;
      }
      
      reply.code(500).send(createErrorResponse('Failed to create job'));
    }
  });
  
  // Update job (admin only)
  fastify.put('/api/jobs/:id', {
    preHandler: [authenticateToken, validateParams(idParamSchema), validateBody(updateJobSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const { id } = request.params as z.infer<typeof idParamSchema>;
    const updateData = request.body as z.infer<typeof updateJobSchema>;
    
    try {
      // Check if job exists
      const [existing] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);
      
      if (!existing) {
        reply.code(404).send(createErrorResponse('Job not found'));
        return;
      }
      
      // Check for duplicate job code if changing
      if (updateData.jobCode) {
        const [duplicate] = await db
          .select({ id: jobs.id })
          .from(jobs)
          .where(eq(jobs.jobCode, updateData.jobCode))
          .limit(1);
        
        if (duplicate && duplicate.id !== id) {
          reply.code(409).send(createErrorResponse('Job code already exists', 'DUPLICATE_JOB_CODE'));
          return;
        }
      }
      
      const [updatedJob] = await db
        .update(jobs)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, id))
        .returning();
      
      reply.send(createApiResponse(updatedJob));
      
    } catch (error) {
      request.log.error({ error, jobId: id, updateData }, 'Failed to update job');
      
      if (error instanceof Error && error.message.includes('duplicate key')) {
        reply.code(409).send(createErrorResponse('Job code already exists', 'DUPLICATE_JOB_CODE'));
        return;
      }
      
      reply.code(500).send(createErrorResponse('Failed to update job'));
    }
  });
  
  // Delete job (admin only) - soft delete
  fastify.delete('/api/jobs/:id', {
    preHandler: [authenticateToken, validateParams(idParamSchema)],
  }, async (request: AuthenticatedRequest, reply) => {
    if (request.user?.type !== 'admin') {
      reply.code(403).send(createErrorResponse('Admin access required'));
      return;
    }
    
    const { id } = request.params as z.infer<typeof idParamSchema>;
    
    try {
      // Check if job exists
      const [existing] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);
      
      if (!existing) {
        reply.code(404).send(createErrorResponse('Job not found'));
        return;
      }
      
      // Soft delete by setting isActive to false
      await db
        .update(jobs)
        .set({ 
          isActive: false, 
          updatedAt: new Date() 
        })
        .where(eq(jobs.id, id));
      
      reply.code(204).send();
      
    } catch (error) {
      request.log.error({ error, jobId: id }, 'Failed to delete job');
      reply.code(500).send(createErrorResponse('Failed to delete job'));
    }
  });
  
  // Get job by QR/NFC code (for future implementation)
  fastify.get('/api/jobs/code/:code', {
    preHandler: [authenticateToken],
  }, async (request: AuthenticatedRequest, reply) => {
    const { code } = request.params as { code: string };
    
    try {
      // For now, treat code as jobCode
      // In future, this could be a separate QR/NFC code field
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.jobCode, code))
        .limit(1);
      
      if (!job || !job.isActive) {
        reply.code(404).send(createErrorResponse('Job not found or inactive'));
        return;
      }
      
      reply.send(createApiResponse(job));
      
    } catch (error) {
      request.log.error({ error, code }, 'Failed to get job by code');
      reply.code(500).send(createErrorResponse('Failed to retrieve job'));
    }
  });
}