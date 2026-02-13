# Weekly Check-Ins: Step-by-Step Runbook

## Pre-Flight Checklist

Before starting, ensure you have:
- [ ] PostgreSQL installed and running
- [ ] Redis installed and running
- [ ] Google account with admin access
- [ ] Slack workspace admin access
- [ ] All employee names and Slack IDs
- [ ] List of managers and their Slack IDs

---

## Step 1: Set Up Google Cloud Project

### 1.1 Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click **"Select a project"** → **"New Project"**
3. Name it: `weekly-checkins` (or your company name)
4. Click **"Create"**

### 1.2 Enable Google Sheets API

1. In the project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Sheets API"**
3. Click on it → Click **"Enable"**
4. Wait for it to activate (takes ~30 seconds)

### 1.3 Create Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in:
   - **Service account name**: `weekly-checkins-bot`
   - **Service account ID**: (auto-filled)
4. Click **"Create and Continue"**
5. **Grant this service account access**:
   - Select role: **"Editor"**
   - Click **"Continue"** → **"Done"**

### 1.4 Download Service Account Key

1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Choose **JSON** format
5. Click **"Create"**
6. **Save the downloaded file** (e.g., `service-account-key.json`)

⚠️ **Keep this file safe! It's like a password.**

### 1.5 Get Service Account Email

1. Open the downloaded JSON file
2. Find the `client_email` field
3. Copy it (looks like: `weekly-checkins-bot@project-name.iam.gserviceaccount.com`)
4. **You'll need this in Step 2.3**

---

## Step 2: Set Up Google Sheets

### 2.1 Create New Google Sheet

1. Go to https://sheets.google.com
2. Click **"Blank"** to create a new sheet
3. Rename it: **"Weekly Check-Ins"**

### 2.2 Create Three Tabs

**Tab 1: Roster**
1. Keep the first sheet, rename it to **"Roster"**
2. Add headers in row 1:
   ```
   A1: Employee Name
   B1: Employee Slack ID
   C1: Manager Name
   D1: Manager Slack ID
   E1: Team
   F1: Employee Email
   ```

**Tab 2: Worker Responses**
1. Click **"+"** at the bottom to add a new sheet
2. Rename it to **"Worker Responses"**
3. Leave it empty (Google Forms will add headers)

**Tab 3: Manager Responses**
1. Click **"+"** again to add another sheet
2. Rename it to **"Manager Responses"**
3. Leave it empty (Google Forms will add headers)

### 2.3 Share Sheet with Service Account

1. Click **"Share"** button (top right)
2. Paste the **service account email** from Step 1.5
3. Make sure role is **"Editor"**
4. **Uncheck** "Notify people"
5. Click **"Share"** or **"Send"**

### 2.4 Get Spreadsheet ID

1. Look at the URL of your Google Sheet:
   ```
   https://docs.google.com/spreadsheets/d/COPY_THIS_PART/edit
   ```
2. Copy the long ID between `/d/` and `/edit`
3. Example: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
4. **Save this - you'll need it in Step 5**

---

## Step 3: Create Google Forms

### 3.1 Create Worker Weekly Check-In Form

1. Go to https://forms.google.com
2. Click **"Blank"** to create new form
3. Title: **"Weekly Check-In"**
4. Description: **"Submit your weekly scorecard"**

**Add Questions:**

1. **Question 1** (Required):
   - Type: **Multiple choice** or **Dropdown**
   - Question: **"Your Name"**
   - Options: Add all employee names from your roster
   - Toggle **"Required"** ON

2. **Question 2-5**: Add your actual check-in questions
   - Examples:
     - "What did you accomplish this week?"
     - "What are your priorities for next week?"
     - "Any blockers or challenges?"
     - "Anything else?"

**Link to Google Sheet:**
1. Click **"Responses"** tab in the form
2. Click the Google Sheets icon (green with white cross)
3. Choose **"Select existing spreadsheet"**
4. Select your **"Weekly Check-Ins"** sheet
5. Choose **"Worker Responses"** tab
6. Click **"Create"**

