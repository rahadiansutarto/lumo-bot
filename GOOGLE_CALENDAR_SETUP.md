# Google Calendar Integration Setup

This guide walks you through setting up Google Calendar integration for your internal company bot.

## Overview

The bot uses **OAuth 2.0 per-user authentication**, which means:
- ✅ Each user authorizes with their own Google account
- ✅ Each user only sees their own calendar
- ✅ You can restrict access to company email addresses only
- ✅ Secure token storage per user

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing one)
3. Name it something like "Company Internal Bot"

## Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **Internal** (if you have Google Workspace) or **External**
   - **Internal** is recommended - only your organization's users can authorize
3. Fill in the application details:
   - **App name**: "Company Bot"
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Save and continue

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: "Bot OAuth Client"
5. **Authorized redirect URIs**: Add:
   ```
   http://localhost:3000/oauth/google/callback
   ```
   (Or your production callback URL if deploying to server)
6. Click **Create**
7. **Save the Client ID and Client Secret** - you'll need these!

## Step 5: Configure Environment Variables

Add these to your `.env` file:

```bash
# Google Calendar OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback

# Company Email Domain Restriction (Optional but recommended)
# Only users with this email domain can authorize
COMPANY_EMAIL_DOMAIN=yourcompany.com

# OAuth Server Port (Optional, defaults to 3000)
OAUTH_SERVER_PORT=3000
```

### Important: Email Domain Restriction

The `COMPANY_EMAIL_DOMAIN` setting ensures only your company employees can connect their calendars:

- If set to `yourcompany.com`, only emails like `john@yourcompany.com` can authorize
- If not set, any Google account can authorize (not recommended for internal tools)

## Step 6: Run the Bot

```bash
bun run slack-bot.ts
```

The bot will start two services:
1. **Slack bot** (Socket Mode)
2. **OAuth callback server** (Port 3000)

You should see:
```
OAuth callback server running on http://localhost:3000
Callback URL: http://localhost:3000/oauth/google/callback
Slack bot is running!
```

## Step 7: User Authorization Flow

### How Users Connect Their Calendar

1. User asks the bot a calendar question in Slack:
   ```
   @bot Do I have any meetings today?
   ```

2. Bot responds with authorization link:
   ```
   You need to connect your Google Calendar first. 
   Please visit this link to authorize:
   
   https://accounts.google.com/o/oauth2/auth?...
   
   After authorizing, try your request again.
   ```

3. User clicks the link and:
   - Signs in with their Google account (must use company email)
   - Grants calendar permissions
   - Gets redirected to success page

4. User can now ask calendar questions:
   ```
   @bot Do I have any meetings today?
   @bot What's on my calendar this week?
   @bot Create a meeting tomorrow at 2pm with john@company.com
   ```

## Usage Examples

### Check Today's Meetings

```
@bot Do I have any meetings today?
@bot What's on my schedule today?
@bot Show me today's calendar
```

Bot will list all events with times, locations, and attendees.

### Check Specific Time Range

```
@bot What meetings do I have this week?
@bot Show my calendar for tomorrow
@bot Any meetings next Monday?
```

### Create Meetings

```
@bot Create a meeting tomorrow at 2pm titled "Project Review" with sarah@company.com
@bot Schedule a 30-minute standup every day at 9am
```

### Search Events

```
@bot Find all meetings with "budget" in the title
@bot When is my next meeting with John?
```

## How It Works Internally

### User Identity Flow

```
User in Slack → Slack User ID → Stored OAuth Tokens → User's Google Calendar
```

1. **Slack provides user identity**: When a user messages the bot, Slack provides their `user_id`
2. **Bot looks up tokens**: The bot retrieves that user's Google OAuth tokens from storage
3. **Personalized access**: Bot uses those tokens to access only that user's calendar
4. **Response**: Bot returns personalized calendar data

### Email Domain Verification

The bot verifies the email domain during OAuth:

```typescript
// In src/auth/googleCalendar.ts
const email = "john@yourcompany.com";
const emailDomain = email.split('@')[1]; // "yourcompany.com"

if (emailDomain !== config.allowedEmailDomain) {
  throw new Error("Only yourcompany.com emails allowed");
}
```

### Token Storage

Currently uses **in-memory storage** (for development):
- ✅ Fast
- ❌ Lost on restart
- ❌ Doesn't scale across multiple bot instances

**For production**, replace the in-memory Map in `src/auth/googleCalendar.ts` with:
- Database (PostgreSQL, MongoDB, etc.)
- Redis for distributed caching
- Encrypted file storage

### Security Features

1. **Per-user isolation**: Each user can only access their own calendar
2. **Email domain restriction**: Only company emails can authorize
3. **Token refresh**: Expired tokens are automatically refreshed
4. **Secure scopes**: Only calendar and email scopes are requested

## Troubleshooting

### "Calendar not connected" Error

**Solution**: User needs to authorize. Bot will provide authorization link.

### "Only yourcompany.com emails allowed" Error

**Solution**: User tried to authorize with personal Gmail. They must use company email.

### OAuth callback not working

**Check**:
1. OAuth server is running (you should see "OAuth callback server running")
2. Redirect URI in Google Cloud Console matches `.env` file
3. Port 3000 is not blocked by firewall

### Tokens lost on bot restart

**Solution**: Implement persistent storage (database) in `src/auth/googleCalendar.ts`

## Production Deployment Checklist

- [ ] Use **Internal** OAuth consent screen (Google Workspace only)
- [ ] Set `COMPANY_EMAIL_DOMAIN` to restrict access
- [ ] Replace in-memory token storage with database
- [ ] Use HTTPS redirect URI (not http://localhost)
- [ ] Add your production callback URL to Google Cloud Console
- [ ] Encrypt stored tokens at rest
- [ ] Implement token revocation on user offboarding
- [ ] Add monitoring and logging
- [ ] Set up rate limiting for API calls

## File Structure

```
src/
├── auth/
│   └── googleCalendar.ts      # OAuth management, token storage
├── tools/
│   └── googleCalendar.ts      # Calendar tool implementation
├── types/
│   └── googleCalendar.ts      # TypeScript types
└── oauth-server.ts            # OAuth callback HTTP server
```

## API Reference

### Available Calendar Actions

The bot supports these calendar operations:

#### List Events
```typescript
{
  action: "list",
  timeMin: "2024-01-20T00:00:00Z",  // Optional
  timeMax: "2024-01-27T23:59:59Z",  // Optional
  maxResults: 10,                    // Optional
  query: "standup"                   // Optional search
}
```

#### Create Event
```typescript
{
  action: "create",
  event: {
    summary: "Team Meeting",
    description: "Weekly sync",
    startDateTime: "2024-01-22T14:00:00Z",
    endDateTime: "2024-01-22T15:00:00Z",
    attendees: ["john@company.com"],
    location: "Conference Room A"
  }
}
```

#### Get Event
```typescript
{
  action: "get",
  eventId: "event_id_here"
}
```

#### Update Event
```typescript
{
  action: "update",
  eventId: "event_id_here",
  event: { /* same as create */ }
}
```

#### Delete Event
```typescript
{
  action: "delete",
  eventId: "event_id_here"
}
```

## Support

For questions or issues:
1. Check the troubleshooting section
2. Review Google Cloud Console OAuth settings
3. Check bot logs for error messages
4. Verify environment variables are set correctly
