# Weekly Check-Ins System 🚨

> **Susan enforces a weekly execution ritual** by distributing Google Form links via Slack, tracking completion automatically via Google Sheets, nudging defaulters in Calvinball style, routing submissions to the correct manager, delivering manager directives back to workers, and generating a weekly compliance report for leadership.

## Quick Links

- 🚀 **[RUNBOOK](./docs/WEEKLY_CHECKINS_RUNBOOK.md)** - **START HERE!** Complete step-by-step guide
- ⚡ [Cheat Sheet](./docs/WEEKLY_CHECKINS_CHEATSHEET.md) - Quick commands reference
- 📖 [Setup Guide](./docs/WEEKLY_CHECKINS_SETUP.md) - Detailed setup instructions
- 🎯 [Quick Start](./docs/WEEKLY_CHECKINS_QUICKSTART.md) - 5-minute overview
- 🔧 [Implementation Details](./docs/WEEKLY_CHECKINS_IMPLEMENTATION.md) - Technical documentation

## What It Does

### For Workers
- **Friday 5 PM**: Get weekly check-in reminder via Slack DM
- **Saturday/Sunday**: Nudges if not completed (with humor)
- **Monday**: Receive manager's directive + blocker resolution

### For Managers
- **Monday 8 AM**: Get review reminder with direct reports count
- **Monday/Tuesday**: Nudges if not completed
- **Automatic**: Reviews route to workers automatically

### For Leadership
- **Tuesday 4 PM**: Weekly compliance report
  - Worker completion stats (on time / late / missed)
  - Manager completion stats
  - Wall of Shame (repeat defaulters)

## Architecture

```
Google Forms → Google Sheets → Susan Bot → Slack DMs
                    ↓
              PostgreSQL (tracking)
                    ↓
              BullMQ + Redis (scheduling)
```

**Tech Stack:**
- Bun + TypeScript
- @slack/bolt
- PostgreSQL + BullMQ + Redis
- Google Sheets API

## Quick Setup

### 1. Prerequisites
- Google Service Account with Sheets API access
- Google Sheet with 3 tabs (Roster, Worker Responses, Manager Responses)
- 2 Google Forms linked to the sheet
- PostgreSQL + Redis (already set up for leave system)

### 2. Configure
Add to `.env`:
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

### 3. Setup Database
```bash
bun run setup-weekly-checkins
```

### 4. Start Bot
```bash
bun run start
```

The system automatically:
- Syncs roster from Google Sheets (Thu 5 PM)
- Sends reminders on schedule
- Tracks completion
- Routes feedback
- Sends leadership reports

## Weekly Schedule (Bali Time)

| Day | Time | Action |
|-----|------|--------|
| Thu | 5 PM | Sync roster, initialize week |
| Fri | 5 PM | Worker reminder |
| Sat | 9 AM | Worker nudge |
| Sun | 8 PM | Worker final nudge |
| Mon | 8 AM | Manager reminder |
| Mon | 9 PM | Manager nudge |
| Tue | 12 PM | Manager final nudge |
| **Tue** | **4 PM** | **Leadership compliance report** |

## Key Features

✅ **Automatic Sync** - Reads roster and submissions from Google Sheets  
✅ **Smart Routing** - Manager feedback goes only to correct worker  
✅ **30+ Message Variants** - Susan has personality (Calvinball style)  
✅ **Status Tracking** - On time / Late / Missed with audit trail  
✅ **Compliance Reports** - Leadership sees who's disciplined  
✅ **Wall of Shame** - Flags repeat defaulters (2+ consecutive misses)  
✅ **Production Ready** - Error handling, retries, logging  

## Files Added