**Get Form URL:**
1. Click **"Send"** button (top right)
2. Click the **link icon** (🔗)
3. Click **"Shorten URL"** if you want
4. Copy the URL (e.g., `https://forms.gle/abc123`)
5. **Save this - you'll need it in Step 5**

### 3.2 Create Manager Weekly Review Form

1. Create another **"Blank"** form
2. Title: **"Manager Weekly Review"**
3. Description: **"Review your direct reports' weekly check-ins"**

**Add Questions:**

1. **Question 1** (Required):
   - Type: **Dropdown**
   - Question: **"Your Name (Manager)"**
   - Options: Add all manager names
   - Toggle **"Required"** ON

2. **Question 2** (Required):
   - Type: **Dropdown**
   - Question: **"Employee Being Reviewed"**
   - Options: Add all employee names
   - Toggle **"Required"** ON

3. **Question 3** (Required):
   - Type: **Short answer** or **Paragraph**
   - Question: **"This Week's Directive"**
   - Description: "What should they focus on this week?"
   - Toggle **"Required"** ON

4. **Question 4** (Required):
   - Type: **Short answer** or **Paragraph**
   - Question: **"Blocker Resolution"**
   - Description: "How will you help resolve their blockers?"
   - Toggle **"Required"** ON

5. **Question 5-7**: Add any other review questions you want

**Link to Google Sheet:**
1. Click **"Responses"** tab
2. Click the Google Sheets icon
3. Choose **"Select existing spreadsheet"**
4. Select your **"Weekly Check-Ins"** sheet
5. Choose **"Manager Responses"** tab
6. Click **"Create"**

**Get Form URL:**
1. Click **"Send"** button
2. Click the link icon (🔗)
3. Copy the URL
4. **Save this - you'll need it in Step 5**

---

## Step 4: Get Slack User IDs

### 4.1 Find Your Own Slack ID (Test)

1. Open Slack
2. Click on your profile picture
3. Click **"Profile"**
4. Click **"More"** (three dots)
5. Click **"Copy member ID"**
6. Your ID looks like: `U01ABC123DEF`

### 4.2 Get All Employee Slack IDs

For each employee:
1. Click on their profile in Slack
2. Click **"More"** (three dots)
3. Click **"Copy member ID"**
4. Save in a spreadsheet or text file with their name

### 4.3 Get Manager Slack IDs

Repeat for all managers (Nadia, Axel, etc.)

### 4.4 Get Leadership Slack IDs

Get Slack IDs for:
- Gurnoor
- Sandeep
- Axel
- Emeka
- Nadia

---

## Step 5: Configure Environment

### 5.1 Prepare Service Account Key (Single Line)

1. Open the `service-account-key.json` file from Step 1.4
2. Copy the **entire contents**
3. Convert to single line (remove line breaks):
   - Mac/Linux: `cat service-account-key.json | tr -d '\n'`
   - Or use an online tool: https://www.text-utils.com/remove-line-breaks/
4. The result should be one long line like:
   ```
   {"type":"service_account","project_id":"...","private_key":"..."}
   ```
5. **Copy this single-line JSON**

### 5.2 Edit .env File

1. In your project folder, open `.env` (or create it from `.env.example`)
2. Add these new variables:

