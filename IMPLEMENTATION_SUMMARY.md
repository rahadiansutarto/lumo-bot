# Google Calendar Integration - Implementation Summary

## What Was Built

A complete Google Calendar integration system for your internal company bot with:

✅ **Per-user authentication** - Each user accesses only their own calendar  
✅ **Company email restriction** - Only users with company email can authorize  
✅ **OAuth 2.0 flow** - Secure Google authentication  
✅ **Personalized responses** - Bot knows which user is asking  
✅ **Full calendar operations** - List, create, update, delete events  
✅ **Slack integration** - Works seamlessly in channels and DMs  

## Files Created/Modified

### New Files Created

1. **`src/types/googleCalendar.ts`**
   - TypeScript types for calendar events, OAuth tokens, tool parameters
   - Defines data structures used throughout the system

2. **`src/auth/googleCalendar.ts`**
   - OAuth 2.0 management
   - Token storage and refresh
   - Email domain verification
   - User authentication state

3. **`src/tools/googleCalendar.ts`**
   - Calendar tool implementation
   - List, create, get, update, delete events
   - Integration with orchestrator

4. **`src/oauth-server.ts`**
   - HTTP server for OAuth callbacks
   - Handles authorization redirects
   - Provides user-friendly success/error pages

5. **Documentation**
   - `GOOGLE_CALENDAR_SETUP.md` - Complete setup guide
   - `QUICK_START_CALENDAR.md` - 5-minute quickstart
   - `EXAMPLE_USAGE.md` - Real-world usage scenarios
   - `IMPLEMENTATION_SUMMARY.md` - This file

6. **`test-calendar.ts`**
   - Test file demonstrating tool usage

### Modified Files

1. **`src/tools/index.ts`**
   - Added `googleCalendar` to tool registry

2. **`src/orchestrator.ts`**
   - Added support for passing `userId` and `channelId` to tools
   - Tools now receive user context for personalized access

3. **`slack-bot.ts`**
   - Updated to pass user IDs to orchestrator
   - Added `/connect-calendar` slash command
   - Started OAuth callback server

4. **`README.md`**
   - Updated with calendar features
   - Added tool documentation
   - Improved structure and examples

5. **`package.json`**
   - Added `googleapis` dependency

## How It Works

### Architecture Flow

```
┌─────────────┐
│ Slack User  │
└──────┬──────┘
       │ "Do I have meetings today?"
       │ (includes Slack user_id)
       ▼
┌─────────────────────┐
│   Slack Bot         │
│  (slack-bot.ts)     │
└──────┬──────────────┘
       │ Passes message + userId
       ▼
┌─────────────────────┐
│   Orchestrator      │
│ (orchestrator.ts)   │
└──────┬──────────────┘
       │ Detects calendar query
       │ Calls googleCalendar tool with userId
       ▼
┌──────────────────────┐
│ Google Calendar Tool │
│(tools/googleCalendar)│
└──────┬───────────────┘
       │ Checks if user authenticated
       │ userId → OAuth tokens lookup
       ▼
┌──────────────────────┐
│   Auth Manager       │
│(auth/googleCalendar) │
└──────┬───────────────┘
       │ Returns user's OAuth tokens
       ▼
┌──────────────────────┐
│  Google Calendar API │
│  (googleapis)        │
└──────┬───────────────┘
       │ User's calendar data
       ▼
┌──────────────────────┐
│   Response to User   │
│   (personalized)     │
└──────────────────────┘
```

### OAuth Authentication Flow

```
1. User asks calendar question
   ↓
2. Bot checks: Is user authenticated?
   ↓
3. NO → Generate auth URL with userId in state
   ↓
4. User clicks URL → Google login
   ↓
5. User grants permissions (calendar access)
   ↓
6. Google redirects to: http://localhost:3000/oauth/google/callback
   ↓
7. OAuth server receives:
   - code (authorization code)
   - state (userId from step 3)
   ↓
8. Exchange code for tokens (access + refresh)
   ↓
9. Verify email domain matches company
   ↓
10. Store tokens mapped to userId
   ↓
11. User asks again → Bot uses stored tokens → Success!
```

## Key Features Implemented

### 1. User Identity Management

**Problem**: How does the bot know which user is asking?

