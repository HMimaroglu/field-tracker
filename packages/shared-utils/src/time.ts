import { format, parseISO, differenceInMinutes, differenceInHours, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, format as formatTz } from 'date-fns-tz';

/**
 * Time utility functions for field tracker app
 * Handles UTC internally, displays local time in UI
 */

export const TIME_FORMATS = {
  DATE: 'yyyy-MM-dd',
  TIME: 'HH:mm:ss',
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
  DISPLAY_DATE: 'MMM dd, yyyy',
  DISPLAY_TIME: 'h:mm a',
  DISPLAY_DATETIME: 'MMM dd, yyyy h:mm a',
} as const;

/**
 * Convert local time to UTC for storage
 */
export function toUtc(localDate: Date, timeZone: string): Date {
  return zonedTimeToUtc(localDate, timeZone);
}

/**
 * Convert UTC time to local time for display
 */
export function fromUtc(utcDate: Date, timeZone: string): Date {
  return utcToZonedTime(utcDate, timeZone);
}

/**
 * Format UTC date for display in local timezone
 */
export function formatInTimeZone(
  utcDate: Date,
  timeZone: string,
  formatString: string = TIME_FORMATS.DISPLAY_DATETIME
): string {
  return formatTz(utcDate, formatString, { timeZone });
}

/**
 * Calculate duration between two dates in minutes
 */
export function getDurationMinutes(startDate: Date, endDate: Date): number {
  return differenceInMinutes(endDate, startDate);
}

/**
 * Calculate duration between two dates in hours (decimal)
 */
export function getDurationHours(startDate: Date, endDate: Date): number {
  const minutes = getDurationMinutes(startDate, endDate);
  return Math.round((minutes / 60) * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate regular and overtime hours based on daily threshold
 */
export function calculateHours(
  startDate: Date,
  endDate: Date,
  overtimeThreshold: number = 8
): { regularHours: number; overtimeHours: number } {
  const totalHours = getDurationHours(startDate, endDate);
  
  if (totalHours <= overtimeThreshold) {
    return { regularHours: totalHours, overtimeHours: 0 };
  } else {
    return {
      regularHours: overtimeThreshold,
      overtimeHours: totalHours - overtimeThreshold,
    };
  }
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

/**
 * Get payroll period boundaries
 */
export function getPayrollPeriod(
  date: Date,
  periodType: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly'
): { start: Date; end: Date } {
  const baseDate = startOfDay(date);
  
  switch (periodType) {
    case 'weekly':
      return {
        start: startOfWeek(baseDate, { weekStartsOn: 0 }), // Sunday
        end: endOfWeek(baseDate, { weekStartsOn: 0 }),
      };
    
    case 'bi-weekly':
      // Simplified: every other week from a reference point
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      return {
        start: weekStart,
        end: new Date(weekStart.getTime() + 13 * 24 * 60 * 60 * 1000), // 14 days - 1ms
      };
    
    case 'semi-monthly':
      // 1st-15th and 16th-end of month
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const day = baseDate.getDate();
      
      if (day <= 15) {
        return {
          start: new Date(year, month, 1),
          end: new Date(year, month, 15),
        };
      } else {
        return {
          start: new Date(year, month, 16),
          end: endOfDay(new Date(year, month + 1, 0)), // Last day of month
        };
      }
    
    case 'monthly':
      const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const monthEnd = endOfDay(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0));
      return {
        start: monthStart,
        end: monthEnd,
      };
    
    default:
      throw new Error(`Unsupported payroll period type: ${periodType}`);
  }
}

/**
 * Check if two time periods overlap
 */
export function timePeriodsOverlap(
  start1: Date,
  end1: Date | null,
  start2: Date,
  end2: Date | null
): boolean {
  // If either period is still ongoing (no end time), consider current time
  const now = new Date();
  const actualEnd1 = end1 || now;
  const actualEnd2 = end2 || now;
  
  // Check for overlap: start1 < end2 && start2 < end1
  return start1 < actualEnd2 && start2 < actualEnd1;
}

/**
 * Validate time entry for business rules
 */
export function validateTimeEntry(
  workerId: number,
  startTime: Date,
  endTime: Date | null,
  existingEntries: Array<{ workerId: number; startTime: Date; endTime: Date | null }>
): { isValid: boolean; conflicts: string[] } {
  const conflicts: string[] = [];
  
  // Check for overlapping entries for the same worker
  const workerEntries = existingEntries.filter(entry => entry.workerId === workerId);
  
  for (const entry of workerEntries) {
    if (timePeriodsOverlap(startTime, endTime, entry.startTime, entry.endTime)) {
      conflicts.push(`Overlaps with existing time entry from ${formatInTimeZone(entry.startTime, 'UTC')} to ${entry.endTime ? formatInTimeZone(entry.endTime, 'UTC') : 'ongoing'}`);
    }
  }
  
  // Check if end time is before start time
  if (endTime && endTime <= startTime) {
    conflicts.push('End time must be after start time');
  }
  
  // Check if entry is longer than 24 hours
  if (endTime && getDurationHours(startTime, endTime) > 24) {
    conflicts.push('Time entry cannot exceed 24 hours');
  }
  
  // Check if entry is in the future (more than 5 minutes)
  const now = new Date();
  if (startTime > new Date(now.getTime() + 5 * 60 * 1000)) {
    conflicts.push('Time entry cannot start in the future');
  }
  
  return {
    isValid: conflicts.length === 0,
    conflicts,
  };
}