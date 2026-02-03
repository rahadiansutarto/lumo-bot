# Leave Management System

A comprehensive leave/time-off management system integrated into your Slack bot.

## Features

### Core Functionality
- **Leave Request Submission** - Interactive Slack forms for submitting leave requests
- **Policy Enforcement** - Automatic 3-day advance notice validation
- **Manager Approval Workflow** - One-click approve/reject with buttons
- **Smart Reminders** - 12-hour recurring reminders for pending requests
- **Daily OOO Summary** - Automated 8 AM daily summary of who's out
- **Audit Trail** - Complete log of all actions for compliance

### Technical Highlights
- **Persistent Scheduling** - Reminders survive server restarts (Redis + BullMQ)
- **Type-Safe** - Full TypeScript with proper interfaces
- **Structured Logging** - Request tracing with unique IDs
- **Role-Based Access** - Managers vs employees with database-backed permissions
- **Production-Ready** - Error handling, retries, monitoring built-in

## Quick Start

### 1. Install Dependencies
```bash
# Already done if you ran this before
bun add pg bullmq ioredis
```

### 2. Set Up Services

**PostgreSQL:**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15
createdb leave_management

# Or use Docker
docker run --name leave-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=leave_management \
  -p 5432:5432 \
  -d postgres:15
```

**Redis:**
```bash
# macOS
brew install redis
brew services start redis

# Or use Docker
docker run --name leave-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leave_management
DB_USER=postgres
DB_PASSWORD=yourpassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Manager Slack IDs (get from Slack profile)
AXEL_SLACK_ID=U123456789
NADIA_SLACK_ID=U987654321
```

### 4. Initialize Database

```bash
bun run setup-db
```

### 5. Update slack-bot.ts

Add these lines to your `slack-bot.ts`:

```typescript
import { initializeLeaveSystem, shutdownLeaveSystem } from './src/leave-system';

// After initializing the Slack app
await initializeLeaveSystem(app);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await shutdownLeaveSystem();
  process.exit(0);
});
```

### 6. Configure Slack App

Add these slash commands in your Slack app settings:
- `/request-leave` - Submit a leave request
- `/leave-status` - View pending requests (managers only)
- `/leave-audit` - View audit log (managers only)

Required scopes:
- `chat:write`
- `commands`
- `im:write`
- `users:read`

### 7. Start Bot

```bash
bun start
```

## Usage

### For Employees

**Submit Leave Request:**
1. Type `/request-leave` in Slack
2. Fill out the form:
   - Leave Type (Vacation, Sick, Personal, Emergency)
   - Start Date
   - End Date
   - Reason (optional)
3. Click "Submit"
4. Get confirmation in DM
5. Wait for manager approval

**Policy Rules:**
- Must request at least 3 business days in advance
- End date cannot be before start date
- Maximum 30 days per request

**Notifications:**
- Immediate confirmation when submitted
- Notification when approved/rejected

### For Managers (Axel/Nadia)

**Approve/Reject Requests:**
1. Receive DM with approval request
2. Click "Approve" or "Reject"
3. If rejecting, provide reason in modal
4. Requester is notified automatically

**View Pending Requests:**
```
/leave-status
```
Shows all pending requests with:
- Request ID
- Requester name
- Leave type
- Dates
- How long it's been pending

**View Audit Log:**
```
/leave-audit
/leave-audit LR-ABC123  # For specific request
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User (Slack)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │ /request-leave
                  │ Button clicks
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Slack Bot (Bun)                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  leaveHandlers.ts                                    │    │
│  │  - Modal submissions                                 │    │
│  │  - Button actions                                    │    │
│  │  - Slash commands                                    │    │
│  └────────┬────────────────────────────┬────────────────┘    │
│           │                            │                     │
│  ┌────────▼──────────┐      ┌─────────▼──────────┐         │
│  │   leavePolicy.ts  │      │   leaveBlocks.ts   │         │
│  │   - Validation    │      │   - Block Kit UI   │         │
│  └───────────────────┘      └────────────────────┘         │
└────────────┬────────────────────────┬────────────────────────┘
             │                        │
    ┌────────▼─────────┐    ┌────────▼─────────┐
    │   PostgreSQL     │    │   Redis/BullMQ   │
    │   - Requests     │    │   - Reminders    │
    │   - Users        │    │   - Jobs         │
    │   - Audit Log    │    │   - Scheduling   │
    └──────────────────┘    └──────────────────┘
