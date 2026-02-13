/**
 * TypeScript types for Weekly Check-Ins System
 */

/**
 * Org roster mapping (from Roster sheet)
 */
export interface RosterEntry {
  employee_name: string;
  employee_slack_id: string;
  manager_name: string;
  manager_slack_id: string;
  team?: string;
  employee_email?: string;
}

/**
 * Worker submission from Google Forms
 */
export interface WorkerSubmission {
  timestamp: Date;
  employee_name: string;
  week_id: string; // ISO week format, e.g., "2026-W06"
  // Form fields - structure depends on actual Google Form
  submission_data: Record<string, any>;
}

/**
 * Manager review from Google Forms
 */
export interface ManagerReview {
  timestamp: Date;
  manager_name: string;
  employee_name: string; // Employee being reviewed
  week_id: string;
  directive?: string; // This week's directive for the worker
  blocker_resolution?: string; // Resolution plan for blockers
  // Full form data
  review_data: Record<string, any>;
}

/**
 * Submission status tracking
 */
export type SubmissionStatus = 'on_time' | 'late' | 'missed' | 'not_yet_due';

/**
 * Weekly tracking record (stored in database)
 */
export interface WeeklyTrackingRecord {
  id?: string;
  week_id: string; // e.g., "2026-W06"
  employee_name: string;
  employee_slack_id: string;
  manager_slack_id: string;
  team?: string;
  
  // Worker submission tracking
  worker_submitted: boolean;
  worker_submission_timestamp?: Date;
  worker_status: SubmissionStatus;
  worker_reminder_count: number;
  
  // Manager review tracking
  manager_review_submitted: boolean;
  manager_review_timestamp?: Date;
  manager_status: SubmissionStatus;
  manager_reminder_count: number;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Compliance report data
 */
export interface ComplianceReport {
  week_id: string;
  generated_at: Date;
  
  // Worker stats
  workers_total: number;
  workers_completed_on_time: number;
  workers_late: number;
  workers_missed: number;
  
  // Manager stats
  managers_total: number;
  managers_completed_on_time: number;
  managers_late: number;
  managers_missed: number;
  
  // Repeat defaulters (2+ consecutive misses)
  repeat_defaulters: Array<{
    name: string;
    slack_id: string;
    missed_count: number;
    type: 'worker' | 'manager';
  }>;
}

/**
 * Slack message variant (for rotating messages)
 */
export interface MessageVariant {
  id: string;
  text: string;
  blocks?: any[];
}

/**
 * Reminder schedule configuration
 */
export interface ReminderSchedule {
  // Worker reminders
  worker_primary: string; // Cron: Friday EOD
  worker_first_nudge: string; // Cron: Saturday morning
  worker_final_nudge: string; // Cron: Sunday EOD
  
  // Manager reminders
  manager_primary: string; // Cron: Monday morning
  manager_first_nudge: string; // Cron: Tuesday morning
  manager_final_nudge: string; // Cron: Tuesday midday
  
  // Leadership report
  leadership_report: string; // Cron: Tuesday 4 PM Bali time
}

/**
 * Google Sheets configuration
 */
export interface SheetsConfig {
  spreadsheet_id: string;
  roster_tab: string;
  worker_responses_tab: string;
  manager_responses_tab: string;
}