```bash
# ==========================================
# GOOGLE SHEETS CONFIGURATION
# ==========================================
# Paste the single-line JSON from Step 5.1
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Spreadsheet ID from Step 2.4
WEEKLY_CHECKINS_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

# Tab names (must match exactly)
WEEKLY_CHECKINS_ROSTER_TAB=Roster
WEEKLY_CHECKINS_WORKER_TAB=Worker Responses
WEEKLY_CHECKINS_MANAGER_TAB=Manager Responses

# Form URLs from Step 3
WORKER_CHECKIN_FORM_URL=https://forms.gle/abc123
MANAGER_REVIEW_FORM_URL=https://forms.gle/def456

# ==========================================
# LEADERSHIP SLACK IDs (from Step 4.4)
# ==========================================
GURNOOR_SLACK_ID=U01ABC123
SANDEEP_SLACK_ID=U02DEF456
AXEL_SLACK_ID=U03GHI789
EMEKA_SLACK_ID=U04JKL012
NADIA_SLACK_ID=U05MNO345
```

3. Save the file

### 5.3 Verify Existing .env Variables

Make sure these are already set (from leave system):
```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leave_management
DB_USER=postgres
DB_PASSWORD=your-password
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Step 6: Fill Roster in Google Sheet

### 6.1 Open Your Google Sheet

Go to the **"Roster"** tab

### 6.2 Add Employee Data

Fill in rows starting from row 2 (row 1 has headers):

```
A2: John Doe        B2: U01ABC123    C2: Nadia    D2: U05MNO345    E2: Engineering    F2: john@company.com
A3: Jane Smith      B3: U02DEF456    C3: Axel     D3: U03GHI789    E3: Marketing      F3: jane@company.com
A4: Bob Johnson     B4: U06PQR789    C4: Nadia    D4: U05MNO345    E4: Engineering    F4: bob@company.com
```

**Important:**
- Column A (Employee Name): **Must match exactly** what they'll select in the form
- Column B (Employee Slack ID): From Step 4.2
- Column C (Manager Name): The manager's name
- Column D (Manager Slack ID): From Step 4.3
- Column E (Team): Optional, for grouping in reports
- Column F (Email): Optional, for fallback

### 6.3 Verify Data

Double-check:
- [ ] No typos in names (they must match form dropdowns)
- [ ] All Slack IDs are correct (start with U)
- [ ] Manager Slack IDs are correct
- [ ] No empty required cells (A, B, C, D)

---

## Step 7: Set Up Database

### 7.1 Ensure PostgreSQL is Running

```bash
# Check if PostgreSQL is running
psql --version

# If not running, start it (Mac with Homebrew)
brew services start postgresql

# Or on Linux
sudo systemctl start postgresql
```

### 7.2 Ensure Redis is Running

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it (Mac with Homebrew)
brew services start redis

# Or on Linux
sudo systemctl start redis
```

### 7.3 Run Database Setup

```bash
cd /Users/macbook/Documents/Work/chatbot

# Run the setup script
bun run setup-weekly-checkins
```

**Expected output:**
```
🔧 Setting up Weekly Check-Ins database schema...

📡 Testing database connection...
✅ Connected to database at: 2026-02-11 10:30:00

📄 Reading schema from: /Users/.../database/schema.sql
🏗️  Creating tables and views...
✅ Schema executed successfully

🔍 Verifying weekly check-ins tables...
  ✅ org_roster
  ✅ weekly_checkin_tracking
  ✅ checkin_message_variants
  ✅ sheets_sync_log

🔍 Verifying views...
  ✅ current_week_pending_workers
  ✅ current_week_pending_managers
  ✅ weekly_compliance_summary

✅ Weekly Check-Ins database setup complete!
```

### 7.4 Verify Tables

```bash
# Check tables exist
psql -d leave_management -c "\dt org_roster"

# Check if roster table is empty (should be empty initially)
psql -d leave_management -c "SELECT COUNT(*) FROM org_roster;"
```

---

## Step 8: Test Configuration

### 8.1 Test Service Account Access

```bash
# Create a test script
cat > test-sheets.ts << 'EOF'
import { readRosterFromSheets, getSheetsConfigFromEnv } from './src/services/googleSheets';

async function test() {
  try {
    console.log('Testing Google Sheets access...');
    const config = getSheetsConfigFromEnv();
    console.log('Config:', config);
    
    const roster = await readRosterFromSheets(config);
    console.log(`✅ Successfully read ${roster.length} employees from roster`);
    console.log('First employee:', roster[0]);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
EOF

# Run the test
bun run test-sheets.ts

# Clean up
rm test-sheets.ts
```

