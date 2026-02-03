# Internal Company Bot

An intelligent Slack bot powered by Claude AI (via Anthropic Foundry) with integrated tools for your company's internal operations.

## Features

### Core Capabilities
- 💬 Responds to @mentions in channels and direct messages
- 🧠 Powered by Claude (Anthropic Foundry SDK)
- 🔧 Extensible tool system for custom integrations
- 🔒 Secure per-user authentication

### Integrated Tools
- 📅 **Google Calendar** - Personal calendar access, meeting scheduling, availability checks
- 🏖️ **Leave Management** - Submit, approve, and track time-off requests with automated reminders
- 🔍 **Document Search** - Search company documentation
- 👥 **Attio CRM** - Access customer data, deals, and contacts
- 🌤️ **Weather** - Weather forecasts for any location

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Slack workspace with admin access
- Anthropic API key (via Foundry or direct)

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Create a `.env` file with your credentials:

```env
# Required: Anthropic Configuration
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_RESOURCE=your_resource_id_here

# Required: Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token

# Optional: Google Calendar Integration
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
COMPANY_EMAIL_DOMAIN=yourcompany.com  # Restrict to company emails only

# Optional: Leave Management System
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leave_management
DB_USER=postgres
DB_PASSWORD=your_db_password
REDIS_HOST=localhost
REDIS_PORT=6379
MANAGER1_SLACK_ID=U01ABC123XYZ  # Manager's Slack user ID
MANAGER2_SLACK_ID=U02DEF456GHI  # Manager's Slack user ID

# Optional: Other integrations
WEATHER_API_KEY=your_openweather_api_key
ATTIO_API_KEY=your_attio_api_key
```

#### How to get Slack tokens:

1. Go to https://api.slack.com/apps
2. Create or select your app
3. **Bot Token**: OAuth & Permissions → Bot User OAuth Token
4. **App Token**: Basic Information → App-Level Tokens (enable Socket Mode first)

#### Required Slack Bot Scopes:

- `app_mentions:read` - Read messages that mention the bot
- `chat:write` - Send messages
- `im:history` - View messages in DMs
- `im:read` - View basic DM info
- `im:write` - Send DMs
- `commands` - Add slash commands
- `users:read` - Read user profile information

**For Leave Management:**
- `chat:write.public` - Post messages to channels
- `channels:read` - View basic channel info

### 3. Run the Bot

```bash
bun start
```

For development with auto-reload:
```bash
bun run dev
```

## Usage

### Basic Interaction

**In Channels:**
```
@bot Hello! How can you help me?
```

**Direct Messages:**
Just send a message directly to the bot.

### Calendar Integration

**First time:** The bot will ask users to authorize their Google Calendar:
```
User: @bot Do I have any meetings today?
Bot: You need to connect your Google Calendar first. Click this link: [auth URL]
```

**After authorization:**
```
@bot Do I have any meetings today?
@bot What's on my calendar this week?
@bot Create a meeting tomorrow at 2pm with john@company.com titled "Budget Review"
@bot When is my next 1:1?
```

See [QUICK_START_CALENDAR.md](./QUICK_START_CALENDAR.md) for setup instructions.

### Leave Management System

**Submit a Leave Request:**
```
/request-leave
```
Fill out the form with:
- Leave type (Vacation, Sick, Personal, Emergency)
- Start date and end date
- Optional reason

**For Managers:**
```
/leave-status    # View all pending requests
/leave-audit     # View audit log of all actions
```

**Features:**
- ✅ 3-day advance notice policy enforcement
- ✅ Automatic approval requests sent to managers
- ✅ 5-minute reminder notifications for pending requests
- ✅ Daily out-of-office summaries posted to channels
- ✅ Interactive approve/reject buttons for managers
- ✅ Role-based access control (managers vs employees)
- ✅ Request IDs in format: `LR-YYYYMMDD-XXX`
- ✅ Complete audit trail of all actions

See [LEAVE_MANAGEMENT_SETUP.md](./LEAVE_MANAGEMENT_SETUP.md) for full setup instructions.

### Other Tools

**Weather:**
```
@bot What's the weather in Tokyo?
@bot Compare weather in London and Paris
/forecast San Francisco
```

**Document Search:**
```
@bot Search our docs for API authentication
```

**Attio CRM:**
```
@bot Find contact information for Acme Corp
@bot Show recent deals
```

## Project Structure

