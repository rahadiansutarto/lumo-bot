# Google Calendar Setup Checklist

Use this checklist to set up Google Calendar integration step by step.

## ☐ Step 1: Google Cloud Console Setup

### Create/Configure Project
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new project OR select existing project
- [ ] Note your project name: `_________________`

### Enable API
- [ ] Navigate to: APIs & Services → Library
- [ ] Search for "Google Calendar API"
- [ ] Click "Enable"
- [ ] ✓ API enabled successfully

### OAuth Consent Screen
- [ ] Navigate to: APIs & Services → OAuth consent screen
- [ ] Select user type:
  - [ ] **Internal** (recommended - Google Workspace only)
  - [ ] **External** (if no Google Workspace)
- [ ] Fill in app information:
  - App name: `_________________`
  - User support email: `_________________`
  - Developer contact: `_________________`
- [ ] Add scopes (click "Add or Remove Scopes"):
  - [ ] `https://www.googleapis.com/auth/calendar.readonly`
  - [ ] `https://www.googleapis.com/auth/calendar.events`
  - [ ] `https://www.googleapis.com/auth/userinfo.email`
- [ ] Save and continue
- [ ] ✓ OAuth consent configured

### Create Credentials
- [ ] Navigate to: APIs & Services → Credentials
- [ ] Click: Create Credentials → OAuth 2.0 Client ID
- [ ] Application type: **Web application**
- [ ] Name: `_________________`
- [ ] Authorized redirect URIs → Add URI:
  ```
  http://localhost:3000/oauth/google/callback
  ```
- [ ] Click "Create"
- [ ] **SAVE THESE** (you'll need them next):
  - Client ID: `_________________`
  - Client Secret: `_________________`

## ☐ Step 2: Environment Configuration

- [ ] Open your `.env` file (create if doesn't exist)
- [ ] Add Google Calendar configuration:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=paste_your_client_id_here
GOOGLE_CLIENT_SECRET=paste_your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback

# Company Email Restriction (IMPORTANT!)
COMPANY_EMAIL_DOMAIN=yourcompany.com
```

- [ ] Replace `yourcompany.com` with your actual domain
- [ ] Save `.env` file
- [ ] ✓ Environment configured

## ☐ Step 3: Install Dependencies

- [ ] Run installation command:
```bash
bun install
```

- [ ] Verify `googleapis` is installed:
```bash
bun pm ls | grep googleapis
```

- [ ] ✓ Dependencies installed

## ☐ Step 4: Test the Bot

- [ ] Start the bot:
```bash
bun run slack-bot.ts
```

- [ ] Verify you see:
```
OAuth callback server running on http://localhost:3000
Slack bot is running!
```

- [ ] ✓ Bot started successfully

## ☐ Step 5: Test with Your Account

### Get Authorization Link
- [ ] In Slack, send message to bot:
```
@bot Do I have any meetings today?
```

- [ ] Bot should respond with authorization link
- [ ] ✓ Received auth link

### Authorize Your Calendar
- [ ] Click the authorization link
- [ ] Sign in with your **company email** (not personal Gmail)
- [ ] Review permissions
- [ ] Click "Allow"
- [ ] You should see success page: "Calendar Connected! 🎉"
- [ ] ✓ Successfully authorized

### Verify It Works
- [ ] Back in Slack, send message again:
```
@bot Do I have any meetings today?
```

- [ ] Bot should now show your calendar events
- [ ] ✓ Calendar integration working!

## ☐ Step 6: Test with Team Member

- [ ] Have a colleague try the same flow
- [ ] Verify they can only see their own calendar
- [ ] ✓ Multi-user isolation working

## ☐ Step 7: Configure Slack Slash Command (Optional)

- [ ] Go to [Slack API](https://api.slack.com/apps)
- [ ] Select your app
- [ ] Navigate to: Slash Commands
- [ ] Create new command:
  - Command: `/connect-calendar`
  - Request URL: `https://your-bot-url/slack/events`
  - Short description: "Connect your Google Calendar"
- [ ] Save
- [ ] Reinstall app to workspace
- [ ] Test: `/connect-calendar` in Slack
- [ ] ✓ Slash command working

## ☐ Step 8: Production Preparation (Before Full Rollout)

### Security
- [ ] Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- [ ] Plan database migration for token storage
- [ ] Set up token encryption
- [ ] Configure HTTPS callback URL
- [ ] ✓ Security reviewed

### Monitoring
- [ ] Add logging for auth events
- [ ] Set up error alerting
- [ ] Track API usage metrics
- [ ] ✓ Monitoring configured

### Documentation
- [ ] Share [EXAMPLE_USAGE.md](./EXAMPLE_USAGE.md) with team
- [ ] Create internal wiki page
- [ ] Set up support channel in Slack
- [ ] ✓ Team documented

## Troubleshooting Checklist

If something doesn't work, check:

### Bot Won't Start
- [ ] All environment variables set in `.env`?
- [ ] Port 3000 available (not used by another app)?
- [ ] `googleapis` package installed?

### Authorization Link Not Working
- [ ] OAuth server showing in logs?
- [ ] Redirect URI matches Google Cloud Console exactly?
- [ ] Tried clicking link again?

### "Only yourcompany.com emails allowed" Error
- [ ] User signing in with company email (not personal)?
- [ ] `COMPANY_EMAIL_DOMAIN` in `.env` matches email domain?
- [ ] No typos in domain name?

### Calendar Not Showing
- [ ] User completed authorization flow?
- [ ] Success page appeared after auth?
- [ ] Tried asking again after authorizing?

### Tokens Lost After Restart
- [ ] This is expected in development (in-memory storage)
- [ ] For production: implement database storage
- [ ] User can re-authorize with `/connect-calendar`

## Quick Reference

### Environment Variables
```bash
GOOGLE_CLIENT_ID=        # From Google Cloud Console
GOOGLE_CLIENT_SECRET=    # From Google Cloud Console
GOOGLE_REDIRECT_URI=     # http://localhost:3000/oauth/google/callback
COMPANY_EMAIL_DOMAIN=    # yourcompany.com
```

### Slack Commands
```
@bot Do I have any meetings today?
@bot Create a meeting tomorrow at 2pm
/connect-calendar
```

### Important URLs
- Google Cloud Console: https://console.cloud.google.com/
- Slack API: https://api.slack.com/apps
- OAuth Callback: http://localhost:3000/oauth/google/callback

## Success Criteria

✅ You're ready to launch when:

- [ ] Bot starts without errors
- [ ] OAuth server running on port 3000
- [ ] At least 2 users successfully authorized
- [ ] Each user sees only their own calendar
- [ ] Company email restriction working
- [ ] Documentation shared with team
- [ ] Support channel created

## Next Steps After Setup

1. **Soft Launch**
   - [ ] Start with small pilot group (5-10 users)
   - [ ] Gather feedback
   - [ ] Fix any issues

2. **Full Rollout**
   - [ ] Announce to company
   - [ ] Provide training/demo
   - [ ] Monitor usage

3. **Production Migration**
   - [ ] Implement database storage
   - [ ] Add token encryption
   - [ ] Set up production OAuth callback
   - [ ] Configure monitoring/alerts

## Support

If you get stuck:

1. Check [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for detailed guide
2. Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for architecture
3. See [EXAMPLE_USAGE.md](./EXAMPLE_USAGE.md) for usage examples
4. Run test: `bun run test-calendar.ts`

---

**Estimated setup time**: 15-20 minutes  
**Difficulty**: Moderate  
**Prerequisites**: Google Cloud account, Slack admin access
