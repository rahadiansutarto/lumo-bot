# Weekly Check-Ins: Quick Start

## TL;DR

Susan automates weekly check-ins: sends Google Form links via Slack → tracks completion → nudges defaulters → routes manager feedback → sends compliance report.

## 5-Minute Setup

### 1. Create Google Service Account
```bash
# 1. Go to: https://console.cloud.google.com
# 2. Enable Google Sheets API
# 3. Create Service Account
# 4. Download JSON key
```

### 2. Create Google Sheet with 3 tabs:

**Roster** (share with service account):
```
Employee Name | Employee Slack ID | Manager Name | Manager Slack ID
John Doe      | U01ABC123        | Nadia        | U02DEF456
```

**Worker Responses** (from Google Form)  
**Manager Responses** (from Google Form)

### 3. Create 2 Google Forms:
- Worker Weekly Check-In → links to Worker Responses
- Manager Weekly Review → links to Manager Responses

### 4. Add to `.env`:
```bash
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
WEEKLY_CHECKINS_SPREADSHEET_ID=your-sheet-id
WORKER_CHECKIN_FORM_URL=https://docs.google.com/forms/...
MANAGER_REVIEW_FORM_URL=https://docs.google.com/forms/...
GURNOOR_SLACK_ID=U111111111
SANDEEP_SLACK_ID=U222222222
AXEL_SLACK_ID=U333333333
EMEKA_SLACK_ID=U444444444
NADIA_SLACK_ID=U555555555
```

### 5. Run Setup:
```bash
bun run setup-weekly-checkins
bun run start
```

## Weekly Flow

### Timeline (Bali Time)
```
Thu 5PM  → Sync roster
Fri 5PM  → Workers get reminder
Sat 9AM  → Nudge workers
Sun 8PM  → Final worker nudge
Mon 8AM  → Managers get reminder
Mon 9PM  → Nudge managers
Tue 12PM → Final manager nudge
Tue 4PM  → Leadership gets compliance report
```

### What Workers See

**Friday:**
```
🚨 Weekly Check-In time, Calvinballer!
Drop your Weekly Scorecard before the deadline...
⏳ Deadline: Saturday EOD

[👉 Open Weekly Check-In Form]  [✅ I've completed it]
```

**After clicking "Completed":**
```
✅ Confirmed. Weekly check-in received.
Your name has been removed from the Wall of Shame watchlist.
```

**After manager reviews:**
```
📬 Weekly calibration received.

This Week's Directive:
"Focus on customer onboarding flow"

Blocker Resolution:
"Design team will provide mockups by Wednesday"

Alright. New week. Clean slate. Let's move.
```

### What Managers See

**Monday:**
```
Good morning ☕
Your Calvinballers have submitted their weekly scorecards.
Time to review and give direction...
🎯 Deadline: Monday, 9 PM Bali Time
Direct Reports Submitted: 5

[👉 Open Manager Review Form]  [✅ I've completed my reviews]
```

### What Leadership Sees

**Tuesday 4 PM:**
```
📊 Weekly Check-In Compliance Report — Calvinball Engine Status

📌 Workers Report
• Workers Completed (On Time): 23 / 25
• Workers Late: 1
• Workers Missing: 1

📌 Managers Report
• Managers Completed Reviews (On Time): 4 / 5
• Managers Late: 1
• Managers Missing: 0

⚠️ Wall of Shame Watchlist (Repeat Defaulters):
• @john_doe (worker): Missed 2 weeks
```

## Key Features

✅ **Automatic Sync** - Reads from Google Sheets, no manual updates  
✅ **Smart Routing** - Manager feedback goes only to correct worker  
✅ **Message Rotation** - Susan has 30+ message variants for personality  
✅ **Status Tracking** - On time / Late / Missed with full audit trail  
✅ **Compliance Reports** - Leadership sees who's disciplined vs. who's not  
✅ **Wall of Shame** - Repeat defaulters get flagged (2+ consecutive misses)

## Architecture

```
Google Forms → Google Sheets → Susan (Bot) → Slack DMs
                    ↓
              PostgreSQL (tracking)
                    ↓
              BullMQ + Redis (scheduling)
```

## File Structure

```
src/
├── types/weeklyCheckins.ts           # TypeScript types
├── db/weeklyCheckins.ts              # Database queries
├── services/googleSheets.ts          # Google Sheets API
├── slack/
│   ├── checkinBlocks.ts              # All 30+ message variants
│   └── checkinHandlers.ts            # Button click handlers
├── jobs/checkinQueue.ts              # BullMQ scheduled jobs
└── weekly-checkins-system.ts         # Main init (already in slack-bot.ts)
```

## Common Issues

**"No reminders sent"**
→ Check Redis: `redis-cli ping`  
→ Check form URLs in `.env`

**"Roster not syncing"**
→ Share sheet with service account email  
→ Check `GOOGLE_SERVICE_ACCOUNT_KEY` is single-line JSON

**"Worker submissions not detected"**
→ Check form column order (Timestamp, Employee Name, ...)  
→ Employee names must match roster exactly

**"Manager feedback not routing"**
→ Adjust column indices in `src/services/googleSheets.ts`:
```typescript
const directive = row[3]?.trim();        // Column D
const blockerResolution = row[4]?.trim(); // Column E
```

## Testing

```bash
# Check database
psql -d leave_management -c "SELECT * FROM org_roster;"

# Check sync logs
psql -d leave_management -c "SELECT * FROM sheets_sync_log ORDER BY synced_at DESC LIMIT 5;"

# Check current week tracking
psql -d leave_management -c "SELECT * FROM current_week_pending_workers;"

# Check Redis jobs
redis-cli KEYS "bull:weekly-checkins:*"
```

## Customization

### Change Schedule
Edit `src/jobs/checkinQueue.ts`:
```typescript
pattern: '0 17 * * 5', // Cron: Friday 5 PM Bali time
```

### Add Messages
Edit `src/slack/checkinBlocks.ts`:
```typescript
export const WORKER_PRIMARY_MESSAGES = [
  { id: 'worker_primary_5', text: 'Your new message here...' },
];
```

### Adjust Status Logic
Edit `src/jobs/checkinQueue.ts`:
```typescript
const status = submissionDay <= 6 ? 'on_time' : 'late';
```

## Full Documentation

See [WEEKLY_CHECKINS_SETUP.md](./WEEKLY_CHECKINS_SETUP.md) for:
- Detailed architecture
- Step-by-step setup
- Manual operations
- Troubleshooting guide
- Security notes

## Support

1. Check logs: Bot console output
2. Check DB: `sheets_sync_log` table
3. Check Redis: `redis-cli MONITOR`
4. Read code: All files have JSDoc comments

---

**Built with:** Bun + TypeScript + @slack/bolt + BullMQ + PostgreSQL + Google Sheets API