**Solution**: 
- Slack provides `user_id` with every message
- Orchestrator passes `userId` to all tools
- Tools use `userId` to lookup user-specific credentials

```typescript
// In slack-bot.ts
const userId = event.user;
await orchestrate(message, { userId });

// In googleCalendar tool
const auth = await getAuthenticatedClient(userId);
// Uses only THIS user's tokens
```

### 2. Email Domain Restriction

**Problem**: How to ensure only company employees can connect calendars?

**Solution**:
- Environment variable: `COMPANY_EMAIL_DOMAIN=yourcompany.com`
- During OAuth, check email domain before storing tokens
- Reject non-company emails with clear error message

```typescript
const email = "john@external.com";
const domain = email.split('@')[1];
if (domain !== "yourcompany.com") {
  throw new Error("Only yourcompany.com emails allowed");
}
```

### 3. Per-User Calendar Access

**Problem**: How to ensure users only see their own calendar?

**Solution**:
- OAuth tokens stored per Slack user ID
- Each user authorizes with their own Google account
- Tool retrieves tokens based on requesting user's ID

```typescript
// User Sarah (ID: U111)
storeUserTokens("U111", "sarah@company.com", sarahTokens);

// User John (ID: U222)
storeUserTokens("U222", "john@company.com", johnTokens);

// When Sarah asks → uses U111 tokens → sees Sarah's calendar
// When John asks → uses U222 tokens → sees John's calendar
```

### 4. Automatic Token Refresh

**Problem**: OAuth tokens expire after ~1 hour

**Solution**:
- Check token expiry before each API call
- Automatically refresh if expired using refresh token
- Update stored tokens with new ones

```typescript
if (tokens.expiry_date < Date.now()) {
  const newTokens = await oauth2Client.refreshAccessToken();
  storeUserTokens(userId, email, newTokens);
}
```

### 5. Natural Language Understanding

**Problem**: Users ask in different ways

**Solution**:
- Claude interprets natural language
- Converts to structured tool calls
- Handles various phrasings:
  - "Do I have meetings today?"
  - "What's on my schedule?"
  - "Am I free at 3pm?"
  - "Show my calendar"

## Security Considerations

### ✅ Implemented

1. **User Isolation** - Each user's tokens stored separately
2. **Email Verification** - Domain checking during auth
3. **Token Expiry Handling** - Automatic refresh
4. **Minimal Scopes** - Only calendar and email access
5. **OAuth 2.0** - Industry standard authentication

### ⚠️ For Production

1. **Token Encryption** - Current: plain text storage
   - **TODO**: Encrypt tokens at rest using AES-256
   
2. **Database Storage** - Current: in-memory Map
   - **TODO**: Move to PostgreSQL/MongoDB
   - **Why**: Tokens lost on restart, doesn't scale
   
3. **HTTPS** - Current: http://localhost
   - **TODO**: Use HTTPS callback URL in production
   
4. **Rate Limiting** - Not implemented
   - **TODO**: Prevent API abuse
   
5. **Audit Logging** - Basic console logs
   - **TODO**: Structured logging with user actions

## Current Limitations

### Development vs Production

| Feature | Current (Dev) | Needed for Production |
|---------|---------------|----------------------|
| Token Storage | In-memory Map | Database (PostgreSQL) |
| Encryption | None | AES-256 for tokens |
| OAuth Callback | http://localhost | HTTPS with domain |
| Persistence | Lost on restart | Permanent storage |
| Scaling | Single instance | Multi-instance ready |
| Logging | Console | Structured logs |

### Token Storage Implementation

**Current (development):**
```typescript
// In src/auth/googleCalendar.ts
const userTokenStore = new Map<string, UserCalendarAuth>();
```

**For production, replace with database:**
```typescript
// PostgreSQL example
async function storeUserTokens(userId: string, email: string, tokens: GoogleOAuthTokens) {
  await db.query(`
    INSERT INTO user_calendar_auth (user_id, email, tokens, authorized_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id) DO UPDATE SET tokens = $3
  `, [userId, email, encryptTokens(tokens)]);
}

async function getUserTokens(userId: string): Promise<UserCalendarAuth | null> {
  const result = await db.query(
    'SELECT * FROM user_calendar_auth WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] ? {
    ...result.rows[0],
    tokens: decryptTokens(result.rows[0].tokens)
  } : null;
}
```

