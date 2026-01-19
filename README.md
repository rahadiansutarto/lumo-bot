# Claude Slack Bot (Azure AI Foundry)

A Slack bot powered by Claude AI via Azure AI Foundry, built with Bun and TypeScript.

## Features

- Responds to @mentions in channels
- Handles direct messages
- Supports `/claude` slash command
- Maintains conversation context per thread
- Secure environment variable configuration

## Prerequisites

- [Bun](https://bun.sh/) installed
- Slack workspace with bot permissions
- Azure AI Foundry account with Claude access

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SLACK_BOT_TOKEN=xoxb-your-actual-token
SLACK_APP_TOKEN=xapp-your-actual-token
ANTHROPIC_API_KEY=your-azure-foundry-key
ANTHROPIC_RESOURCE=your-resource-name
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

### 3. Run the Bot

```bash
bun start
```

For development with auto-reload:
```bash
bun run dev
```

## Usage

### In Channels
Mention the bot: `@YourBot Hello, can you help me?`

### Direct Messages
Just send a message directly to the bot

### Slash Command (Optional)
Use `/claude Your question here`

**Note**: You need to register the `/claude` command in your Slack app settings.

## Project Structure

- `slack-bot.ts` - Main bot logic
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables (not in git)
- `.env.example` - Template for environment variables

## Troubleshooting

### "Connection error" or API errors
- Verify your `ANTHROPIC_API_KEY` is correct
- Check that `ANTHROPIC_RESOURCE` matches your Azure deployment
- Ensure your Azure AI Foundry deployment is active

### Slack connection issues
- Verify Socket Mode is enabled in your Slack app
- Check that both tokens are correct
- Ensure required scopes are granted

## Security Notes

⚠️ **Never commit your `.env` file to git!**

The `.gitignore` file ensures `.env` is not tracked.

## License

MIT

