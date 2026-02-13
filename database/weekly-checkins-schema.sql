-- ===================================================================
-- Weekly Check-Ins System Schema
-- ===================================================================
-- Run this file separately: psql -d leave_management -f weekly-checkins-schema.sql

-- Organization roster (synced from Google Sheets)
CREATE TABLE IF NOT EXISTS org_roster (
  id SERIAL PRIMARY KEY,
  employee_name VARCHAR(255) NOT NULL,
  employee_slack_id VARCHAR(50) NOT NULL UNIQUE,
  manager_name VARCHAR(255) NOT NULL,
  manager_slack_id VARCHAR(50) NOT NULL,
  team VARCHAR(100),
  employee_email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_roster_employee_slack ON org_roster(employee_slack_id);
CREATE INDEX IF NOT EXISTS idx_org_roster_manager_slack ON org_roster(manager_slack_id);
CREATE INDEX IF NOT EXISTS idx_org_roster_team ON org_roster(team);
CREATE INDEX IF NOT EXISTS idx_org_roster_active ON org_roster(is_active);

-- Weekly check-in tracking (per person per week)
CREATE TABLE IF NOT EXISTS weekly_checkin_tracking (
  id SERIAL PRIMARY KEY,
  week_id VARCHAR(10) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  employee_slack_id VARCHAR(50) NOT NULL,
  manager_slack_id VARCHAR(50) NOT NULL,
  team VARCHAR(100),
  
  -- Worker submission tracking
  worker_submitted BOOLEAN DEFAULT FALSE,
  worker_submission_timestamp TIMESTAMP,
  worker_status VARCHAR(20) DEFAULT 'not_yet_due',
  worker_reminder_count INTEGER DEFAULT 0,
  worker_last_reminded_at TIMESTAMP,
  
  -- Manager review tracking
  manager_review_submitted BOOLEAN DEFAULT FALSE,
  manager_review_timestamp TIMESTAMP,
  manager_status VARCHAR(20) DEFAULT 'not_yet_due',
  manager_reminder_count INTEGER DEFAULT 0,
  manager_last_reminded_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one record per employee per week
  UNIQUE(week_id, employee_slack_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_tracking_week ON weekly_checkin_tracking(week_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tracking_employee ON weekly_checkin_tracking(employee_slack_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tracking_manager ON weekly_checkin_tracking(manager_slack_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tracking_worker_status ON weekly_checkin_tracking(worker_submitted, worker_status);
CREATE INDEX IF NOT EXISTS idx_weekly_tracking_manager_status ON weekly_checkin_tracking(manager_review_submitted, manager_status);

-- Message variant tracking (for rotating Slack messages)
CREATE TABLE IF NOT EXISTS checkin_message_variants (
  id SERIAL PRIMARY KEY,
  message_type VARCHAR(50) NOT NULL,
  variant_sequence INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Google Sheets sync log (audit trail for data sync)
CREATE TABLE IF NOT EXISTS sheets_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  sync_status VARCHAR(20) NOT NULL,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sheets_sync_log_type ON sheets_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_sheets_sync_log_time ON sheets_sync_log(synced_at);

-- Trigger function should already exist from leave system
-- If not, create it:
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_org_roster_updated_at ON org_roster;
CREATE TRIGGER update_org_roster_updated_at
    BEFORE UPDATE ON org_roster
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weekly_checkin_tracking_updated_at ON weekly_checkin_tracking;
CREATE TRIGGER update_weekly_checkin_tracking_updated_at
    BEFORE UPDATE ON weekly_checkin_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View: Current week pending workers
CREATE OR REPLACE VIEW current_week_pending_workers AS
SELECT 
  wct.week_id,
  wct.employee_name,
  wct.employee_slack_id,
  wct.worker_reminder_count,
  wct.worker_last_reminded_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - wct.created_at)) / 3600 AS hours_since_week_start
FROM weekly_checkin_tracking wct
WHERE wct.week_id = TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW')
  AND wct.worker_submitted = FALSE
  AND wct.worker_status != 'missed'
ORDER BY wct.worker_reminder_count, wct.employee_name;

-- View: Current week pending managers
CREATE OR REPLACE VIEW current_week_pending_managers AS
SELECT 
  wct.manager_slack_id,
  wct.manager_review_submitted,
  COUNT(*) FILTER (WHERE wct.worker_submitted = TRUE) AS submitted_reports_to_review,
  COUNT(*) AS total_direct_reports,
  MAX(wct.manager_reminder_count) AS max_reminder_count
FROM weekly_checkin_tracking wct
WHERE wct.week_id = TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW')
  AND wct.manager_review_submitted = FALSE
GROUP BY wct.manager_slack_id, wct.manager_review_submitted
ORDER BY max_reminder_count;

-- View: Weekly compliance summary
CREATE OR REPLACE VIEW weekly_compliance_summary AS
SELECT 
  wct.week_id,
  COUNT(*) AS total_employees,
  
  -- Worker stats
  COUNT(*) FILTER (WHERE wct.worker_submitted = TRUE AND wct.worker_status = 'on_time') AS workers_on_time,
  COUNT(*) FILTER (WHERE wct.worker_submitted = TRUE AND wct.worker_status = 'late') AS workers_late,
  COUNT(*) FILTER (WHERE wct.worker_submitted = FALSE AND wct.worker_status = 'missed') AS workers_missed,
  
  -- Manager stats
  COUNT(DISTINCT wct.manager_slack_id) AS total_managers,
  COUNT(DISTINCT wct.manager_slack_id) FILTER (WHERE wct.manager_review_submitted = TRUE AND wct.manager_status = 'on_time') AS managers_on_time,
  COUNT(DISTINCT wct.manager_slack_id) FILTER (WHERE wct.manager_review_submitted = TRUE AND wct.manager_status = 'late') AS managers_late,
  COUNT(DISTINCT wct.manager_slack_id) FILTER (WHERE wct.manager_review_submitted = FALSE AND wct.manager_status = 'missed') AS managers_missed
FROM weekly_checkin_tracking wct
WHERE wct.week_id = TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW')
GROUP BY wct.week_id;
