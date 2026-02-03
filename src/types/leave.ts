/**
 * TypeScript interfaces for leave management system
 */

export type LeaveType = 'vacation' | 'sick' | 'personal' | 'emergency';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AuditAction = 'submit' | 'approve' | 'reject' | 'cancel' | 'view' | 'reminder';

/**
 * User role in the system
 */
export interface UserRole {
  id: number;
  slack_user_id: string;
  email?: string;
  full_name?: string;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Leave request record
 */
export interface LeaveRequest {
  id: number;
  request_id: string;
  slack_user_id: string;
  requester_name: string;
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  total_days: number;
  reason?: string;
  status: LeaveStatus;
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  submitted_at: Date;
  updated_at: Date;
  slack_message_ts?: string;
  slack_channel_id?: string;
}

/**
 * Reminder schedule record
 */
export interface ReminderSchedule {
  id: number;
  request_id: string;
  next_reminder_at: Date;
  reminder_count: number;
  last_reminded_at?: Date;
  is_active: boolean;
  created_at: Date;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: number;
  request_id?: string;
  slack_user_id: string;
  action: AuditAction;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: Date;
}

/**
 * Leave request submission data
 */
export interface LeaveRequestSubmission {
  slack_user_id: string;
  requester_name: string;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
  reason?: string;
}

/**
 * Leave request approval/rejection data
 */
export interface LeaveRequestDecision {
  request_id: string;
  approved_by: string;
  decision: 'approved' | 'rejected';
  rejection_reason?: string;
}

/**
 * Pending request summary (for manager view)
 */
export interface PendingRequestSummary {
  request_id: string;
  slack_user_id: string;
  requester_name: string;
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  total_days: number;
  reason?: string;
  submitted_at: Date;
  reminder_count: number;
  last_reminded_at?: Date;
  hours_pending: number;
}

/**
 * Out of office summary (for daily reports)
 */
export interface OOOSummary {
  request_id: string;
  slack_user_id: string;
  requester_name: string;
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  total_days: number;
}

/**
 * Policy validation result
 */
export interface PolicyValidationResult {
  valid: boolean;
  error_message?: string;
  days_until_start?: number;
}
