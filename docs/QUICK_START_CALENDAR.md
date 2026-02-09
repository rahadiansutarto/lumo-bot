# Quick Start: Google Calendar Integration

## TL;DR Setup (5 minutes)

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "Google Calendar API"
3. OAuth consent screen → Choose "Internal" → Add calendar scopes
4. Create credentials → OAuth 2.0 Client ID → Web application
5. Add redirect URI: `http://localhost:3000/oauth/google/callback`
6. Copy Client ID and Secret

### 2. Add to `.env`

```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
COMPANY_EMAIL_DOMAIN=yourcompany.com  # Restricts to company emails only
```

### 3. Start the Bot

```bash
bun run slack-bot.ts
```

You'll see:
```
OAuth callback server running on http://localhost:3000
Slack bot is running!
```

### 4. Users Connect Their Calendar

**In Slack:**
```
User: @bot Do I have any meetings today?

Bot: You need to connect your Google Calendar first. 
     Click here to authorize: https://accounts.google.com/o/oauth2/...

User: [clicks link, authorizes with company email]

User: @bot Do I have any meetings today?

Bot: Found 2 events:

     📅 Team Standup
        Time: Jan 20, 2024, 9:00 AM (30 minutes)
        Location: Zoom
        Attendees: team@company.com
     
     📅 Client Review
        Time: Jan 20, 2024, 2:00 PM (60 minutes)
        Attendees: john@company.com, client@external.com
```

## How It Works

### User Identity & Privacy

Each user sees **only their own calendar**:

```
Slack User "John" → John's Google Account → John's Calendar
Slack User "Sarah" → Sarah's Google Account → Sarah's Calendar
```

### Email Restriction

Setting `COMPANY_EMAIL_DOMAIN=yourcompany.com` means:
- ✅ `john@yourcompany.com` - Allowed
- ❌ `john@gmail.com` - Blocked
- ❌ `john@othercompany.com` - Blocked

### What Users Can Do

**Check meetings:**
- "Do I have any meetings today?"
- "What's on my calendar this week?"
- "When is my next meeting?"

**Create meetings:**
- "Create a meeting tomorrow at 2pm with sarah@company.com titled Project Review"
- "Schedule a 1-hour sync with the team next Monday at 10am"

**Search:**
- "Find all meetings about the budget"
- "When is my next 1:1 with my manager?"

## Next Steps

- See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for full documentation
- For production: Replace in-memory token storage with database
- Add more calendar features as needed

## Production Note

⚠️ Current implementation uses **in-memory token storage** (tokens lost on restart).

For production, update `src/auth/googleCalendar.ts` to use:
- PostgreSQL
- MongoDB  
- Redis
- Or any persistent storage

The interface is already defined - just swap the `Map` with your database calls.
