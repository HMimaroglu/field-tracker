import { z } from 'zod';

/**
 * Common validation utilities for field tracker app
 */

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PIN: 'PIN must be exactly 4 digits',
  INVALID_EMPLOYEE_ID: 'Employee ID must be between 1 and 50 characters',
  INVALID_JOB_CODE: 'Job code must be between 1 and 50 characters',
  INVALID_COORDINATES: 'Invalid GPS coordinates',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed',
  INVALID_IMAGE: 'Invalid image file',
  FUTURE_DATE: 'Date cannot be in the future',
  END_BEFORE_START: 'End time must be after start time',
  DUPLICATE_EMPLOYEE_ID: 'Employee ID already exists',
  DUPLICATE_JOB_CODE: 'Job code already exists',
} as const;

/**
 * Employee ID validation
 */
export const employeeIdSchema = z
  .string()
  .min(1, VALIDATION_MESSAGES.REQUIRED)
  .max(50, VALIDATION_MESSAGES.INVALID_EMPLOYEE_ID)
  .regex(/^[A-Z0-9\-_]+$/i, 'Employee ID can only contain letters, numbers, hyphens, and underscores');

/**
 * PIN validation (4 digits)
 */
export const pinSchema = z
  .string()
  .length(4, VALIDATION_MESSAGES.INVALID_PIN)
  .regex(/^\d{4}$/, VALIDATION_MESSAGES.INVALID_PIN);

/**
 * Job code validation
 */
export const jobCodeSchema = z
  .string()
  .min(1, VALIDATION_MESSAGES.REQUIRED)
  .max(50, VALIDATION_MESSAGES.INVALID_JOB_CODE)
  .regex(/^[A-Z0-9\-_]+$/i, 'Job code can only contain letters, numbers, hyphens, and underscores');

/**
 * GPS coordinate validation
 */
export const latitudeSchema = z
  .number()
  .min(-90, VALIDATION_MESSAGES.INVALID_COORDINATES)
  .max(90, VALIDATION_MESSAGES.INVALID_COORDINATES);

export const longitudeSchema = z
  .number()
  .min(-180, VALIDATION_MESSAGES.INVALID_COORDINATES)
  .max(180, VALIDATION_MESSAGES.INVALID_COORDINATES);

/**
 * File validation schemas
 */
export const imageFileSchema = z.object({
  name: z.string().min(1, 'Filename is required'),
  size: z.number().max(200 * 1024, VALIDATION_MESSAGES.FILE_TOO_LARGE), // 200KB max
  type: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/, VALIDATION_MESSAGES.INVALID_IMAGE),
});

/**
 * Date range validation
 */
export function createDateRangeSchema(allowFuture: boolean = false) {
  const baseSchema = z.date();
  
  return z.object({
    startDate: allowFuture ? baseSchema : baseSchema.max(new Date(), VALIDATION_MESSAGES.FUTURE_DATE),
    endDate: allowFuture ? baseSchema : baseSchema.max(new Date(), VALIDATION_MESSAGES.FUTURE_DATE),
  }).refine((data) => data.endDate >= data.startDate, {
    message: VALIDATION_MESSAGES.END_BEFORE_START,
    path: ['endDate'],
  });
}

/**
 * Time entry validation
 */
export const timeEntryValidationSchema = z.object({
  workerId: z.number().int().positive('Worker ID must be a positive integer'),
  jobId: z.number().int().positive('Job ID must be a positive integer'),
  startTime: z.date().max(new Date(), VALIDATION_MESSAGES.FUTURE_DATE),
  endTime: z.date().optional(),
  startLatitude: latitudeSchema.optional(),
  startLongitude: longitudeSchema.optional(),
  endLatitude: latitudeSchema.optional(),
  endLongitude: longitudeSchema.optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
}).refine((data) => {
  if (data.endTime && data.endTime <= data.startTime) {
    return false;
  }
  return true;
}, {
  message: VALIDATION_MESSAGES.END_BEFORE_START,
  path: ['endTime'],
}).refine((data) => {
  // If start coordinates are provided, both lat and lng must be present
  if ((data.startLatitude && !data.startLongitude) || (!data.startLatitude && data.startLongitude)) {
    return false;
  }
  return true;
}, {
  message: 'Both latitude and longitude must be provided',
  path: ['startLongitude'],
}).refine((data) => {
  // If end coordinates are provided, both lat and lng must be present
  if ((data.endLatitude && !data.endLongitude) || (!data.endLatitude && data.endLongitude)) {
    return false;
  }
  return true;
}, {
  message: 'Both latitude and longitude must be provided',
  path: ['endLongitude'],
});

/**
 * Break entry validation
 */
export const breakEntryValidationSchema = z.object({
  timeEntryId: z.number().int().positive('Time entry ID must be a positive integer'),
  breakTypeId: z.number().int().positive('Break type ID must be a positive integer'),
  startTime: z.date().max(new Date(), VALIDATION_MESSAGES.FUTURE_DATE),
  endTime: z.date().optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
}).refine((data) => {
  if (data.endTime && data.endTime <= data.startTime) {
    return false;
  }
  return true;
}, {
  message: VALIDATION_MESSAGES.END_BEFORE_START,
  path: ['endTime'],
});

/**
 * Photo validation
 */
export const photoValidationSchema = z.object({
  timeEntryId: z.number().int().positive('Time entry ID must be a positive integer'),
  originalName: z.string().min(1, 'Original filename is required'),
  fileSize: z.number().max(200 * 1024, VALIDATION_MESSAGES.FILE_TOO_LARGE),
  mimeType: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/, VALIDATION_MESSAGES.INVALID_IMAGE),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  takenAt: z.date().max(new Date(), VALIDATION_MESSAGES.FUTURE_DATE),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
}).refine((data) => {
  // If coordinates are provided, both lat and lng must be present
  if ((data.latitude && !data.longitude) || (!data.latitude && data.longitude)) {
    return false;
  }
  return true;
}, {
  message: 'Both latitude and longitude must be provided',
  path: ['longitude'],
});

/**
 * CSV export validation
 */
export const csvExportValidationSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  workerIds: z.array(z.number().int().positive()).optional(),
  jobIds: z.array(z.number().int().positive()).optional(),
  includeBreaks: z.boolean().default(true),
  includePhotos: z.boolean().default(false),
  payrollPeriod: z.enum(['weekly', 'bi-weekly', 'semi-monthly', 'monthly']).default('weekly'),
}).refine((data) => data.endDate >= data.startDate, {
  message: VALIDATION_MESSAGES.END_BEFORE_START,
  path: ['endDate'],
});

/**
 * License validation
 */
export const licenseValidationSchema = z.object({
  licenceId: z.string().min(1, 'License ID is required').max(255),
  seatsMax: z.number().int().positive('Seats must be a positive integer'),
  expiryUpdates: z.date().optional(),
  signature: z.string().min(1, 'Signature is required'),
});

/**
 * Sanitize and validate user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, maxSizeKB: number = 200): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check file size
  if (file.size > maxSizeKB * 1024) {
    errors.push(`File size must be less than ${maxSizeKB}KB`);
  }
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    errors.push('Only image files are allowed');
  }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, and WebP images are allowed');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Batch validation helper
 */
export function validateBatch<T>(
  items: T[],
  schema: z.ZodSchema<T>
): { valid: T[]; invalid: Array<{ item: T; errors: z.ZodError }> } {
  const valid: T[] = [];
  const invalid: Array<{ item: T; errors: z.ZodError }> = [];
  
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({ item, errors: result.error });
    }
  }
  
  return { valid, invalid };
}