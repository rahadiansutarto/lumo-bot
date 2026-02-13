-- Leave Management System Database Schema

-- User roles table (employees vs managers)
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  slack_user_id VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255),
  full_name VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_user_roles_slack_id ON user_roles(slack_user_id);
CREATE INDEX idx_user_roles_admin ON user_roles(is_admin);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(50) UNIQUE NOT NULL,
  slack_user_id VARCHAR(50) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  leave_type VARCHAR(50) NOT NULL, -- 'vacation', 'sick', 'personal', 'emergency'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  approved_by VARCHAR(50),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  slack_message_ts VARCHAR(50), -- For updating the Slack message
  slack_channel_id VARCHAR(50)
);

-- Create indexes for queries
CREATE INDEX idx_leave_requests_user ON leave_requests(slack_user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_submitted ON leave_requests(submitted_at);

-- Reminder schedule table
CREATE TABLE IF NOT EXISTS reminder_schedule (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  next_reminder_at TIMESTAMP NOT NULL,
  reminder_count INTEGER DEFAULT 0,
  last_reminded_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES leave_requests(request_id) ON DELETE CASCADE
);

CREATE INDEX idx_reminder_schedule_request ON reminder_schedule(request_id);
CREATE INDEX idx_reminder_schedule_next ON reminder_schedule(next_reminder_at, is_active);

-- Audit log table (for compliance and debugging)
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(50),
  slack_user_id VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'submit', 'approve', 'reject', 'cancel', 'view'
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_request ON audit_log(request_id);
CREATE INDEX idx_audit_log_user ON audit_log(slack_user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin users (Axel and Nadia)
-- Replace these with actual Slack user IDs
INSERT INTO user_roles (slack_user_id, email, full_name, is_admin)
VALUES 
  ('U_AXEL_ID', 'axel@company.com', 'Axel', TRUE),
  ('U_NADIA_ID', 'nadia@company.com', 'Nadia', TRUE)
ON CONFLICT (slack_user_id) DO NOTHING;

-- View for pending requests summary
CREATE OR REPLACE VIEW pending_requests_summary AS
SELECT 
  lr.request_id,
  lr.slack_user_id,
  lr.requester_name,
  lr.leave_type,
  lr.start_date,
  lr.end_date,
  lr.total_days,
  lr.reason,
  lr.submitted_at,
  rs.reminder_count,
  rs.last_reminded_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - lr.submitted_at)) / 3600 AS hours_pending
FROM leave_requests lr
LEFT JOIN reminder_schedule rs ON lr.request_id = rs.request_id
WHERE lr.status = 'pending'
ORDER BY lr.submitted_at ASC;

-- View for approved leaves (for daily OOO summary)
CREATE OR REPLACE VIEW approved_leaves_today AS
SELECT 
  lr.request_id,
  lr.slack_user_id,
  lr.requester_name,
  lr.leave_type,
  lr.start_date,
  lr.end_date,
  lr.total_days
FROM leave_requests lr
WHERE lr.status = 'approved'
  AND lr.start_date <= CURRENT_DATE
  AND lr.end_date >= CURRENT_DATE
ORDER BY lr.requester_name;

-- ===================================================================
-- Weekly Check-Ins System Schema
-- ===================================================================

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

CREATE INDEX idx_org_roster_employee_slack ON org_roster(employee_slack_id);
CREATE INDEX idx_org_roster_manager_slack ON org_roster(manager_slack_id);
CREATE INDEX idx_org_roster_team ON org_roster(team);
CREATE INDEX idx_org_roster_active ON org_roster(is_active);

-- Weekly check-in tracking (per person per week)
CREATE TABLE IF NOT EXISTS weekly_checkin_tracking (
  id SERIAL PRIMARY KEY,
  week_id VARCHAR(10) NOT NULL, -- ISO week format: "2026-W06"
  employee_name VARCHAR(255) NOT NULL,
  employee_slack_id VARCHAR(50) NOT NULL,
  manager_slack_id VARCHAR(50) NOT NULL,
  team VARCHAR(100),
  
  -- Worker submission tracking
  worker_submitted BOOLEAN DEFAULT FALSE,
  worker_submission_timestamp TIMESTAMP,
  worker_status VARCHAR(20) DEFAULT 'not_yet_due', -- 'on_time', 'late', 'missed', 'not_yet_due'
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

CREATE INDEX idx_weekly_tracking_week ON weekly_checkin_tracking(week_id);
CREATE INDEX idx_weekly_tracking_employee ON weekly_checkin_tracking(employee_slack_id);
CREATE INDEX idx_weekly_tracking_manager ON weekly_checkin_tracking(manager_slack_id);
CREATE INDEX idx_weekly_tracking_worker_status ON weekly_checkin_tracking(worker_submitted, worker_status);
CREATE INDEX idx_weekly_tracking_manager_status ON weekly_checkin_tracking(manager_review_submitted, manager_status);

-- Message variant tracking (for rotating Slack messages)
CREATE TABLE IF NOT EXISTS checkin_message_variants (
  id SERIAL PRIMARY KEY,
  message_type VARCHAR(50) NOT NULL, -- 'worker_primary', 'worker_nudge_1', 'manager_primary', etc.
  variant_sequence INTEGER NOT NULL, -- 0, 1, 2, 3... (cycles through)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Google Sheets sync log (audit trail for data sync)
CREATE TABLE IF NOT EXISTS sheets_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'roster', 'worker_submissions', 'manager_reviews'
  sync_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sheets_sync_log_type ON sheets_sync_log(sync_type);
CREATE INDEX idx_sheets_sync_log_time ON sheets_sync_log(synced_at);

-- Trigger to auto-update updated_at for org_roster
CREATE TRIGGER update_org_roster_updated_at
    BEFORE UPDATE ON org_roster
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at for weekly_checkin_tracking
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