**Expected output:**
```
Testing Google Sheets access...
Config: { spreadsheet_id: '1BxiM...', roster_tab: 'Roster', ... }
✅ Successfully read 3 employees from roster
First employee: {
  employee_name: 'John Doe',
  employee_slack_id: 'U01ABC123',
  manager_name: 'Nadia',
  manager_slack_id: 'U05MNO345'
}
```

### 8.2 Test Database Connection

```bash
psql -d leave_management -c "SELECT NOW();"
```

### 8.3 Test Redis Connection

```bash
redis-cli ping
```

If all three tests pass, you're ready! ✅

---

## Step 9: Start the Bot

### 9.1 Start in Development Mode (Recommended First)

```bash
cd /Users/macbook/Documents/Work/chatbot

# Start with auto-reload
bun run dev
```

**Expected output:**
```
✓ Validating environment variables...
✓ Environment validation passed!

Configuration:
  Environment: development
  ...

Starting Slack bot...
Slack bot is running!

Initializing leave management system...
Leave management system ready!

Initializing weekly check-ins system...
Database connection confirmed
Google Sheets configuration validated
  spreadsheetId: 1BxiMVs0XRA5n...
  rosterTab: Roster
  workerTab: Worker Responses
  managerTab: Manager Responses
Slack app configured for weekly check-ins
Recurring jobs scheduled
Slack handlers registered
Weekly check-ins system ready!

Bot is fully operational!
```

### 9.2 Verify Jobs Are Scheduled

Open another terminal:
```bash
# Check Redis for scheduled jobs
redis-cli KEYS "bull:weekly-checkins:*"

# Should see multiple keys like:
# bull:weekly-checkins:repeat
# bull:weekly-checkins:wait
# etc.
```

---

## Step 10: Test the System

### 10.1 Test Worker Flow (Manual Trigger)

**Option A: Manually trigger sync (in a test script)**

```bash
cat > test-sync.ts << 'EOF'
import { readRosterFromSheets, getSheetsConfigFromEnv } from './src/services/googleSheets';
import { syncRosterToDatabase, initializeWeeklyTracking, getCurrentWeekId } from './src/db/weeklyCheckins';

async function test() {
  const config = getSheetsConfigFromEnv();
  const roster = await readRosterFromSheets(config);
  await syncRosterToDatabase(roster);
  
  const weekId = getCurrentWeekId();
  await initializeWeeklyTracking(weekId);
  
  console.log('✅ Roster synced and week initialized');
  process.exit(0);
}

test();
EOF

bun run test-sync.ts
rm test-sync.ts
```

**Option B: Wait for Thursday 5 PM Bali time (automatic)**

### 10.2 Test Form Submission

1. Open the **Worker Check-In Form** URL
2. Fill it out as one of your test employees
3. Submit it
4. Check Google Sheet → Worker Responses tab → should see new row

### 10.3 Check Database Sync

```bash
# Wait a few minutes for sync, then check
psql -d leave_management -c "SELECT * FROM org_roster LIMIT 5;"

psql -d leave_management -c "SELECT * FROM weekly_checkin_tracking WHERE worker_submitted = TRUE;"
```

### 10.4 Test Slack Button

When you receive a reminder in Slack:
1. Click **"I've completed it"** button
2. Should receive confirmation message
3. Check database:
```bash
psql -d leave_management -c "SELECT employee_name, worker_submitted, worker_status FROM weekly_checkin_tracking;"
```

---

## Step 11: Monitor the System

### 11.1 Check Logs

```bash
# If running with bun run dev, logs appear in console

# For production (if using pm2)
pm2 logs slack-bot
```

### 11.2 Check Sync Status

