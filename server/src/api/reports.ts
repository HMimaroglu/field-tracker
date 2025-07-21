import { FastifyInstance } from 'fastify';
import { and, eq, gte, lte, desc, sql } from 'drizzle-orm';
import { timeEntries, workers, jobs } from '@field-tracker/db-schema';
import { DatabaseConnection } from '../config/database.js';

export function createReportsRoutes(
  fastify: FastifyInstance,
  db: DatabaseConnection
) {
  // Get time entries with filters for reports
  fastify.get('/api/time-entries', {
    schema: {
      tags: ['reports'],
      summary: 'Get time entries for reporting',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          workerId: { type: 'integer' },
          jobId: { type: 'integer' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          hasConflict: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 100, 
        workerId, 
        jobId, 
        startDate, 
        endDate, 
        hasConflict 
      } = request.query as any;

      // Build WHERE conditions
      const conditions = [];
      
      if (workerId) conditions.push(eq(timeEntries.workerId, workerId));
      if (jobId) conditions.push(eq(timeEntries.jobId, jobId));
      if (startDate) conditions.push(gte(timeEntries.startTime, new Date(startDate)));
      if (endDate) conditions.push(lte(timeEntries.startTime, new Date(endDate + 'T23:59:59')));
      if (typeof hasConflict === 'boolean') conditions.push(eq(timeEntries.hasConflict, hasConflict));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(timeEntries)
        .where(whereClause);

      const total = countResult[0]?.count || 0;

      // Get paginated results with joins
      const offset = (page - 1) * limit;
      const entries = await db
        .select({
          id: timeEntries.id,
          offlineGuid: timeEntries.offlineGuid,
          workerId: timeEntries.workerId,
          jobId: timeEntries.jobId,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          startLatitude: timeEntries.startLatitude,
          startLongitude: timeEntries.startLongitude,
          endLatitude: timeEntries.endLatitude,
          endLongitude: timeEntries.endLongitude,
          notes: timeEntries.notes,
          regularHours: timeEntries.regularHours,
          overtimeHours: timeEntries.overtimeHours,
          hasConflict: timeEntries.hasConflict,
          conflictReason: timeEntries.conflictReason,
          createdAt: timeEntries.createdAt,
          updatedAt: timeEntries.updatedAt,
          worker: {
            employeeId: workers.employeeId,
            name: workers.name,
          },
          job: {
            jobCode: jobs.jobCode,
            name: jobs.name,
          },
        })
        .from(timeEntries)
        .leftJoin(workers, eq(timeEntries.workerId, workers.id))
        .leftJoin(jobs, eq(timeEntries.jobId, jobs.id))
        .where(whereClause)
        .orderBy(desc(timeEntries.startTime))
        .limit(limit)
        .offset(offset);

      reply.send({
        success: true,
        data: {
          data: entries,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      fastify.log.error('Failed to fetch time entries:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch time entries',
        code: 'FETCH_FAILED',
      });
    }
  });

  // Export timesheet as CSV
  fastify.get('/api/reports/export', {
    schema: {
      tags: ['reports'],
      summary: 'Export timesheet data as CSV',
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv'], default: 'csv' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          workerId: { type: 'integer' },
          jobId: { type: 'integer' },
          includeBreaks: { type: 'boolean', default: false },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { 
        format = 'csv',
        startDate, 
        endDate, 
        workerId, 
        jobId, 
        includeBreaks = false 
      } = request.query as any;

      // Build WHERE conditions
      const conditions = [];
      
      if (workerId) conditions.push(eq(timeEntries.workerId, workerId));
      if (jobId) conditions.push(eq(timeEntries.jobId, jobId));
      if (startDate) conditions.push(gte(timeEntries.startTime, new Date(startDate)));
      if (endDate) conditions.push(lte(timeEntries.startTime, new Date(endDate + 'T23:59:59')));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get data for export
      const entries = await db
        .select({
          employeeId: workers.employeeId,
          workerName: workers.name,
          jobCode: jobs.jobCode,
          jobName: jobs.name,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          regularHours: timeEntries.regularHours,
          overtimeHours: timeEntries.overtimeHours,
          notes: timeEntries.notes,
          startLatitude: timeEntries.startLatitude,
          startLongitude: timeEntries.startLongitude,
          endLatitude: timeEntries.endLatitude,
          endLongitude: timeEntries.endLongitude,
        })
        .from(timeEntries)
        .leftJoin(workers, eq(timeEntries.workerId, workers.id))
        .leftJoin(jobs, eq(timeEntries.jobId, jobs.id))
        .where(whereClause)
        .orderBy(desc(timeEntries.startTime));

      if (format === 'csv') {
        // Generate CSV content
        const headers = [
          'Employee ID',
          'Worker Name', 
          'Job Code',
          'Job Name',
          'Start Date',
          'Start Time',
          'End Date',
          'End Time',
          'Regular Hours',
          'Overtime Hours',
          'Total Hours',
          'Notes',
          'Start Latitude',
          'Start Longitude',
          'End Latitude',
          'End Longitude',
        ];

        const csvRows = entries.map(entry => {
          const startDate = entry.startTime ? new Date(entry.startTime) : null;
          const endDate = entry.endTime ? new Date(entry.endTime) : null;
          
          const regularHours = entry.regularHours ? parseFloat(entry.regularHours.toString()) : 0;
          const overtimeHours = entry.overtimeHours ? parseFloat(entry.overtimeHours.toString()) : 0;
          const totalHours = regularHours + overtimeHours;

          return [
            entry.employeeId || '',
            entry.workerName || '',
            entry.jobCode || '',
            entry.jobName || '',
            startDate ? startDate.toLocaleDateString() : '',
            startDate ? startDate.toLocaleTimeString() : '',
            endDate ? endDate.toLocaleDateString() : '',
            endDate ? endDate.toLocaleTimeString() : 'In Progress',
            regularHours.toFixed(2),
            overtimeHours.toFixed(2),
            totalHours.toFixed(2),
            (entry.notes || '').replace(/"/g, '""'), // Escape quotes for CSV
            entry.startLatitude || '',
            entry.startLongitude || '',
            entry.endLatitude || '',
            entry.endLongitude || '',
          ].map(field => `"${field}"`).join(',');
        });

        const csvContent = [
          headers.map(h => `"${h}"`).join(','),
          ...csvRows
        ].join('\n');

        // Generate filename
        const dateRange = startDate && endDate 
          ? `${startDate}_to_${endDate}`
          : new Date().toISOString().split('T')[0];
        
        const filename = `timesheet_export_${dateRange}.csv`;

        reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send({
            success: true,
            data: {
              content: csvContent,
              filename,
              recordCount: entries.length,
            },
          });
      } else {
        reply.code(400).send({
          success: false,
          error: 'Unsupported export format',
          code: 'INVALID_FORMAT',
        });
      }
    } catch (error) {
      fastify.log.error('Failed to export timesheet:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to export timesheet',
        code: 'EXPORT_FAILED',
      });
    }
  });

  // Get conflicts that need manual resolution
  fastify.get('/api/reports/conflicts', {
    schema: {
      tags: ['reports'],
      summary: 'Get time entry conflicts that need resolution',
    },
  }, async (request, reply) => {
    try {
      const conflicts = await db
        .select({
          id: timeEntries.id,
          offlineGuid: timeEntries.offlineGuid,
          workerId: timeEntries.workerId,
          jobId: timeEntries.jobId,
          startTime: timeEntries.startTime,
          endTime: timeEntries.endTime,
          conflictReason: timeEntries.conflictReason,
          createdAt: timeEntries.createdAt,
          worker: {
            employeeId: workers.employeeId,
            name: workers.name,
          },
          job: {
            jobCode: jobs.jobCode,
            name: jobs.name,
          },
        })
        .from(timeEntries)
        .leftJoin(workers, eq(timeEntries.workerId, workers.id))
        .leftJoin(jobs, eq(timeEntries.jobId, jobs.id))
        .where(eq(timeEntries.hasConflict, true))
        .orderBy(desc(timeEntries.createdAt));

      reply.send({
        success: true,
        data: conflicts,
      });
    } catch (error) {
      fastify.log.error('Failed to fetch conflicts:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch conflicts',
        code: 'FETCH_FAILED',
      });
    }
  });

  // Resolve a conflict
  fastify.post('/api/reports/conflicts/:id/resolve', {
    schema: {
      tags: ['reports'],
      summary: 'Resolve a time entry conflict',
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['accept_as_is', 'split', 'merge', 'discard'] 
          },
          notes: { type: 'string' },
        },
        required: ['action'],
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { action, notes } = request.body as any;

      // For now, we'll just mark the conflict as resolved
      // In a full implementation, you'd handle the different actions
      const result = await db
        .update(timeEntries)
        .set({
          hasConflict: false,
          conflictReason: notes || `Resolved: ${action}`,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, id))
        .returning();

      if (result.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Time entry not found',
          code: 'NOT_FOUND',
        });
      }

      reply.send({
        success: true,
        data: result[0],
      });
    } catch (error) {
      fastify.log.error('Failed to resolve conflict:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to resolve conflict',
        code: 'RESOLVE_FAILED',
      });
    }
  });
}