import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { validateEnv } from './config/env.js';
import { createDatabase } from './config/database.js';
import { createLogger } from './config/logger.js';
import { createStorageAdapter } from './config/storage.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createErrorHandler } from './middleware/error.js';

import { createAuthRoutes } from './api/auth.js';
import { createSyncRoutes } from './api/sync.js';
import { createWorkerRoutes } from './api/workers.js';
import { createJobRoutes } from './api/jobs.js';

import path from 'path';

async function start() {
  // Validate environment variables
  const config = validateEnv();
  
  // Create Fastify instance
  const fastify = Fastify({
    logger: createLogger(config),
  });
  
  // Register error handler
  fastify.setErrorHandler(createErrorHandler());
  
  // Register plugins
  await fastify.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
  });
  
  await fastify.register(multipart, {
    limits: {
      fileSize: 200 * 1024, // 200KB
      files: 3,
    },
  });
  
  // Serve static files (for local storage)
  if (config.STORAGE_TYPE === 'local') {
    await fastify.register(staticFiles, {
      root: path.resolve(config.UPLOAD_DIR),
      prefix: '/files/',
    });
  }
  
  // Register Swagger for API documentation
  if (config.NODE_ENV === 'development') {
    await fastify.register(swagger, {
      swagger: {
        info: {
          title: 'Field Tracker API',
          description: 'API for field crew time tracking system',
          version: '0.1.0',
        },
        host: `${config.HOST}:${config.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'auth', description: 'Authentication endpoints' },
          { name: 'sync', description: 'Data synchronization' },
          { name: 'workers', description: 'Worker management' },
          { name: 'jobs', description: 'Job management' },
          { name: 'reports', description: 'Reports and exports' },
        ],
      },
    });
    
    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }
  
  // Initialize database connection
  const db = createDatabase(config);
  
  // Initialize storage adapter
  const storage = createStorageAdapter(config);
  
  // Initialize authentication middleware
  const authMiddleware = createAuthMiddleware(db, config);
  
  // Health check endpoint
  fastify.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  });
  
  // Register API routes
  createAuthRoutes(fastify, db, config, authMiddleware);
  createSyncRoutes(fastify, db);
  createWorkerRoutes(fastify, db);
  createJobRoutes(fastify, db);
  
  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: 'Route not found',
      code: 'NOT_FOUND',
    });
  });
  
  try {
    await fastify.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });
    
    console.log(`
🚀 Field Tracker Server is running!

🌐 Server: http://${config.HOST}:${config.PORT}
📚 API Docs: http://${config.HOST}:${config.PORT}/docs (dev only)
🏥 Health: http://${config.HOST}:${config.PORT}/health

🗄️  Database: ${config.DATABASE_URL}
📁 Storage: ${config.STORAGE_TYPE} ${config.STORAGE_TYPE === 'local' ? `(${config.UPLOAD_DIR})` : `(${config.S3_BUCKET})`}
🔐 License: ${config.LICENSE_PUBLIC_KEY ? 'Configured' : 'Not configured'}

Environment: ${config.NODE_ENV}
    `);
    
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

start();