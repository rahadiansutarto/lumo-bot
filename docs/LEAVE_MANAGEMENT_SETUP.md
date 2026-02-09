# Leave Management System - Setup Guide

This guide will help you set up the leave management system from scratch.

## Overview

The leave management system includes:
- PostgreSQL database for storing leave requests
- Redis + BullMQ for scheduled reminders
- Slack Block Kit forms and interactive buttons
- 3-day advance notice policy enforcement
- Role-based access control (managers vs employees)
- Daily out-of-office summaries
- 12-hour reminders for pending requests
- Audit logging for compliance

## Prerequisites

1. **PostgreSQL** (version 12 or higher)
2. **Redis** (version 6 or higher)
3. **Bun** (already installed)
4. **Slack workspace** with admin access

## Step 1: Install Dependencies

Dependencies are already installed via:
```bash
bun add pg bullmq ioredis
```

## Step 2: Set Up PostgreSQL Database

### Option A: Local PostgreSQL (macOS)

```bash
# Install PostgreSQL (if not installed)
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb leave_management

# Import schema
psql leave_management < database/schema.sql
```

### Option B: Docker PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run --name leave-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=leave_management \
  -p 5432:5432 \
  -d postgres:15

# Import schema
docker exec -i leave-postgres psql -U postgres leave_management < database/schema.sql
```

### Option C: Managed Database (Supabase, Railway, etc.)

1. Create a PostgreSQL database on your preferred platform
2. Get the connection details
3. Run the schema.sql manually or use migration tool

## Step 3: Set Up Redis

### Option A: Local Redis (macOS)

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Option B: Docker Redis

```bash
# Run Redis in Docker
docker run --name leave-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

### Option C: Managed Redis (Upstash, Redis Cloud, etc.)

1. Create a Redis instance on your preferred platform
2. Get the connection URL and credentials

## Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:

```bash
# Get Slack tokens from https://api.slack.com/apps
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...

# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leave_management
DB_USER=postgres
DB_PASSWORD=yourpassword

# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty if no password

# Manager Slack IDs
AXEL_SLACK_ID=U123456789  # Replace with actual Slack user ID
NADIA_SLACK_ID=U987654321  # Replace with actual Slack user ID
```

### How to Get Slack User IDs:

Option 1: From Slack web/desktop app
1. Click on a user's profile
2. Click "More" (three dots)
3. Click "Copy member ID"

Option 2: Via API
```bash
curl -X POST https://slack.com/api/users.list \
  -H "Authorization: Bearer xoxb-your-bot-token" \
  | jq '.members[] | select(.name=="axel") | .id'
```

## Step 5: Update Database with Manager IDs

Once you have the correct Slack user IDs, update the database:

```sql
-- Connect to your database
psql leave_management

-- Update manager IDs
UPDATE user_roles SET slack_user_id = 'U_ACTUAL_AXEL_ID' WHERE full_name = 'Axel';
UPDATE user_roles SET slack_user_id = 'U_ACTUAL_NADIA_ID' WHERE full_name = 'Nadia';
```

## Step 6: Configure Slack App

### 6.1 Create Slack App (if not done)

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Susan" or "Leave Manager"
4. Select your workspace

### 6.2 Enable Socket Mode

1. Go to "Socket Mode" in sidebar
2. Enable Socket Mode
3. Generate App-Level Token with `connections:write` scope
4. Copy the token (starts with `xapp-`)

### 6.3 Configure OAuth & Permissions

Add these Bot Token Scopes:
- `chat:write`
- `chat:write.public`
- `commands`
- `im:history`
- `im:read`
- `im:write`
- `users:read`
- `users:read.email`

### 6.4 Enable Interactivity

1. Go to "Interactivity & Shortcuts"
2. Enable Interactivity
3. No need for Request URL (using Socket Mode)

### 6.5 Create Slash Commands

Create these slash commands:

1. `/request-leave`
   - Description: "Submit a leave request"
   - Usage hint: "[no parameters]"

2. `/leave-status`
   - Description: "View pending leave requests (managers only)"
   - Usage hint: "[no parameters]"

3. `/leave-audit`
   - Description: "View audit log (managers only)"
   - Usage hint: "[request_id] (optional)"

### 6.6 Install App to Workspace

1. Go to "Install App"
2. Click "Install to Workspace"
3. Authorize the app
4. Copy the Bot Token (starts with `xoxb-`)

## Step 7: Initialize the System

