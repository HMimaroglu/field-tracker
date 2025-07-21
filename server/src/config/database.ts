import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@field-tracker/db-schema';
import type { EnvConfig } from './env.js';

export function createDatabase(config: EnvConfig) {
  const connection = postgres(config.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  return drizzle(connection, { schema });
}

export type Database = ReturnType<typeof createDatabase>;