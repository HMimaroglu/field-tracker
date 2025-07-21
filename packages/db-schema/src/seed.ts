import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { workers, jobs, breakTypes, systemSettings } from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/fieldtracker';

const runSeed = async () => {
  const connection = postgres(connectionString);
  const db = drizzle(connection);

  console.log('Seeding database...');

  // Insert default break types
  await db.insert(breakTypes).values([
    {
      name: 'Paid Break',
      isPaid: true,
      defaultMinutes: 15,
      isActive: true,
    },
    {
      name: 'Unpaid Lunch',
      isPaid: false,
      defaultMinutes: 30,
      isActive: true,
    },
  ]);

  // Insert default system settings
  await db.insert(systemSettings).values([
    {
      key: 'overtime_threshold_hours',
      value: 8,
      description: 'Hours per day before overtime kicks in',
      updatedBy: 'system',
    },
    {
      key: 'default_payroll_period',
      value: 'weekly',
      description: 'Default payroll period for reports',
      updatedBy: 'system',
    },
    {
      key: 'photo_max_size_kb',
      value: 200,
      description: 'Maximum photo file size in KB',
      updatedBy: 'system',
    },
    {
      key: 'photo_max_resolution',
      value: '1280x960',
      description: 'Maximum photo resolution (width x height)',
      updatedBy: 'system',
    },
    {
      key: 'gps_precision_meters',
      value: 200,
      description: 'GPS precision requirement in meters',
      updatedBy: 'system',
    },
    {
      key: 'sync_triggers',
      value: ['app_launch', 'manual', 'network_reconnect'],
      description: 'Events that trigger automatic sync',
      updatedBy: 'system',
    },
  ]);

  // Insert sample workers (for development)
  await db.insert(workers).values([
    {
      employeeId: 'EMP001',
      name: 'John Smith',
      pin: '1234',
      isActive: true,
    },
    {
      employeeId: 'EMP002',
      name: 'Sarah Johnson',
      pin: '5678',
      isActive: true,
    },
    {
      employeeId: 'EMP003',
      name: 'Mike Wilson',
      pin: '9012',
      isActive: true,
    },
  ]);

  // Insert sample jobs (for development)
  await db.insert(jobs).values([
    {
      jobCode: 'LAWN001',
      name: 'Smith Residence - Lawn Care',
      description: 'Weekly lawn maintenance including mowing, edging, and cleanup',
      tags: ['residential', 'lawn-care', 'weekly'],
      isActive: true,
    },
    {
      jobCode: 'LAND002',
      name: 'Downtown Plaza - Landscaping',
      description: 'Monthly landscaping maintenance for commercial plaza',
      tags: ['commercial', 'landscaping', 'monthly'],
      isActive: true,
    },
    {
      jobCode: 'TRIM003',
      name: 'Oak Street - Tree Trimming',
      description: 'Seasonal tree trimming and removal project',
      tags: ['tree-service', 'seasonal'],
      isActive: true,
    },
  ]);

  console.log('Database seeded successfully!');
  await connection.end();
};

runSeed().catch(console.error);