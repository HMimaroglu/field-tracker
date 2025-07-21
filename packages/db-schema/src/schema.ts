import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Core system tables
export const licences = pgTable('licences', {
  id: serial('id').primaryKey(),
  licenceId: varchar('licence_id', { length: 255 }).notNull().unique(),
  seatsMax: integer('seats_max').notNull(),
  expiryUpdates: timestamp('expiry_updates'),
  signature: text('signature').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  uploadedBy: varchar('uploaded_by', { length: 255 }),
});

export const workers = pgTable(
  'workers',
  {
    id: serial('id').primaryKey(),
    employeeId: varchar('employee_id', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    pin: varchar('pin', { length: 4 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    employeeIdIdx: uniqueIndex('workers_employee_id_idx').on(table.employeeId),
  })
);

export const breakTypes = pgTable('break_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  isPaid: boolean('is_paid').notNull(),
  defaultMinutes: integer('default_minutes').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const jobs = pgTable(
  'jobs',
  {
    id: serial('id').primaryKey(),
    jobCode: varchar('job_code', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    tags: jsonb('tags').$type<string[]>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    jobCodeIdx: uniqueIndex('jobs_job_code_idx').on(table.jobCode),
  })
);

// Time tracking tables
export const timeEntries = pgTable('time_entries', {
  id: serial('id').primaryKey(),
  offlineGuid: uuid('offline_guid').notNull().unique(),
  workerId: integer('worker_id')
    .notNull()
    .references(() => workers.id),
  jobId: integer('job_id')
    .notNull()
    .references(() => jobs.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  startLatitude: decimal('start_latitude', { precision: 10, scale: 7 }),
  startLongitude: decimal('start_longitude', { precision: 10, scale: 7 }),
  endLatitude: decimal('end_latitude', { precision: 10, scale: 7 }),
  endLongitude: decimal('end_longitude', { precision: 10, scale: 7 }),
  notes: text('notes'),
  regularHours: decimal('regular_hours', { precision: 8, scale: 2 }),
  overtimeHours: decimal('overtime_hours', { precision: 8, scale: 2 }),
  isSynced: boolean('is_synced').default(false).notNull(),
  hasConflict: boolean('has_conflict').default(false).notNull(),
  conflictReason: text('conflict_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const breakEntries = pgTable('break_entries', {
  id: serial('id').primaryKey(),
  offlineGuid: uuid('offline_guid').notNull().unique(),
  timeEntryId: integer('time_entry_id')
    .notNull()
    .references(() => timeEntries.id, { onDelete: 'cascade' }),
  breakTypeId: integer('break_type_id')
    .notNull()
    .references(() => breakTypes.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  durationMinutes: integer('duration_minutes'),
  notes: text('notes'),
  isSynced: boolean('is_synced').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const photos = pgTable('photos', {
  id: serial('id').primaryKey(),
  offlineGuid: uuid('offline_guid').notNull().unique(),
  timeEntryId: integer('time_entry_id')
    .notNull()
    .references(() => timeEntries.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  width: integer('width'),
  height: integer('height'),
  takenAt: timestamp('taken_at').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  isSynced: boolean('is_synced').default(false).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sync and audit tables
export const syncLogs = pgTable('sync_logs', {
  id: serial('id').primaryKey(),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  syncType: varchar('sync_type', { length: 50 }).notNull(), // 'push', 'pull', 'full'
  recordsProcessed: integer('records_processed').default(0),
  recordsSucceeded: integer('records_succeeded').default(0),
  recordsFailed: integer('records_failed').default(0),
  errorDetails: jsonb('error_details'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  status: varchar('status', { length: 20 }).notNull(), // 'running', 'completed', 'failed'
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id').notNull(),
  action: varchar('action', { length: 20 }).notNull(), // 'create', 'update', 'delete'
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  userId: integer('user_id'), // nullable for system actions
  deviceId: varchar('device_id', { length: 255 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Admin configuration
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value'),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 255 }),
});

// Relations
export const workersRelations = relations(workers, ({ many }) => ({
  timeEntries: many(timeEntries),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  timeEntries: many(timeEntries),
}));

export const breakTypesRelations = relations(breakTypes, ({ many }) => ({
  breakEntries: many(breakEntries),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one, many }) => ({
  worker: one(workers, {
    fields: [timeEntries.workerId],
    references: [workers.id],
  }),
  job: one(jobs, {
    fields: [timeEntries.jobId],
    references: [jobs.id],
  }),
  breakEntries: many(breakEntries),
  photos: many(photos),
}));

export const breakEntriesRelations = relations(breakEntries, ({ one }) => ({
  timeEntry: one(timeEntries, {
    fields: [breakEntries.timeEntryId],
    references: [timeEntries.id],
  }),
  breakType: one(breakTypes, {
    fields: [breakEntries.breakTypeId],
    references: [breakTypes.id],
  }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  timeEntry: one(timeEntries, {
    fields: [photos.timeEntryId],
    references: [timeEntries.id],
  }),
}));