import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyLicense, parseLicenseFile, checkLicenseStatus } from '@field-tracker/licence';
import { eq } from 'drizzle-orm';
import { workers, licences } from '@field-tracker/db-schema';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Database } from '../config/database.js';
import type { EnvConfig } from '../config/env.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    type: 'admin' | 'worker';
    id?: number;
    workerId?: number;
    deviceId?: string;
  };
}

export function createAuthMiddleware(db: Database, config: EnvConfig) {
  
  // Admin password authentication
  async function authenticateAdmin(request: AuthenticatedRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      reply.code(401).send({ error: 'Admin authentication required' });
      return;
    }
    
    const base64Credentials = authHeader.slice('Basic '.length);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    if (username !== 'admin' || password !== config.ADMIN_PASSWORD) {
      reply.code(401).send({ error: 'Invalid admin credentials' });
      return;
    }
    
    request.user = { type: 'admin' };
  }
  
  // Worker PIN authentication with license validation
  async function authenticateWorker(request: AuthenticatedRequest, reply: FastifyReply) {
    const { employeeId, pin, deviceId } = request.body as { employeeId?: string; pin?: string; deviceId?: string };
    
    if (!employeeId || !pin || !deviceId) {
      reply.code(400).send({ error: 'Employee ID, PIN, and device ID are required' });
      return;
    }
    
    // Verify license first
    const licenseStatus = await validateCurrentLicense();
    if (!licenseStatus.isValid) {
      reply.code(403).send({ 
        error: 'Invalid or expired license',
        details: licenseStatus.errors 
      });
      return;
    }
    
    // Find worker
    const [worker] = await db
      .select()
      .from(workers)
      .where(eq(workers.employeeId, employeeId))
      .limit(1);
    
    if (!worker || !worker.isActive) {
      reply.code(401).send({ error: 'Invalid employee ID' });
      return;
    }
    
    // Check PIN
    const pinMatches = await bcrypt.compare(pin, worker.pin);
    if (!pinMatches) {
      reply.code(401).send({ error: 'Invalid PIN' });
      return;
    }
    
    // Check seat limit
    const activeWorkers = await db
      .select({ count: workers.id })
      .from(workers)
      .where(eq(workers.isActive, true));
    
    if (activeWorkers.length > licenseStatus.seatsMax) {
      reply.code(403).send({ error: 'License seat limit exceeded' });
      return;
    }
    
    request.user = { 
      type: 'worker', 
      workerId: worker.id,
      deviceId 
    };
  }
  
  // JWT token authentication (for session management)
  async function authenticateToken(request: AuthenticatedRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Authentication token required' });
      return;
    }
    
    const token = authHeader.slice('Bearer '.length);
    
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      request.user = decoded.user;
    } catch (error) {
      reply.code(401).send({ error: 'Invalid or expired token' });
      return;
    }
  }
  
  // Generate JWT token for authenticated sessions
  function generateToken(user: AuthenticatedRequest['user']): string {
    return jwt.sign(
      { user },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
  
  // Validate current license status
  async function validateCurrentLicense() {
    try {
      const [currentLicense] = await db
        .select()
        .from(licences)
        .where(eq(licences.isActive, true))
        .orderBy(licences.uploadedAt)
        .limit(1);
      
      if (!currentLicense) {
        return {
          isValid: false,
          seatsUsed: 0,
          seatsMax: 0,
          daysUntilExpiry: null,
          warnings: [],
          errors: ['No license installed']
        };
      }
      
      // Parse and verify license
      const signedLicense = {
        data: {
          licenceId: currentLicense.licenceId,
          seatsMax: currentLicense.seatsMax,
          expiryUpdates: currentLicense.expiryUpdates || undefined,
          issuedAt: currentLicense.uploadedAt,
          issuer: 'Field Tracker'
        },
        signature: currentLicense.signature
      };
      
      const isSignatureValid = verifyLicense(signedLicense, config.LICENSE_PUBLIC_KEY);
      if (!isSignatureValid) {
        return {
          isValid: false,
          seatsUsed: 0,
          seatsMax: 0,
          daysUntilExpiry: null,
          warnings: [],
          errors: ['Invalid license signature']
        };
      }
      
      // Count active workers
      const activeWorkerCount = await db
        .select({ count: workers.id })
        .from(workers)
        .where(eq(workers.isActive, true));
      
      return checkLicenseStatus(signedLicense, config.LICENSE_PUBLIC_KEY, activeWorkerCount.length);
      
    } catch (error) {
      return {
        isValid: false,
        seatsUsed: 0,
        seatsMax: 0,
        daysUntilExpiry: null,
        warnings: [],
        errors: [`License validation failed: ${error}`]
      };
    }
  }
  
  // License validation endpoint
  async function validateLicenseEndpoint(request: FastifyRequest, reply: FastifyReply) {
    const status = await validateCurrentLicense();
    reply.send({ success: true, data: status });
  }
  
  // Upload and install new license
  async function uploadLicense(licenseBuffer: Buffer) {
    try {
      // Parse the license file
      const signedLicense = parseLicenseFile(licenseBuffer);
      
      // Verify the license signature
      const isValid = verifyLicense(signedLicense, config.LICENSE_PUBLIC_KEY);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid license signature'
        };
      }

      // Deactivate current license
      await db
        .update(licences)
        .set({ isActive: false })
        .where(eq(licences.isActive, true));

      // Insert new license
      const [newLicense] = await db
        .insert(licences)
        .values({
          licenceId: signedLicense.data.licenceId,
          seatsMax: signedLicense.data.seatsMax,
          expiryUpdates: signedLicense.data.expiryUpdates || null,
          signature: signedLicense.signature,
          isActive: true,
          uploadedAt: new Date(),
          uploadedBy: 'admin', // In a full implementation, you'd get this from the authenticated user
        })
        .returning();

      return {
        success: true,
        license: {
          licenceId: newLicense.licenceId,
          seatsMax: newLicense.seatsMax,
          expiryUpdates: newLicense.expiryUpdates,
          uploadedAt: newLicense.uploadedAt,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `License processing failed: ${error instanceof Error ? error.message : error}`
      };
    }
  }
  
  return {
    authenticateAdmin,
    authenticateWorker,
    authenticateToken,
    generateToken,
    validateCurrentLicense,
    validateLicenseEndpoint,
    uploadLicense,
  };
}