## Environment Variables Required

```bash
# Required for Google Calendar
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback

# Highly Recommended
COMPANY_EMAIL_DOMAIN=yourcompany.com

# Optional
OAUTH_SERVER_PORT=3000  # Default is 3000
```

## Testing the Implementation

### Quick Test

1. **Start the bot:**
   ```bash
   bun run slack-bot.ts
   ```

2. **In Slack, send:**
   ```
   @bot Do I have any meetings today?
   ```

3. **Bot responds with auth link**

4. **Click link, authorize with company email**

5. **Ask again:**
   ```
   @bot Do I have any meetings today?
   ```

6. **Bot shows your calendar events**

### Test Script

Run the test file:
```bash
bun run test-calendar.ts
```

This shows what happens when a non-authenticated user tries to access calendar.

## Usage Statistics

### What Users Can Do

| Feature | Command Example |
|---------|----------------|
| Check today | "Do I have meetings today?" |
| Check range | "What's my schedule this week?" |
| Create event | "Create meeting tomorrow 2pm with john@company.com" |
| Search | "Find meetings about budget" |
| Get link | `/connect-calendar` |

### Expected Tool Calls

For a typical user session:

1. **First time**: 
   - `googleCalendar` called → returns auth URL
   - User authorizes
   - `googleCalendar` called again → returns calendar data

2. **Subsequent uses**:
   - Direct calendar access (tokens already stored)

## Monitoring Recommendations

### What to Track

1. **Authentication Events**
   - New user authorizations
   - Token refreshes
   - Failed auth attempts
   - Email domain rejections

2. **API Usage**
   - Calendar API calls per user
   - Error rates
   - Response times

3. **User Activity**
   - Most active users
   - Popular query types
   - Peak usage times

### Log Examples

```typescript
// Good logs to add
logger.info('calendar_auth_success', {
  userId,
  email,
  timestamp: new Date().toISOString()
});

logger.warn('calendar_auth_rejected', {
  userId,
  email,
  reason: 'invalid_domain',
  attemptedDomain: email.split('@')[1]
});

logger.error('calendar_api_error', {
  userId,
  action: 'list_events',
  error: error.message
});
```

## Next Steps

### Immediate (Ready to Use)

1. ✅ Set up Google Cloud project
2. ✅ Configure environment variables  
3. ✅ Test with small group of users
4. ✅ Gather feedback

### Short Term (Before Full Rollout)

1. ⏳ Replace in-memory storage with database
2. ⏳ Add token encryption
3. ⏳ Set up production OAuth callback URL
4. ⏳ Add usage analytics
5. ⏳ Create user documentation

### Long Term (Enhancements)

1. 🔮 Meeting conflict detection
2. 🔮 Calendar event templates
3. 🔮 Recurring event support
4. 🔮 Calendar sharing within team
5. 🔮 Meeting room booking integration
6. 🔮 Zoom/Meet link auto-generation

## Support & Troubleshooting

### Common Issues

**Issue**: "Calendar not connected"  
**Fix**: User needs to run `/connect-calendar`

**Issue**: "Only company.com emails allowed"  
**Fix**: User must authorize with company email, not personal

**Issue**: OAuth callback doesn't work  
**Fix**: Check OAuth server is running on correct port

**Issue**: Tokens lost after restart  
**Fix**: Expected in development. Implement database storage.

### Getting Help

1. Check logs: `bun run slack-bot.ts`
2. Review setup: [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md)
3. See examples: [EXAMPLE_USAGE.md](./EXAMPLE_USAGE.md)
4. Test tool: `bun run test-calendar.ts`

## Summary

You now have a complete, working Google Calendar integration that:

- ✅ Authenticates each user individually
- ✅ Restricts access to company email addresses only
- ✅ Provides personalized calendar access per user
- ✅ Handles token management automatically
- ✅ Integrates seamlessly with Slack
- ✅ Supports all calendar operations (list, create, update, delete)
- ✅ Is ready for testing with your team

**Ready to deploy for development/testing!**

**Before production**: Implement database storage and token encryption.
