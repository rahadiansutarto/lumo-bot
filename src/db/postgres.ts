/**
 * PostgreSQL database client for leave management
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../logger';
import {
  LeaveRequest,
  LeaveRequestSubmission,
  LeaveRequestDecision,
  UserRole,
  ReminderSchedule,
  AuditLogEntry,
  PendingRequestSummary,
  OOOSummary,
  AuditAction,
} from '../types/leave';

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initDatabase(): Pool {
  if (pool) return pool;

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'leave_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(dbConfig);

  pool.on('error', (err: Error) => {
    logger.error('Unexpected database error', err);
  });

  logger.info('Database pool initialized', {
    host: dbConfig.host,
    database: dbConfig.database,
    maxConnections: dbConfig.max,
  });

  return pool;
}

/**
 * Get database pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Close database pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

/**
 * Generate unique request ID
 */
async function generateRequestId(): Promise<string> {
  // Format: LR-YYYYMMDD-XXX
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `LR-${year}${month}${day}`;
  
  // Get the highest counter for today
  const query = `
    SELECT request_id FROM leave_requests 
    WHERE request_id LIKE $1 
    ORDER BY request_id DESC 
    LIMIT 1
  `;
  
  const result = await getPool().query(query, [`${datePrefix}-%`]);
  
  let counter = 1;
  if (result.rows.length > 0) {
    // Extract counter from last request ID (e.g., "LR-20260123-005" -> 5)
    const lastId = result.rows[0].request_id;
    const lastCounter = parseInt(lastId.split('-')[2], 10);
    counter = lastCounter + 1;
  }
  
  // Format counter as 3-digit number (001, 002, etc.)
  const counterStr = String(counter).padStart(3, '0');
  
  return `${datePrefix}-${counterStr}`;
}

/**
 * Calculate business days between two dates
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return count;
}

/**
 * Check if user is an admin
 */
export async function isUserAdmin(slackUserId: string): Promise<boolean> {
  const query = 'SELECT is_admin FROM user_roles WHERE slack_user_id = $1';
  const result = await getPool().query(query, [slackUserId]);
  
  if (result.rows.length === 0) {
    return false;
  }
  
  return result.rows[0].is_admin;
}

/**
 * Get or create user role
 */