```
src/
├── types/weeklyCheckins.ts           # TypeScript types
├── db/weeklyCheckins.ts              # Database operations
├── services/googleSheets.ts          # Google Sheets integration
├── slack/
│   ├── checkinBlocks.ts              # 30+ message variants
│   └── checkinHandlers.ts            # Button handlers
├── jobs/checkinQueue.ts              # BullMQ scheduled jobs
└── weekly-checkins-system.ts         # Main initialization

scripts/setup-weekly-checkins-db.ts   # Database setup
database/schema.sql                    # Updated with new tables

docs/
├── WEEKLY_CHECKINS_SETUP.md          # Full setup guide
├── WEEKLY_CHECKINS_QUICKSTART.md     # Quick reference
└── WEEKLY_CHECKINS_IMPLEMENTATION.md # Technical docs
```

**Total:** ~2,250 lines of production code

## Example Messages

### Worker Gets (Friday):
```
🚨 Weekly Check-In time, Calvinballer!
Drop your Weekly Scorecard before the deadline.

⏳ Deadline: Saturday EOD

[👉 Open Weekly Check-In Form]  [✅ I've completed it]
```

### Manager Gets (Monday):
```
Good morning ☕
Your Calvinballers have submitted their weekly scorecards.
Time to review and give direction...

🎯 Deadline: Monday, 9 PM Bali Time
Direct Reports Submitted: 5

[👉 Open Manager Review Form]  [✅ I've completed my reviews]
```

### Leadership Gets (Tuesday):
```
📊 Weekly Check-In Compliance Report

📌 Workers: 23/25 on time, 1 late, 1 missed
📌 Managers: 4/5 on time, 1 late, 0 missed

⚠️ Wall of Shame:
• @john_doe (worker): Missed 2 weeks
```

## Health Check

```bash
# Check system health
bun run --eval "
import { healthCheckWeeklyCheckIns } from './src/weekly-checkins-system';
const h = await healthCheckWeeklyCheckIns();
console.log(h);
"
```

## Common Issues

**No reminders?**  
→ Check Redis: `redis-cli ping`  
→ Check form URLs in `.env`

**Roster not syncing?**  
→ Share sheet with service account email  
→ Check `GOOGLE_SERVICE_ACCOUNT_KEY`

**Submissions not detected?**  
→ Employee names must match roster exactly  
→ Check `sheets_sync_log` table

## Customization

### Change Schedule
```typescript
// src/jobs/checkinQueue.ts
pattern: '0 17 * * 5', // Cron: Friday 5 PM Bali
```

### Add Messages
```typescript
// src/slack/checkinBlocks.ts
export const WORKER_PRIMARY_MESSAGES = [
  { id: '...', text: 'Your message...' },
];
```

### Adjust Form Fields
```typescript
// src/services/googleSheets.ts
const directive = row[3]?.trim();        // Column D
const blockerResolution = row[4]?.trim(); // Column E
```

## Testing

```bash
# Check database
psql -d leave_management -c "SELECT * FROM org_roster;"

# Check current week
psql -d leave_management -c "SELECT * FROM current_week_pending_workers;"

# Check sync logs
psql -d leave_management -c "SELECT * FROM sheets_sync_log;"

# Check Redis jobs
redis-cli KEYS "bull:weekly-checkins:*"
```

## Documentation

- **[WEEKLY_CHECKINS_SETUP.md](./docs/WEEKLY_CHECKINS_SETUP.md)** - Step-by-step setup, architecture, troubleshooting
- **[WEEKLY_CHECKINS_QUICKSTART.md](./docs/WEEKLY_CHECKINS_QUICKSTART.md)** - Fast reference, examples, testing
- **[WEEKLY_CHECKINS_IMPLEMENTATION.md](./docs/WEEKLY_CHECKINS_IMPLEMENTATION.md)** - Technical details, file structure, code

## Support

1. **Logs**: Check bot console output
2. **Database**: `SELECT * FROM sheets_sync_log;`
3. **Redis**: `redis-cli MONITOR`
4. **Code**: All files have JSDoc comments

---

**Status**: ✅ Production Ready  
**Code**: 2,250 lines, fully typed, no linter errors  
**Tests**: Manual testing checklist in setup guide  
**Integration**: Already wired into `slack-bot.ts`  

Built with the same architecture as the leave management system.
