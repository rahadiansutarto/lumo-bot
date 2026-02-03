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
