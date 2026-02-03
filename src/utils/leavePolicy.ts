/**
 * Leave policy validation and business logic
 */

import { PolicyValidationResult } from '../types/leave';

/**
 * Minimum days in advance for leave requests (company policy)
 */
const MINIMUM_ADVANCE_DAYS = 3;

/**
 * Maximum leave days per request
 */
const MAX_LEAVE_DAYS = 30;

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
  return Math.round(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
}

/**
 * Check if date is a weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Validate 3-day advance notice policy
 */
export function validateAdvanceNotice(startDate: Date): PolicyValidationResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const daysUntilStart = daysBetween(today, start);
  
  // If start date is in the past
  if (start < today) {
    return {
      valid: false,
      error_message: 'Leave start date cannot be in the past.',
      days_until_start: daysUntilStart,
    };
  }
  
  // If start date is today
  if (daysUntilStart === 0) {
    return {
      valid: false,
      error_message: 'Policy Alert: Leave requests must be made at least 3 business days in advance. For same-day leave, please contact your manager (Axel or Nadia) directly for emergency approval.',
      days_until_start: 0,
    };
  }
  
  // If less than 3 days
  if (daysUntilStart < MINIMUM_ADVANCE_DAYS) {
    return {
      valid: false,
      error_message: `Policy Alert: Leave requests must be made at least ${MINIMUM_ADVANCE_DAYS} business days in advance (you requested ${daysUntilStart} days). Please contact your manager (Axel or Nadia) for emergency exceptions.`,
      days_until_start: daysUntilStart,
    };
  }
  
  return {
    valid: true,
    days_until_start: daysUntilStart,
  };
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date, endDate: Date): PolicyValidationResult {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if end date is before start date
  if (end < start) {
    return {
      valid: false,
      error_message: 'End date cannot be before start date.',
    };
  }
  
  // Check if dates are the same (single day leave is allowed)
  const totalDays = daysBetween(start, end) + 1; // +1 to include both days
  
  // Check maximum leave duration
  if (totalDays > MAX_LEAVE_DAYS) {
    return {
      valid: false,
      error_message: `Leave duration cannot exceed ${MAX_LEAVE_DAYS} days. Please split your request or contact HR.`,
    };
  }
  
  return {
    valid: true,
  };
}

/**
 * Validate complete leave request
 */
export function validateLeaveRequest(
  startDateStr: string,
  endDateStr: string
): PolicyValidationResult {
  // Parse dates
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  // Check if dates are valid
  if (isNaN(startDate.getTime())) {
    return {
      valid: false,
      error_message: 'Invalid start date format. Please use YYYY-MM-DD.',
    };
  }
  
  if (isNaN(endDate.getTime())) {
    return {
      valid: false,
      error_message: 'Invalid end date format. Please use YYYY-MM-DD.',
    };
  }
  
  // Validate date range first
  const rangeValidation = validateDateRange(startDate, endDate);
  if (!rangeValidation.valid) {
    return rangeValidation;
  }
  
  // Then validate advance notice
  const advanceNoticeValidation = validateAdvanceNotice(startDate);
  if (!advanceNoticeValidation.valid) {
    return advanceNoticeValidation;
  }
  
  return {
    valid: true,
    days_until_start: advanceNoticeValidation.days_until_start,
  };
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  const start = startDate.toLocaleDateString('en-US', options);
  const end = endDate.toLocaleDateString('en-US', options);
  
  if (startDate.toDateString() === endDate.toDateString()) {
    return start;
  }
  
  return `${start} - ${end}`;
}

/**
 * Calculate business days (excluding weekends)
 * This is a simple version - you may want to add holiday support
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (!isWeekend(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return count;
}
