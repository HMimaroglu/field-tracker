import { z } from 'zod';

// Validation schemas using Zod
export const workerSchema = z.object({
  employeeId: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be 4 digits'),
  isActive: z.boolean().default(true),
});

export const jobSchema = z.object({
  jobCode: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const breakTypeSchema = z.object({
  name: z.string().min(1).max(100),
  isPaid: z.boolean(),
  defaultMinutes: z.number().int().positive(),
  isActive: z.boolean().default(true),
});

export const timeEntrySchema = z.object({
  offlineGuid: z.string().uuid(),
  workerId: z.number().int().positive(),
  jobId: z.number().int().positive(),
  startTime: z.date(),
  endTime: z.date().optional(),
  startLatitude: z.number().min(-90).max(90).optional(),
  startLongitude: z.number().min(-180).max(180).optional(),
  endLatitude: z.number().min(-90).max(90).optional(),
  endLongitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).optional(),
});

export const breakEntrySchema = z.object({
  offlineGuid: z.string().uuid(),
  timeEntryId: z.number().int().positive(),
  breakTypeId: z.number().int().positive(),
  startTime: z.date(),
  endTime: z.date().optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const photoSchema = z.object({
  offlineGuid: z.string().uuid(),
  timeEntryId: z.number().int().positive(),
  filename: z.string().min(1).max(255),
  originalName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  takenAt: z.date(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const licenceSchema = z.object({
  licenceId: z.string().min(1).max(255),
  seatsMax: z.number().int().positive(),
  expiryUpdates: z.date().optional(),
  signature: z.string().min(1),
});

// Sync protocol types
export const syncPushDataSchema = z.object({
  timeEntries: z.array(timeEntrySchema).optional(),
  breakEntries: z.array(breakEntrySchema).optional(),
  photos: z.array(photoSchema).optional(),
  deviceId: z.string().min(1).max(255),
  lastSyncAt: z.date().optional(),
});

export const syncPullDataSchema = z.object({
  workers: z.array(workerSchema.omit({ pin: true })).optional(),
  jobs: z.array(jobSchema).optional(),
  breakTypes: z.array(breakTypeSchema).optional(),
  systemSettings: z.record(z.string(), z.any()).optional(),
  lastServerUpdate: z.date(),
});

// CSV Export schema
export const csvExportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  workerIds: z.array(z.number().int().positive()).optional(),
  jobIds: z.array(z.number().int().positive()).optional(),
  includeBreaks: z.boolean().default(true),
  includePhotos: z.boolean().default(false),
  payrollPeriod: z.enum(['weekly', 'bi-weekly', 'semi-monthly', 'monthly']).default('weekly'),
});

// Type exports
export type Worker = z.infer<typeof workerSchema>;
export type Job = z.infer<typeof jobSchema>;
export type BreakType = z.infer<typeof breakTypeSchema>;
export type TimeEntry = z.infer<typeof timeEntrySchema>;
export type BreakEntry = z.infer<typeof breakEntrySchema>;
export type Photo = z.infer<typeof photoSchema>;
export type Licence = z.infer<typeof licenceSchema>;
export type SyncPushData = z.infer<typeof syncPushDataSchema>;
export type SyncPullData = z.infer<typeof syncPullDataSchema>;
export type CsvExportRequest = z.infer<typeof csvExportSchema>;

// API Response types
export type ApiResponse<T = any> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};