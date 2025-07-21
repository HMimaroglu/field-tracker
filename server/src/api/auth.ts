import { FastifyInstance } from 'fastify';
import { validateBody, createApiResponse, createErrorResponse } from '../middleware/validation.js';
import { z } from 'zod';
import type { Database } from '../config/database.js';
import type { EnvConfig } from '../config/env.js';

const adminLoginSchema = z.object({
  password: z.string().min(1),
});

const workerLoginSchema = z.object({
  employeeId: z.string().min(1),
  pin: z.string().length(4).regex(/^\d{4}$/),
  deviceId: z.string().min(1),
});

export function createAuthRoutes(fastify: FastifyInstance, db: Database, config: EnvConfig, authMiddleware: any) {
  
  // Admin login
  fastify.post('/api/auth/admin/login', {
    preHandler: [validateBody(adminLoginSchema)],
  }, async (request, reply) => {
    const { password } = request.body as z.infer<typeof adminLoginSchema>;
    
    try {
      if (password !== config.ADMIN_PASSWORD) {
        reply.code(401).send(createErrorResponse('Invalid credentials'));
        return;
      }
      
      const token = authMiddleware.generateToken({ type: 'admin' });
      
      reply.send(createApiResponse({
        token,
        user: { type: 'admin' },
        expiresIn: '24h',
      }));
      
    } catch (error) {
      request.log.error({ error }, 'Admin login failed');
      reply.code(500).send(createErrorResponse('Login failed'));
    }
  });
  
  // Worker login with PIN
  fastify.post('/api/auth/worker/login', {
    preHandler: [validateBody(workerLoginSchema)],
  }, async (request, reply) => {
    const { employeeId, pin, deviceId } = request.body as z.infer<typeof workerLoginSchema>;
    
    try {
      // Use the existing authenticateWorker middleware logic
      // but return a token instead of setting request.user
      const mockRequest = {
        body: { employeeId, pin, deviceId },
        log: request.log,
      } as any;
      
      const mockReply = {
        code: (status: number) => ({
          send: (data: any) => {
            reply.code(status).send(data);
            return;
          }
        })
      } as any;
      
      try {
        await authMiddleware.authenticateWorker(mockRequest, mockReply);
        
        // If we get here, authentication succeeded
        const token = authMiddleware.generateToken({
          type: 'worker',
          workerId: mockRequest.user.workerId,
          deviceId,
        });
        
        reply.send(createApiResponse({
          token,
          user: {
            type: 'worker',
            workerId: mockRequest.user.workerId,
            deviceId,
          },
          expiresIn: '24h',
        }));
        
      } catch (authError) {
        // Authentication failed - error already sent by middleware
        return;
      }
      
    } catch (error) {
      request.log.error({ error }, 'Worker login failed');
      reply.code(500).send(createErrorResponse('Login failed'));
    }
  });
  
  // Token refresh
  fastify.post('/api/auth/refresh', {
    preHandler: [authMiddleware.authenticateToken],
  }, async (request: any, reply) => {
    try {
      // Generate new token with same user data
      const token = authMiddleware.generateToken(request.user);
      
      reply.send(createApiResponse({
        token,
        user: request.user,
        expiresIn: '24h',
      }));
      
    } catch (error) {
      request.log.error({ error }, 'Token refresh failed');
      reply.code(500).send(createErrorResponse('Token refresh failed'));
    }
  });
  
  // Get current user info
  fastify.get('/api/auth/me', {
    preHandler: [authMiddleware.authenticateToken],
  }, async (request: any, reply) => {
    reply.send(createApiResponse({
      user: request.user,
    }));
  });
  
  // License validation endpoint
  fastify.get('/api/auth/license/status', {}, authMiddleware.validateLicenseEndpoint);
}