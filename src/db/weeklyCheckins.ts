/**
 * Database operations for Weekly Check-Ins System
 */

import { getPool } from './postgres';
import { logger } from '../logger';
import {
  RosterEntry,
  WeeklyTrackingRecord,
  SubmissionStatus,
  ComplianceReport,
} from '../types/weeklyCheckins';

/**
 * Get current ISO week ID (e.g., "2026-W06")
 */
export function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = getISOWeek(now);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get ISO week number for a date
 */
function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Sync roster from Google Sheets data to database
 */
export async function syncRosterToDatabase(
  rosterEntries: RosterEntry[]
): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Mark all existing entries as inactive first
    await client.query('UPDATE org_roster SET is_active = FALSE');
    
    // Upsert each roster entry
    for (const entry of rosterEntries) {
      await client.query(
        `INSERT INTO org_roster (
          employee_name, employee_slack_id, manager_name, manager_slack_id,
          team, employee_email, is_active, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
        ON CONFLICT (employee_slack_id)
        DO UPDATE SET
          employee_name = EXCLUDED.employee_name,
          manager_name = EXCLUDED.manager_name,
          manager_slack_id = EXCLUDED.manager_slack_id,
          team = EXCLUDED.team,
          employee_email = EXCLUDED.employee_email,
          is_active = TRUE,
          synced_at = NOW()`,
        [
          entry.employee_name,
          entry.employee_slack_id,
          entry.manager_name,
          entry.manager_slack_id,
          entry.team || null,
          entry.employee_email || null,
        ]
      );
    }
    
    await client.query('COMMIT');
    
    logger.info('Roster synced to database', {
      count: rosterEntries.length,
    });
    
    // Log sync
    await logSheetsSync('roster', 'success', rosterEntries.length);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error syncing roster to database', error as Error);
    await logSheetsSync('roster', 'failed', 0, (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all active roster entries
 */
export async function getActiveRoster(): Promise<RosterEntry[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
      employee_name, employee_slack_id, manager_name, manager_slack_id,
      team, employee_email
    FROM org_roster
    WHERE is_active = TRUE
    ORDER BY employee_name`
  );
  
  return result.rows;
}

/**
 * Get roster entry by Slack ID
 */
export async function getRosterEntryBySlackId(
  slackId: string
): Promise<RosterEntry | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
      employee_name, employee_slack_id, manager_name, manager_slack_id,
      team, employee_email
    FROM org_roster
    WHERE employee_slack_id = $1 AND is_active = TRUE`,
    [slackId]
  );
  
  return result.rows[0] || null;
}

/**
 * Initialize weekly tracking records for all active employees
 */
export async function initializeWeeklyTracking(weekId: string): Promise<void> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO weekly_checkin_tracking (
      week_id, employee_name, employee_slack_id, manager_slack_id, team
    )
    SELECT 
      $1, employee_name, employee_slack_id, manager_slack_id, team
    FROM org_roster
    WHERE is_active = TRUE
    ON CONFLICT (week_id, employee_slack_id) DO NOTHING`,
    [weekId]
  );
  
  logger.info('Weekly tracking initialized', {
    weekId,
    rowsInserted: result.rowCount,
  });
}

/**
 * Get tracking record for employee in a specific week
 */
export async function getWeeklyTrackingRecord(
  weekId: string,
  employeeSlackId: string
): Promise<WeeklyTrackingRecord | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM weekly_checkin_tracking
    WHERE week_id = $1 AND employee_slack_id = $2`,
    [weekId, employeeSlackId]
  );
  
  return result.rows[0] || null;
}

/**
 * Mark worker submission as complete
 */
export async function markWorkerSubmitted(
  weekId: string,
  employeeSlackId: string,
  status: SubmissionStatus = 'on_time'
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE weekly_checkin_tracking
    SET 
      worker_submitted = TRUE,
      worker_submission_timestamp = NOW(),
      worker_status = $3,
      updated_at = NOW()
    WHERE week_id = $1 AND employee_slack_id = $2`,
    [weekId, employeeSlackId, status]
  );
  
  logger.info('Worker submission marked', {
    weekId,
    employeeSlackId,
    status,
  });
}

/**
 * Mark manager review as complete
 */
export async function markManagerReviewSubmitted(
  weekId: string,
  managerSlackId: string,
  status: SubmissionStatus = 'on_time'
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE weekly_checkin_tracking
    SET 
      manager_review_submitted = TRUE,
      manager_review_timestamp = NOW(),
      manager_status = $3,
      updated_at = NOW()
    WHERE week_id = $1 AND manager_slack_id = $2`,
    [weekId, managerSlackId, status]
  );
  
  logger.info('Manager review marked', {
    weekId,
    managerSlackId,
    status,
  });
}

/**
 * Increment reminder count for worker
 */
