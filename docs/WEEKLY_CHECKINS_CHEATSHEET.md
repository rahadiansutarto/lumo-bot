# Weekly Check-Ins: Quick Cheat Sheet

## Setup (One Time)

### 1. Google Cloud
```bash
1. console.cloud.google.com → New Project
2. Enable "Google Sheets API"
3. Create Service Account → Download JSON key
4. Copy the "client_email" from JSON
```

### 2. Google Sheets
```bash
1. Create new sheet: "Weekly Check-Ins"
2. 3 tabs: "Roster", "Worker Responses", "Manager Responses"
3. Share with service account email (Editor access)
4. Copy spreadsheet ID from URL
```

### 3. Google Forms
```bash
1. Create "Worker Check-In" form → Link to "Worker Responses" tab
2. Create "Manager Review" form → Link to "Manager Responses" tab
3. Copy both form URLs
```

### 4. Configure .env
```bash
# Convert JSON key to single line
cat service-account-key.json | tr -d '\n'

# Add to .env:
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
WEEKLY_CHECKINS_SPREADSHEET_ID=your-sheet-id
WORKER_CHECKIN_FORM_URL=https://forms.gle/abc123
MANAGER_REVIEW_FORM_URL=https://forms.gle/def456
GURNOOR_SLACK_ID=U111111111
SANDEEP_SLACK_ID=U222222222
AXEL_SLACK_ID=U333333333
EMEKA_SLACK_ID=U444444444
NADIA_SLACK_ID=U555555555
```

### 5. Fill Roster
In Google Sheet → Roster tab:
```
Row 2: John Doe | U01ABC123 | Nadia | U05MNO345 | Engineering | john@company.com
Row 3: Jane Smith | U02DEF456 | Axel | U03GHI789 | Marketing | jane@company.com
...
```

### 6. Setup Database
```bash
cd /Users/macbook/Documents/Work/chatbot
bun run setup-weekly-checkins
```

### 7. Start Bot
```bash
bun run dev
```

---

## Commands

### Start Bot
```bash
bun run dev           # Development (with auto-reload)
bun run start         # Production
```

### Database
```bash
# Check roster
psql -d leave_management -c "SELECT * FROM org_roster;"

# Check current week
psql -d leave_management -c "SELECT * FROM weekly_checkin_tracking;"

# Check pending workers
psql -d leave_management -c "SELECT * FROM current_week_pending_workers;"

# Check pending managers
psql -d leave_management -c "SELECT * FROM current_week_pending_managers;"

# Check sync logs
psql -d leave_management -c "SELECT * FROM sheets_sync_log ORDER BY synced_at DESC LIMIT 5;"

# Check compliance
psql -d leave_management -c "SELECT * FROM weekly_compliance_summary;"
```

### Redis
```bash
# Check connection
redis-cli ping

# Check jobs
redis-cli KEYS "bull:weekly-checkins:*"

# Monitor activity
redis-cli MONITOR
```

### Test Sync
```bash
# Create test script
cat > test.ts << 'EOF'
import { readRosterFromSheets, getSheetsConfigFromEnv } from './src/services/googleSheets';
import { syncRosterToDatabase, initializeWeeklyTracking, getCurrentWeekId } from './src/db/weeklyCheckins';

const config = getSheetsConfigFromEnv();
const roster = await readRosterFromSheets(config);
await syncRosterToDatabase(roster);
await initializeWeeklyTracking(getCurrentWeekId());
console.log('✅ Synced');
process.exit(0);
EOF

bun run test.ts
rm test.ts
```

---

## Schedule (Bali Time)

```
Thu 5PM  → Sync roster
Fri 5PM  → Worker reminder
Sat 9AM  → Worker nudge
Sun 8PM  → Worker final nudge
Mon 8AM  → Manager reminder
Mon 9PM  → Manager nudge
Tue 12PM → Manager final nudge
Tue 4PM  → Leadership report
```

---

## Troubleshooting

### No reminders?
```bash
redis-cli ping                          # Check Redis
redis-cli KEYS "bull:weekly-checkins:*" # Check jobs
```

### Roster not syncing?
```bash
# Check service account has sheet access
# Check .env has correct spreadsheet ID
psql -d leave_management -c "SELECT * FROM sheets_sync_log;"
```

### Submissions not detected?
```bash
# Check employee names match roster exactly
# Check form writes to correct tab
psql -d leave_management -c "SELECT * FROM weekly_checkin_tracking;"
```

### Manager feedback not routing?
```bash
# Check column indices in src/services/googleSheets.ts
# Directive = row[3], Blocker = row[4]
```

---

## Quick Health Check

```bash
# All must return success
redis-cli ping                                              # → PONG
psql -d leave_management -c "SELECT 1;"                     # → 1
psql -d leave_management -c "SELECT COUNT(*) FROM org_roster;" # → (number > 0)
```

---

## Production (pm2)

```bash
# Install
npm install -g pm2

# Start
pm2 start slack-bot.ts --interpreter bun --name weekly-checkins

# Monitor
pm2 logs weekly-checkins
pm2 status

# Auto-start on reboot
pm2 save
pm2 startup
```

---

## File Locations

```
.env                                      # Configuration
database/schema.sql                        # Database schema
src/services/googleSheets.ts              # Column indices (if forms change)
src/jobs/checkinQueue.ts                  # Schedule (cron patterns)
src/slack/checkinBlocks.ts                # Message variants
docs/WEEKLY_CHECKINS_RUNBOOK.md           # Full step-by-step
```

---

## Get Slack ID

```bash
1. Open Slack
2. Click user profile
3. Click "More" (...)
4. Click "Copy member ID"
```

---

## Single-Line JSON

```bash
# Mac/Linux
cat service-account-key.json | tr -d '\n'

# Or online: https://www.text-utils.com/remove-line-breaks/
```

---

That's it! 🎉
