import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function createErrorHandler() {
  return (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Log the error
    request.log.error(error);
    
    // Handle validation errors
    if (error.validation) {
      reply.code(400).send({
        success: false,
        error: 'Validation failed',
        details: error.validation,
      });
      return;
    }
    
    // Handle known application errors
    if (error.statusCode) {
      reply.code(error.statusCode).send({
        success: false,
        error: error.message,
        ...(error.code && { code: error.code }),
      });
      return;
    }
    
    // Handle database errors
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      reply.code(409).send({
        success: false,
        error: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
      });
      return;
    }
    
    if (error.message.includes('foreign key constraint')) {
      reply.code(400).send({
        success: false,
        error: 'Invalid reference to related resource',
        code: 'INVALID_REFERENCE',
      });
      return;
    }
    
    if (error.message.includes('not found')) {
      reply.code(404).send({
        success: false,
        error: 'Resource not found',
        code: 'NOT_FOUND',
      });
      return;
    }
    
    // Handle file upload errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      reply.code(413).send({
        success: false,
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
      });
      return;
    }
    
    // Handle authentication errors
    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
      reply.code(401).send({
        success: false,
        error: 'Authentication token expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }
    
    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
      reply.code(401).send({
        success: false,
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      });
      return;
    }
    
    // Default server error
    reply.code(500).send({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      code: 'INTERNAL_ERROR',
    });
  };
}

// Helper function to create custom errors
export function createError(message: string, statusCode = 500, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// Common error creators
export const errors = {
  notFound: (resource = 'Resource') => createError(`${resource} not found`, 404, 'NOT_FOUND'),
  unauthorized: (message = 'Unauthorized') => createError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => createError(message, 403, 'FORBIDDEN'),
  badRequest: (message = 'Bad request') => createError(message, 400, 'BAD_REQUEST'),
  conflict: (message = 'Resource already exists') => createError(message, 409, 'CONFLICT'),
  tooLarge: (message = 'Request too large') => createError(message, 413, 'TOO_LARGE'),
  licenseInvalid: () => createError('Invalid or expired license', 403, 'LICENSE_INVALID'),
  seatLimitExceeded: () => createError('License seat limit exceeded', 403, 'SEAT_LIMIT_EXCEEDED'),
};