```bash
# Check last sync
psql -d leave_management -c "SELECT * FROM sheets_sync_log ORDER BY synced_at DESC LIMIT 5;"
```

### 11.3 Check Current Week Status

```bash
# See pending workers
psql -d leave_management -c "SELECT * FROM current_week_pending_workers;"

# See pending managers
psql -d leave_management -c "SELECT * FROM current_week_pending_managers;"

# See overall compliance
psql -d leave_management -c "SELECT * FROM weekly_compliance_summary;"
```

### 11.4 Monitor Redis Jobs

```bash
# See what jobs are in the queue
redis-cli KEYS "bull:weekly-checkins:*"

# Monitor real-time activity
redis-cli MONITOR
```

---

## Troubleshooting

### Issue: "GOOGLE_SERVICE_ACCOUNT_KEY not configured"

**Solution:**
- Check `.env` file has `GOOGLE_SERVICE_ACCOUNT_KEY`
- Ensure it's a single line with no line breaks
- Ensure it's valid JSON (starts with `{` and ends with `}`)

### Issue: "Service account does not have access"

**Solution:**
- Go to Google Sheet → Share
- Make sure service account email is listed
- Role should be "Editor"

### Issue: "No employees found in roster"

**Solution:**
- Check Google Sheet → Roster tab has data in rows 2+
- Check column names match exactly (case-sensitive)
- Run test script from Step 8.1

### Issue: "Redis connection refused"

**Solution:**
```bash
brew services start redis  # Mac
sudo systemctl start redis # Linux
```

### Issue: "PostgreSQL connection refused"

**Solution:**
```bash
brew services start postgresql  # Mac
sudo systemctl start postgresql # Linux
```

### Issue: "Worker submissions not detected"

**Solution:**
- Check form is linked to correct Sheet tab
- Check employee name in form matches roster exactly
- Check timestamp is in first column of Worker Responses

### Issue: "Manager feedback not routing to workers"

**Solution:**
- Check column order in `src/services/googleSheets.ts`
- Directive should be in column 3 (index 3)
- Blocker Resolution should be in column 4 (index 4)
- Adjust if your form has different column order

---

## Production Deployment

### Option 1: Run as Background Service (pm2)

```bash
# Install pm2
npm install -g pm2

# Start bot
pm2 start slack-bot.ts --interpreter bun --name weekly-checkins-bot

# Save process list
pm2 save

# Set up auto-start on reboot
pm2 startup
```

### Option 2: Run as systemd Service (Linux)

```bash
sudo nano /etc/systemd/system/weekly-checkins-bot.service
```

Paste:
```ini
[Unit]
Description=Weekly Check-Ins Slack Bot
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/Users/macbook/Documents/Work/chatbot
ExecStart=/usr/local/bin/bun run slack-bot.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable weekly-checkins-bot
sudo systemctl start weekly-checkins-bot
sudo systemctl status weekly-checkins-bot
```

---

## Weekly Operations

Once running, the system is fully automatic:

| Day | Time (Bali) | What Happens |
|-----|-------------|--------------|
| Thu | 5:00 PM | Syncs roster, initializes week |
| Fri | 5:00 PM | Workers get reminders |
| Sat | 9:00 AM | Workers get first nudge |
| Sun | 8:00 PM | Workers get final nudge |
| Mon | 8:00 AM | Managers get reminders |
| Mon | 9:00 PM | Managers get first nudge |
| Tue | 12:00 PM | Managers get final nudge |
| Tue | 4:00 PM | Leadership gets report |

**No manual intervention needed!** 🎉

---

## Support

If you need help:
1. Check logs: `bun run dev` or `pm2 logs`
2. Check database: SQL queries above
3. Check Redis: `redis-cli MONITOR`
4. Read docs: `docs/WEEKLY_CHECKINS_SETUP.md`

---

**That's it! You're ready to run the Weekly Check-Ins system!** 🚀