Update your `slack-bot.ts` to initialize the leave system:

```typescript
import { initDatabase } from './src/db/postgres';
import { initializeReminderSystem } from './src/jobs/reminderQueue';
import { setupLeaveHandlers } from './src/slack/leaveHandlers';

// Initialize database
initDatabase();

// Initialize reminder system
await initializeReminderSystem();

// Setup leave handlers
setupLeaveHandlers(app);
```

## Step 8: Start the Bot

```bash
bun start
```

You should see:
```
Validating environment variables...
Environment validation passed!
Database pool initialized
Redis connected
Reminder system initialized
Daily summary scheduled for 8 AM every day
Slack bot is running!
```

## Step 9: Test the System

### Test 1: Submit Leave Request

1. In Slack, type `/request-leave`
2. Fill out the form
3. Try dates less than 3 days away → should get policy error
4. Try dates 4+ days away → should submit successfully

### Test 2: Manager Approval

1. Check Axel or Nadia's DMs
2. Should see approval request with buttons
3. Click "Approve" or "Reject"
4. Requester should get notification

### Test 3: View Status (Manager Only)

1. As Axel or Nadia, type `/leave-status`
2. Should see list of pending requests

### Test 4: Audit Log (Manager Only)

1. As Axel or Nadia, type `/leave-audit`
2. Should see all recent actions
3. Or `/leave-audit LR-ABC123` for specific request

## Step 10: Configure Daily Summary

The daily summary runs automatically at 8 AM every day.

To test it immediately:
```bash
# Connect to Redis
redis-cli

# Trigger daily summary job manually
ZADD bull:daily-summaries:delayed 0 '{"jobId":"test-summary"}'
```

Or modify the cron pattern in `src/jobs/reminderQueue.ts`:
```typescript
repeat: {
  pattern: '*/5 * * * *', // Every 5 minutes for testing
}
```

## Monitoring

### Check BullMQ Jobs

```bash
# Install Bull Board for web UI
bun add @bull-board/express @bull-board/api

# Or use Redis CLI
redis-cli
KEYS bull:*
```

### Check Database

```sql
-- Pending requests
SELECT * FROM pending_requests_summary;

-- Today's OOO
SELECT * FROM approved_leaves_today;

-- Audit log
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20;
```

### Check Logs

The bot logs all important events with structured logging:
```bash
# Watch logs in real-time
bun start | grep leave

# Filter by level
bun start | grep ERROR
```

## Troubleshooting

### Issue: "Database not initialized"
**Solution:** Make sure `initDatabase()` is called before any database operations.

### Issue: "Redis connection error"
**Solution:** Check Redis is running: `redis-cli ping`

### Issue: "User does not have permission"
**Solution:** Update manager IDs in database and .env file

### Issue: Reminders not sending
**Solution:** 
1. Check Redis is running
2. Check BullMQ workers are started
3. Check reminder_schedule table has active reminders

### Issue: Modal not opening
**Solution:**
1. Check Socket Mode is enabled
2. Check App-Level Token is correct
3. Check Interactivity is enabled in Slack app

## Production Considerations

### Security
1. Use environment variables for all secrets
2. Enable SSL for database connections
3. Use VPC/private networking for Redis
4. Rotate API keys regularly

### Scaling
1. Use connection pooling for PostgreSQL
2. Use Redis Cluster for high availability
3. Deploy multiple bot instances behind load balancer
4. Use managed services (RDS, ElastiCache)

### Monitoring
1. Set up alerts for failed jobs
2. Monitor database query performance
3. Track reminder delivery rates
4. Set up Slack app health checks

### Backups
1. Enable automated PostgreSQL backups
2. Export Redis data periodically
3. Keep audit logs for compliance (7 years for some industries)

## Google Calendar Integration (Optional)

To block out approved leaves in Google Calendar, add this to your system:

```typescript
// TODO: Implement Google Calendar sync
// When leave is approved, create calendar event
// When leave is rejected/cancelled, delete calendar event
```

See existing `src/tools/googleCalendar.ts` for reference.

## Support

For issues or questions:
1. Check logs first
2. Check database state
3. Verify Slack app configuration
4. Review audit log for recent actions

## Next Steps

1. Customize leave types for your organization
2. Add holiday calendar integration
3. Add automatic PTO balance tracking
4. Add manager delegation (backup approvers)
5. Add mobile push notifications
6. Add analytics dashboard

---

**System is ready! Happy managing leaves!** 🎉
