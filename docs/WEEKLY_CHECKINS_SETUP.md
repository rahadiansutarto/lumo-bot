# Weekly Check-Ins System Setup Guide

## Overview

The Weekly Check-Ins system automates the weekly execution ritual by:
- Distributing Google Form links via Slack DMs
- Tracking completion automatically via Google Sheets
- Nudging defaulters in Calvinball style
- Routing submissions to the correct manager
- Delivering manager directives back to workers
- Generating a weekly compliance report for leadership

## Architecture

The system follows the same clean architecture as the leave management system:

```
src/
├── types/weeklyCheckins.ts           # TypeScript types
├── db/weeklyCheckins.ts              # Database operations
├── services/googleSheets.ts          # Google Sheets integration
├── slack/
│   ├── checkinBlocks.ts              # Slack UI messages
│   └── checkinHandlers.ts            # Button click handlers
├── jobs/checkinQueue.ts              # BullMQ scheduled jobs
└── weekly-checkins-system.ts         # Main initialization
```

## Prerequisites

1. **PostgreSQL** (already set up for leave system)
2. **Redis** (already set up for leave system)
3. **Google Service Account** with Sheets API access
4. **Google Sheets** with:
   - Roster tab
   - Worker Responses tab (from Google Form)
   - Manager Responses tab (from Google Form)
5. **Google Forms**:
   - Worker Weekly Check-In Form
   - Manager Weekly Review Form

## Setup Instructions

### Step 1: Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Give it a name (e.g., "weekly-checkins-bot")
   - Grant role: "Editor"
   - Create JSON key and download it

### Step 2: Create Google Sheets & Forms

#### Create Roster Sheet

Create a Google Sheet with tabs:

**Roster Tab** (columns):
- Employee Name
- Employee Slack ID
- Manager Name
- Manager Slack ID
- Team (optional)
- Employee Email (optional)

Example:
```
Employee Name    | Employee Slack ID | Manager Name | Manager Slack ID | Team      | Employee Email
John Doe         | U01ABC123        | Nadia        | U02DEF456       | Engineering| john@company.com
Jane Smith       | U03GHI789        | Axel         | U04JKL012       | Marketing  | jane@company.com
```

**Worker Responses Tab**: Will be auto-populated by Google Forms
**Manager Responses Tab**: Will be auto-populated by Google Forms

#### Create Google Forms

1. **Worker Weekly Check-In Form**:
   - Create form with questions (adjust to your needs)
   - First question: Employee Name (dropdown with all employee names from roster)
   - Other questions: Weekly scorecard, achievements, blockers, etc.
   - Set response destination to "Worker Responses" tab

2. **Manager Weekly Review Form**:
   - Manager Name (dropdown)
   - Employee Name (dropdown)
   - This Week's Directive (text)
   - Blocker Resolution (text)
   - Other fields as needed
   - Set response destination to "Manager Responses" tab

#### Share Sheet with Service Account

1. Open your Google Sheet
2. Click "Share"
3. Add the service account email (from JSON key: `client_email`)
4. Give it "Editor" access

### Step 3: Configure Environment Variables

Add these to your `.env` file:

```bash
# Google Service Account (entire JSON key as a single line)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}

# Google Sheets Configuration
WEEKLY_CHECKINS_SPREADSHEET_ID=your-spreadsheet-id-from-url
WEEKLY_CHECKINS_ROSTER_TAB=Roster
WEEKLY_CHECKINS_WORKER_TAB=Worker Responses
WEEKLY_CHECKINS_MANAGER_TAB=Manager Responses

# Google Forms URLs
WORKER_CHECKIN_FORM_URL=https://docs.google.com/forms/d/e/your-worker-form-id/viewform
MANAGER_REVIEW_FORM_URL=https://docs.google.com/forms/d/e/your-manager-form-id/viewform

# Leadership Slack IDs (for weekly compliance reports)
GURNOOR_SLACK_ID=U111111111
SANDEEP_SLACK_ID=U222222222
AXEL_SLACK_ID=U333333333
EMEKA_SLACK_ID=U444444444
NADIA_SLACK_ID=U555555555
```

