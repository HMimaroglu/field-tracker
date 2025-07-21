import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  
  // CORS
  CORS_ORIGINS: z.string().transform(val => val.split(',')),
  
  // Admin Auth
  ADMIN_PASSWORD: z.string().min(6),
  
  // License
  LICENSE_PUBLIC_KEY: z.string().min(1),
  
  // File Storage
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('200KB'),
  
  // S3 (optional)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  
  // Sync
  SYNC_BATCH_SIZE: z.coerce.number().default(100),
  MAX_SYNC_CONFLICTS: z.coerce.number().default(50),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment configuration:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}