export async function getOrCreateUser(
  slackUserId: string,
  fullName?: string,
  email?: string
): Promise<UserRole> {
  const selectQuery = 'SELECT * FROM user_roles WHERE slack_user_id = $1';
  let result = await getPool().query(selectQuery, [slackUserId]);
  
  if (result.rows.length > 0) {
    return result.rows[0];
  }
  
  // Create new user
  const insertQuery = `
    INSERT INTO user_roles (slack_user_id, email, full_name, is_admin)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  result = await getPool().query(insertQuery, [slackUserId, email, fullName, false]);
  
  logger.info('New user created', { slackUserId, fullName });
  
  return result.rows[0];
}

/**
 * Submit a new leave request
 */
export async function submitLeaveRequest(
  submission: LeaveRequestSubmission,
  slackMessageTs?: string,
  slackChannelId?: string
): Promise<LeaveRequest> {
  const requestId = await generateRequestId();
  const startDate = new Date(submission.start_date);
  const endDate = new Date(submission.end_date);
  const totalDays = calculateBusinessDays(startDate, endDate);
  
  const query = `
    INSERT INTO leave_requests (
      request_id, slack_user_id, requester_name, leave_type,
      start_date, end_date, total_days, reason,
      slack_message_ts, slack_channel_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  
  const values = [
    requestId,
    submission.slack_user_id,
    submission.requester_name,
    submission.leave_type,
    startDate,
    endDate,
    totalDays,
    submission.reason,
    slackMessageTs,
    slackChannelId,
  ];
  
  const result = await getPool().query(query, values);
  const leaveRequest = result.rows[0];
  
  logger.info('Leave request submitted', {
    requestId,
    slackUserId: submission.slack_user_id,
    leaveType: submission.leave_type,
    totalDays,
  });
  
  return leaveRequest;
}

/**
 * Get leave request by ID
 */
export async function getLeaveRequest(requestId: string): Promise<LeaveRequest | null> {
  const query = 'SELECT * FROM leave_requests WHERE request_id = $1';
  const result = await getPool().query(query, [requestId]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update leave request status (approve/reject)
 */
export async function updateLeaveRequestStatus(
  decision: LeaveRequestDecision
): Promise<LeaveRequest> {
  const query = `
    UPDATE leave_requests
    SET status = $1, approved_by = $2, approved_at = $3, rejection_reason = $4
    WHERE request_id = $5
    RETURNING *
  `;
  
  const values = [
    decision.decision,
    decision.approved_by,
    decision.decision === 'approved' ? new Date() : null,
    decision.rejection_reason,
    decision.request_id,
  ];
  
  const result = await getPool().query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error(`Leave request not found: ${decision.request_id}`);
  }
  
  logger.info('Leave request updated', {
    requestId: decision.request_id,
    decision: decision.decision,
    approvedBy: decision.approved_by,
  });
  
  return result.rows[0];
}

/**
 * Schedule a reminder for a leave request
 */
export async function scheduleReminder(
  requestId: string,
  nextReminderAt: Date
): Promise<ReminderSchedule> {
  const query = `
    INSERT INTO reminder_schedule (request_id, next_reminder_at)
    VALUES ($1, $2)
    RETURNING *
  `;
  
  const result = await getPool().query(query, [requestId, nextReminderAt]);
  
  logger.debug('Reminder scheduled', { requestId, nextReminderAt });
  
  return result.rows[0];
}

/**
 * Update reminder after sending
 */
export async function updateReminder(
  requestId: string,
  nextReminderAt: Date
): Promise<void> {
  const query = `
    UPDATE reminder_schedule
    SET next_reminder_at = $1,
        reminder_count = reminder_count + 1,
        last_reminded_at = CURRENT_TIMESTAMP
    WHERE request_id = $2 AND is_active = TRUE
  `;
  
  await getPool().query(query, [nextReminderAt, requestId]);
  
  logger.debug('Reminder updated', { requestId, nextReminderAt });
}

/**
 * Deactivate reminder (when request is approved/rejected)
 */
export async function deactivateReminder(requestId: string): Promise<void> {
  const query = 'UPDATE reminder_schedule SET is_active = FALSE WHERE request_id = $1';
  await getPool().query(query, [requestId]);
  
  logger.debug('Reminder deactivated', { requestId });
}

/**
 * Get all pending reminders that need to be sent
 */
export async function getPendingReminders(): Promise<ReminderSchedule[]> {
  const query = `
    SELECT * FROM reminder_schedule
    WHERE is_active = TRUE
      AND next_reminder_at <= CURRENT_TIMESTAMP
  `;
  
  const result = await getPool().query(query);
  return result.rows;
}

/**
 * Get all pending leave requests
 */
export async function getPendingRequests(): Promise<PendingRequestSummary[]> {
  const query = 'SELECT * FROM pending_requests_summary';
  const result = await getPool().query(query);
  return result.rows;
}

/**
 * Get today's approved leaves (for OOO summary)
 */
export async function getTodayOOO(): Promise<OOOSummary[]> {
  const query = 'SELECT * FROM approved_leaves_today';
  const result = await getPool().query(query);
  return result.rows;
}

/**
 * Log audit event
 */
export async function logAudit(
  slackUserId: string,
  action: AuditAction,
  requestId?: string,
  details?: Record<string, any>
): Promise<void> {
  const query = `
    INSERT INTO audit_log (slack_user_id, action, request_id, details)
    VALUES ($1, $2, $3, $4)
  `;
  
  await getPool().query(query, [
    slackUserId,
    action,
    requestId,
    details ? JSON.stringify(details) : null,
  ]);
}

/**
 * Get audit log for a specific request or user
 */
export async function getAuditLog(
  requestId?: string,
  slackUserId?: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const values: any[] = [];
  
  if (requestId) {
    values.push(requestId);
    query += ` AND request_id = $${values.length}`;
  }
  
  if (slackUserId) {
    values.push(slackUserId);
    query += ` AND slack_user_id = $${values.length}`;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${values.length + 1}`;
  values.push(limit);
  
  const result = await getPool().query(query, values);
  return result.rows;
}