**Finding Slack User IDs:**
- In Slack, click on a user's profile
- Click "More" (three dots)
- Copy Member ID

**Finding Spreadsheet ID:**
- From the Google Sheets URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### Step 4: Set Up Database

Run the database setup script:

```bash
bun run setup-weekly-checkins
```

This will create all necessary tables:
- `org_roster` - Organization roster
- `weekly_checkin_tracking` - Per-person per-week tracking
- `checkin_message_variants` - Message rotation tracking
- `sheets_sync_log` - Sync audit trail

### Step 5: Populate Roster

1. Fill in the Roster tab in your Google Sheet
2. The system will automatically sync it on Thursday 5 PM Bali time
3. Or you can manually trigger sync (see below)

### Step 6: Start the Bot

The system is already integrated into `slack-bot.ts` and will start automatically:

```bash
bun run start
```

Or for development with auto-reload:

```bash
bun run dev
```

## Weekly Schedule

All times are in **Bali Time (UTC+8 / WITA)**:

| Day | Time | Action |
|-----|------|--------|
| Thursday | 5:00 PM | Sync roster from Google Sheets, initialize week |
| Friday | 5:00 PM | Send Worker primary reminder |
| Saturday | 9:00 AM | Send Worker first nudge (if not completed) |
| Sunday | 8:00 PM | Send Worker final nudge (if not completed) |
| Monday | 8:00 AM | Send Manager primary reminder |
| Monday | 9:00 PM | Send Manager first nudge (if not completed) |
| Tuesday | 12:00 PM | Send Manager final nudge (if not completed) |
| Tuesday | 4:00 PM | **Send Leadership compliance report** |

## How It Works

### Worker Flow

1. **Friday EOD**: Worker receives DM from Susan with:
   - Weekly check-in reminder (rotating message variants)
   - "Open Weekly Check-In Form" button
   - "I've completed it" button

2. **Worker submits form**: Google Form writes to "Worker Responses" sheet

3. **System syncs**: Automatically detects submission and marks worker as completed

4. **Worker clicks "Completed"**: Gets confirmation message (prevents false "missed" flags)

5. **Nudges**: If not completed, receives Saturday and Sunday reminders

### Manager Flow

1. **Monday Morning**: Manager receives DM with:
   - Review reminder
   - Count of direct reports who submitted
   - "Open Manager Review Form" button
   - "I've completed my reviews" button

2. **Manager reviews**: Fills Manager Review Form for each direct report

3. **System syncs & routes**: 
   - Detects manager submission
   - Automatically sends directive + blocker resolution to worker via DM
   - Only sends "This Week's Directive" and "Blocker Resolution" fields (not full form)

4. **Nudges**: If not completed, receives Tuesday reminders

### Leadership Report

Every Tuesday 4 PM Bali time, leadership receives a compliance report with:
- Worker completion stats (on time / late / missed)
- Manager completion stats (on time / late / missed)
- Wall of Shame Watchlist (repeat defaulters: 2+ consecutive misses)

## Message Variants

The system rotates through multiple message variants to give Susan "personality":

- **4 Worker Primary Messages** (Friday)
- **5 Worker Nudge Messages** (Saturday)
- **4 Worker Final Messages** (Sunday)
- **4 Worker Confirmation Messages**
- **3 Manager Primary Messages** (Monday)
- **5 Manager Nudge Messages** (Tuesday morning)
- **5 Manager Final Messages** (Tuesday midday)
- **4 Manager Confirmation Messages**

Messages are "Calvinball style" - humorous but effective.

## Status Tracking

### Worker Status
- `on_time` - Submitted before Saturday EOD
- `late` - Submitted after Saturday EOD
- `missed` - No submission by end of week
- `not_yet_due` - Before Friday EOD

### Manager Status
- `on_time` - Submitted on Monday
- `late` - Submitted after Monday
- `missed` - No submission by end of week
- `not_yet_due` - Before Monday

## Database Views

The system provides SQL views for easy querying:

- `current_week_pending_workers` - Workers who haven't submitted yet
- `current_week_pending_managers` - Managers who haven't reviewed yet
- `weekly_compliance_summary` - Full compliance stats for current week