```
.
├── slack-bot.ts                 # Main bot entry point
├── src/
│   ├── orchestrator.ts          # Tool calling orchestration
│   ├── prompts.ts               # System prompts
│   ├── config.ts                # Configuration management
│   ├── logger.ts                # Logging utilities
│   ├── oauth-server.ts          # OAuth callback handler
│   ├── leave-system.ts          # Leave management initialization
│   ├── auth/
│   │   └── googleCalendar.ts    # Google OAuth management
│   ├── tools/
│   │   ├── index.ts             # Tool registry
│   │   ├── googleCalendar.ts    # Calendar tool
│   │   ├── attio.ts             # Attio CRM tool
│   │   └── searchDocs.ts        # Document search tool
│   ├── slack/
│   │   ├── leaveHandlers.ts     # Leave request Slack handlers
│   │   └── leaveBlocks.ts       # Leave request UI components
│   ├── db/
│   │   └── postgres.ts          # PostgreSQL database client
│   ├── jobs/
│   │   └── reminderQueue.ts     # BullMQ job scheduling
│   ├── utils/
│   │   ├── leavePolicy.ts       # Leave policy validation
│   │   └── retry.ts             # API retry logic
│   ├── types/
│   │   ├── googleCalendar.ts    # Calendar types
│   │   ├── attio.ts             # Attio types
│   │   └── leave.ts             # Leave management types
│   └── llm/
│       └── claude.ts            # Claude API client
├── database/
│   └── schema.sql               # PostgreSQL schema
└── scripts/
    └── setup-database.ts        # Database setup script
```

## Tool Architecture

This bot uses a modular tool system. To add new tools:

1. Create tool in `src/tools/your-tool.ts`
2. Implement the `Tool` interface
3. Register in `src/tools/index.ts`
4. Tool automatically becomes available to Claude

See [TOOL_CALLING_ARCHITECTURE.md](./TOOL_CALLING_ARCHITECTURE.md) for details.

## Troubleshooting

### Anthropic API Errors
- Verify `ANTHROPIC_API_KEY` is correct
- Check that `ANTHROPIC_RESOURCE` matches your deployment
- Ensure your Foundry resource is active

### Slack Connection Issues
- Verify Socket Mode is enabled in your Slack app
- Check that both tokens (`SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`) are correct
- Ensure required scopes are granted

### Google Calendar Issues
- **"Calendar not connected"**: User needs to authorize via the provided link
- **"Only yourcompany.com emails allowed"**: User must use company email, not personal
- **OAuth callback not working**: Check OAuth server is running on correct port
- See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for detailed troubleshooting

### Leave Management Issues
- **Database connection errors**: Ensure PostgreSQL is running (`docker ps`)
- **Redis connection errors**: Ensure Redis is running (`docker ps`)
- **Reminders not working**: Check BullMQ worker is active (logs will show "Reminder system initialized")
- **Manager not receiving notifications**: Verify `AXEL_SLACK_ID` and `NADIA_SLACK_ID` in `.env` are correct
- See [LEAVE_MANAGEMENT_SETUP.md](./LEAVE_MANAGEMENT_SETUP.md) for detailed troubleshooting

### General Debugging
Check logs for error details:
```bash
bun run slack-bot.ts
```

## Security & Privacy

### Email Domain Restriction
Setting `COMPANY_EMAIL_DOMAIN` in `.env` ensures only company email addresses can authorize calendar access.

### Per-User Authentication
Each user authorizes with their own Google account. Users can only access their own calendar data.

### Token Storage
⚠️ **Development**: Currently uses in-memory storage (tokens lost on restart)
⚠️ **Production**: Replace with database storage in `src/auth/googleCalendar.ts`

### Environment Variables
⚠️ **Never commit your `.env` file to git!**

The `.gitignore` file ensures `.env` is not tracked.

## Adding More Tools

Want to integrate more services? The tool system is designed for easy extension:

1. Create your tool in `src/tools/your-service.ts`
2. Follow the `Tool` interface pattern
3. Register it in `src/tools/index.ts`
4. Claude automatically gets access to it

Examples of tools you could add:
- Jira/Linear for task management
- GitHub for repository access
- Internal databases or APIs
- Slack user directory
- Expense tracking systems

## Documentation

- [Quick Start: Google Calendar](./QUICK_START_CALENDAR.md) - 5-minute setup
- [Google Calendar Setup](./GOOGLE_CALENDAR_SETUP.md) - Full documentation
- [Leave Management Setup](./LEAVE_MANAGEMENT_SETUP.md) - Complete leave system setup guide
- [Leave Management Overview](./LEAVE_MANAGEMENT.md) - Features and usage
- [Tool Architecture](./TOOL_CALLING_ARCHITECTURE.md) - How the tool system works
- [High Priority Improvements](./HIGH_PRIORITY_IMPROVEMENTS.md) - Architecture improvements implemented

## License

MIT