export async function incrementWorkerReminderCount(
  weekId: string,
  employeeSlackId: string
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE weekly_checkin_tracking
    SET 
      worker_reminder_count = worker_reminder_count + 1,
      worker_last_reminded_at = NOW(),
      updated_at = NOW()
    WHERE week_id = $1 AND employee_slack_id = $2`,
    [weekId, employeeSlackId]
  );
}

/**
 * Increment reminder count for manager
 */
export async function incrementManagerReminderCount(
  weekId: string,
  managerSlackId: string
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE weekly_checkin_tracking
    SET 
      manager_reminder_count = manager_reminder_count + 1,
      manager_last_reminded_at = NOW(),
      updated_at = NOW()
    WHERE week_id = $1 AND manager_slack_id = $2`,
    [weekId, managerSlackId]
  );
}

/**
 * Get all pending workers for current week
 */
export async function getPendingWorkers(weekId: string): Promise<WeeklyTrackingRecord[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM weekly_checkin_tracking
    WHERE week_id = $1 AND worker_submitted = FALSE
    ORDER BY employee_name`,
    [weekId]
  );
  
  return result.rows;
}

/**
 * Get all pending managers for current week
 */
export async function getPendingManagers(weekId: string): Promise<string[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT DISTINCT manager_slack_id
    FROM weekly_checkin_tracking
    WHERE week_id = $1 AND manager_review_submitted = FALSE
    ORDER BY manager_slack_id`,
    [weekId]
  );
  
  return result.rows.map(row => row.manager_slack_id);
}

/**
 * Get direct reports for a manager (who have submitted worker forms)
 */
export async function getManagerDirectReports(
  weekId: string,
  managerSlackId: string
): Promise<WeeklyTrackingRecord[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM weekly_checkin_tracking
    WHERE week_id = $1 AND manager_slack_id = $2 AND worker_submitted = TRUE
    ORDER BY employee_name`,
    [weekId, managerSlackId]
  );
  
  return result.rows;
}

/**
 * Generate compliance report for a week
 */
export async function generateComplianceReport(
  weekId: string
): Promise<ComplianceReport> {
  const pool = getPool();
  
  // Get weekly summary
  const summaryResult = await pool.query(
    `SELECT * FROM weekly_compliance_summary WHERE week_id = $1`,
    [weekId]
  );
  
  const summary = summaryResult.rows[0] || {
    total_employees: 0,
    workers_on_time: 0,
    workers_late: 0,
    workers_missed: 0,
    total_managers: 0,
    managers_on_time: 0,
    managers_late: 0,
    managers_missed: 0,
  };
  
  // Get repeat defaulters (check last 3 weeks)
  const defaultersResult = await pool.query(
    `SELECT 
      employee_name,
      employee_slack_id,
      COUNT(*) FILTER (WHERE worker_status = 'missed') AS worker_missed_count,
      COUNT(*) FILTER (WHERE manager_status = 'missed') AS manager_missed_count
    FROM weekly_checkin_tracking
    WHERE week_id >= TO_CHAR(CURRENT_DATE - INTERVAL '3 weeks', 'IYYY-"W"IW')
      AND week_id <= $1
    GROUP BY employee_name, employee_slack_id
    HAVING COUNT(*) FILTER (WHERE worker_status = 'missed') >= 2
        OR COUNT(*) FILTER (WHERE manager_status = 'missed') >= 2
    ORDER BY worker_missed_count DESC, manager_missed_count DESC`,
    [weekId]
  );
  
  const repeatDefaulters = defaultersResult.rows.map(row => ({
    name: row.employee_name,
    slack_id: row.employee_slack_id,
    missed_count: Math.max(row.worker_missed_count, row.manager_missed_count),
    type: row.worker_missed_count >= row.manager_missed_count ? 'worker' : 'manager',
  })) as ComplianceReport['repeat_defaulters'];
  
  return {
    week_id: weekId,
    generated_at: new Date(),
    workers_total: summary.total_employees,
    workers_completed_on_time: summary.workers_on_time,
    workers_late: summary.workers_late,
    workers_missed: summary.workers_missed,
    managers_total: summary.total_managers,
    managers_completed_on_time: summary.managers_on_time,
    managers_late: summary.managers_late,
    managers_missed: summary.managers_missed,
    repeat_defaulters: repeatDefaulters,
  };
}

/**
 * Get or create message variant index (for rotating messages)
 */
export async function getMessageVariantIndex(
  messageType: string,
  totalVariants: number
): Promise<number> {
  const pool = getPool();
  
  // Get the last used variant for this message type
  const result = await pool.query(
    `SELECT variant_sequence FROM checkin_message_variants
    WHERE message_type = $1
    ORDER BY created_at DESC
    LIMIT 1`,
    [messageType]
  );
  
  let nextVariant = 0;
  
  if (result.rows.length > 0) {
    const lastVariant = result.rows[0].variant_sequence;
    nextVariant = (lastVariant + 1) % totalVariants;
  }
  
  // Store the new variant index
  await pool.query(
    `INSERT INTO checkin_message_variants (message_type, variant_sequence)
    VALUES ($1, $2)`,
    [messageType, nextVariant]
  );
  
  return nextVariant;
}

/**
 * Log sheets sync operation
 */
async function logSheetsSync(
  syncType: string,
  syncStatus: string,
  recordsSynced: number,
  errorMessage?: string
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO sheets_sync_log (sync_type, sync_status, records_synced, error_message)
    VALUES ($1, $2, $3, $4)`,
    [syncType, syncStatus, recordsSynced, errorMessage || null]
  );
}