```

## Database Schema

### Main Tables

**user_roles** - Employee vs Manager distinction
- `slack_user_id` (unique)
- `is_admin` (boolean)
- `full_name`, `email`

**leave_requests** - Leave request records
- `request_id` (unique, e.g., LR-ABC123)
- `slack_user_id`
- `leave_type` (vacation, sick, personal, emergency)
- `start_date`, `end_date`, `total_days`
- `status` (pending, approved, rejected, cancelled)
- `reason`, `rejection_reason`

**reminder_schedule** - Persistent reminder tracking
- `request_id` (FK)
- `next_reminder_at`
- `reminder_count`
- `is_active`

**audit_log** - Complete action history
- `slack_user_id`
- `action` (submit, approve, reject, view, etc.)
- `request_id`
- `details` (JSONB)

### Views

**pending_requests_summary** - Manager dashboard
- All pending requests
- Hours pending
- Reminder count

**approved_leaves_today** - Daily OOO report
- All approved leaves active today

## Reminder System

### How It Works

1. **When request is submitted:**
   - Create entry in `reminder_schedule` table
   - Schedule BullMQ job for 12 hours later

2. **Every 12 hours:**
   - BullMQ worker wakes up
   - Checks if request still pending
   - If yes: Send reminder to managers
   - Schedule next reminder in 12 hours
   - If no: Deactivate reminder

3. **On approval/rejection:**
   - Cancel BullMQ job
   - Deactivate reminder in database

4. **On server restart:**
   - Check database for missed reminders
   - Re-schedule any active reminders immediately

### Daily OOO Summary

Runs at 8 AM every day (configurable):
- Fetches all approved leaves for today
- Posts to #general channel
- Sends pending requests summary to managers

## Monitoring

### Health Check

```typescript
import { healthCheck } from './src/leave-system';

const health = await healthCheck();
console.log(health);
// { status: 'healthy', details: { database: 'connected', redis: 'connected' } }
```

### Check BullMQ Jobs

```bash
# Redis CLI
redis-cli
KEYS bull:*

# Get job counts
HGETALL bull:leave-reminders:meta
```

### Database Queries

```sql
-- Pending requests
SELECT * FROM pending_requests_summary;

-- Today's OOO
SELECT * FROM approved_leaves_today;

-- Recent audit log
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20;

-- Active reminders
SELECT * FROM reminder_schedule WHERE is_active = TRUE;
```

## Troubleshooting

### Common Issues

**"Database not initialized"**
```bash
# Check database is running
psql leave_management -c "SELECT 1"

# Re-run schema
bun run setup-db
```

**"Redis connection error"**
```bash
# Check Redis is running
redis-cli ping

# Restart Redis
brew services restart redis
```

**"User does not have permission"**
```sql
-- Check manager status
SELECT * FROM user_roles WHERE slack_user_id = 'U123456789';

-- Set as admin
UPDATE user_roles SET is_admin = TRUE WHERE slack_user_id = 'U123456789';
```

**Reminders not sending**
```bash
# Check BullMQ workers
redis-cli KEYS "bull:leave-reminders:*"

# Check logs
bun start | grep reminder
```

## Customization

### Change Advance Notice Period

Edit `src/utils/leavePolicy.ts`:
```typescript
const MINIMUM_ADVANCE_DAYS = 3; // Change to 5, 7, etc.
```

### Change Daily Summary Time

Edit `src/jobs/reminderQueue.ts`:
```typescript
repeat: {
  pattern: '0 9 * * *', // 9 AM instead of 8 AM
}
```

### Add Leave Types

Update Slack form in `src/slack/leaveBlocks.ts`:
```typescript
options: [
  { text: { type: 'plain_text', text: 'Vacation' }, value: 'vacation' },
  { text: { type: 'plain_text', text: 'Sick Leave' }, value: 'sick' },
  { text: { type: 'plain_text', text: 'Parental Leave' }, value: 'parental' }, // New
],
```

And update type in `src/types/leave.ts`:
```typescript
export type LeaveType = 'vacation' | 'sick' | 'personal' | 'emergency' | 'parental';
```

### Add More Managers

```sql
INSERT INTO user_roles (slack_user_id, full_name, is_admin)
VALUES ('U_NEW_MANAGER_ID', 'Manager Name', TRUE);
```

## Testing

### Test Leave Request Flow

1. As employee: `/request-leave`
2. Submit with dates 4+ days away
3. Check manager DMs for approval request
4. As manager: Click "Approve"
5. Check employee DM for confirmation

### Test Policy Enforcement

1. `/request-leave`
2. Select dates 2 days away
3. Should get error: "must be at least 3 days in advance"

### Test Reminders

```bash
# Check database
psql leave_management
SELECT * FROM reminder_schedule WHERE is_active = TRUE;

# Check Redis jobs
redis-cli KEYS "bull:leave-reminders:*"
```

## Production Deployment

### Checklist

- [ ] PostgreSQL with automated backups
- [ ] Redis with persistence enabled
- [ ] Environment variables secured
- [ ] SSL/TLS for database connection
- [ ] Error alerting configured
- [ ] Audit log retention policy set
- [ ] Manager backup approvers configured

### Scaling

For high volume:
- Use PostgreSQL read replicas
- Use Redis Cluster
- Deploy multiple bot instances
- Add caching layer (Redis)
- Use message queue for notifications

## Future Enhancements

Potential improvements:
- [ ] PTO balance tracking
- [ ] Holiday calendar integration
- [ ] Automatic conflict detection
- [ ] Manager delegation (backup approvers)
- [ ] Mobile push notifications
- [ ] Analytics dashboard
- [ ] Export to payroll systems
- [ ] Team calendar view

## Support

For issues:
1. Check logs: `bun start | grep leave`
2. Check database state
3. Check Redis connection
4. Review audit log
5. Check Slack app configuration

## License

Same as main project.

---

**Built with:** PostgreSQL, Redis, BullMQ, Slack Block Kit, TypeScript, Bun

**Maintainers:** Your team

**Last Updated:** 2026-01-23
