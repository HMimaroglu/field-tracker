import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      reply.code(400).send({
        success: false,
        error: 'Invalid request body',
      });
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      reply.code(400).send({
        success: false,
        error: 'Invalid query parameters',
      });
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Invalid path parameters',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      reply.code(400).send({
        success: false,
        error: 'Invalid path parameters',
      });
    }
  };
}

// Common parameter schemas
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Common query schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Helper to create API response
export function createApiResponse<T>(data: T) {
  return { success: true as const, data };
}

export function createErrorResponse(error: string, code?: string) {
  return { success: false as const, error, ...(code && { code }) };
}