## Manual Operations

### Test Sync Roster

```typescript
import { readRosterFromSheets, getSheetsConfigFromEnv } from './src/services/googleSheets';
import { syncRosterToDatabase } from './src/db/weeklyCheckins';

const config = getSheetsConfigFromEnv();
const roster = await readRosterFromSheets(config);
await syncRosterToDatabase(roster);
```

### Check Sync Logs

```sql
SELECT * FROM sheets_sync_log ORDER BY synced_at DESC LIMIT 10;
```

### View Current Week Tracking

```sql
SELECT * FROM weekly_checkin_tracking 
WHERE week_id = TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW')
ORDER BY employee_name;
```

### Generate Report Manually

```typescript
import { generateComplianceReport, getCurrentWeekId } from './src/db/weeklyCheckins';

const report = await generateComplianceReport(getCurrentWeekId());
console.log(report);
```

## Troubleshooting

### Bot doesn't send reminders

Check:
1. Redis is running: `redis-cli ping`
2. Jobs are scheduled: Check BullMQ dashboard or logs
3. Slack app has permission to DM users
4. Form URLs are set in `.env`

### Roster not syncing

Check:
1. Service account has access to the sheet
2. `GOOGLE_SERVICE_ACCOUNT_KEY` is valid JSON (single line)
3. Spreadsheet ID is correct
4. Tab names match exactly (case-sensitive)

### Worker submissions not detected

Check:
1. Google Form is writing to correct tab
2. First column is timestamp
3. Second column is Employee Name (must match roster exactly)
4. Sheet sync is running (check `sheets_sync_log`)

### Manager feedback not routing to workers

Check:
1. Manager name in form matches roster exactly
2. Employee name in form matches roster exactly
3. Directive and Blocker Resolution fields are in correct columns (adjust indices in `googleSheets.ts` if needed)

### Leadership not receiving reports

Check:
1. Leadership Slack IDs are set in `.env`
2. IDs are correct (test with a DM)
3. Tuesday 4 PM Bali time job is scheduled

## Customization

### Adjust Form Field Mapping

Edit `src/services/googleSheets.ts`:

```typescript
// Adjust column indices based on your actual form structure
const directive = row[3]?.trim() || undefined;  // Column D
const blockerResolution = row[4]?.trim() || undefined;  // Column E
```

### Change Schedule Times

Edit `src/jobs/checkinQueue.ts`:

```typescript
// Change cron patterns (format: minute hour day month weekday)
pattern: '0 17 * * 5', // Friday 5 PM Bali time
```

### Add Custom Message Variants

Edit `src/slack/checkinBlocks.ts`:

```typescript
export const WORKER_PRIMARY_MESSAGES = [
  // Add more message variants here
];
```

### Customize Status Thresholds

Edit status determination logic in `src/jobs/checkinQueue.ts`:

```typescript
const status = submissionDay <= 6 ? 'on_time' : 'late'; // Adjust threshold
```

## Health Check

Check system health:

```typescript
import { healthCheckWeeklyCheckIns } from './src/weekly-checkins-system';

const health = await healthCheckWeeklyCheckIns();
console.log(health);
```

Expected output:
```json
{
  "status": "healthy",
  "details": {
    "active_roster_count": 25,
    "database": "connected",
    "redis": "connected",
    "google_sheets_configured": true,
    "spreadsheet_id": "set"
  }
}
```

## Security Notes

1. **Service Account Key**: Keep `GOOGLE_SERVICE_ACCOUNT_KEY` secret
2. **Spreadsheet Access**: Only share with service account and admins
3. **Slack IDs**: Leadership IDs are sensitive - don't commit to Git
4. **Database**: Uses existing PostgreSQL auth from leave system

## Support

For issues or questions:
1. Check logs: `journalctl -u your-bot-service -f`
2. Check database: `psql -d leave_management -c "SELECT * FROM sheets_sync_log;"`
3. Check Redis: `redis-cli KEYS "bull:weekly-checkins:*"`
4. Review code: All files are well-documented with JSDoc comments
