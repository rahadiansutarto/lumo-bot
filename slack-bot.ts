import { App } from "@slack/bolt";
import "dotenv/config";
import { orchestrate } from "./src/orchestrator";
import { getConfig, printConfig } from "./src/config";
import { startOAuthServer } from "./src/oauth-server";
import { initializeLeaveSystem, shutdownLeaveSystem } from './src/leave-system';
import { initializeWeeklyCheckInsSystem, shutdownWeeklyCheckInsSystem } from './src/weekly-checkins-system';

// Validate environment before doing anything else
console.log(" Validating environment variables...");
const config = getConfig();
console.log(" Environment validation passed!\n");

// Print configuration (with masked keys)
printConfig();

// Start OAuth callback server for Google Calendar
console.log("\nStarting OAuth server...");
startOAuthServer();

// Initialize Slack app
const app = new App({
  token: config.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: config.SLACK_APP_TOKEN,
});

console.log(`Initializing Slack Bot with ${config.LLM_PROVIDER} LLM provider...`);

import { createLogger } from "./src/logger";

// Get LLM response with tool calling (via orchestrator)
async function getClaude(message: string, userId?: string, channelId?: string) {
  const logger = createLogger(undefined, { userId, channelId });
  
  logger.info("Message received", {
    messageLength: message.length,
    preview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
  });
  
  const result = await logger.time("orchestration", async () => {
    return await orchestrate(message, { userId, channelId });
  });
  
  if (result.toolsUsed.length > 0) {
    logger.info("Tools executed", {
      tools: result.toolsUsed,
      toolCount: result.toolsUsed.length,
    });
  }
  
  return result;
}

// Weather data structure
interface WeatherData {
  name: string;
  description: string;
  temp: number;
  feelsLike: number;
  error?: string;
}

// Fetch weather for a single city
async function fetchWeatherData(area: string): Promise<WeatherData> {
  const apiKey = process.env.WEATHER_API_KEY;
  
  if (!apiKey) {
    return {
      name: area,
      description: "",
      temp: 0,
      feelsLike: 0,
      error: "Weather API key is not configured.",
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      area
    )}&units=metric&appid=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      return {
        name: area,
        description: "",
        temp: 0,
        feelsLike: 0,
        error: `Couldn't get weather (status ${res.status})`,
      };
    }

    const data = (await res.json()) as any;
    return {
      name: data.name || area,
      description: data.weather?.[0]?.description ?? "No description",
      temp: data.main?.temp ?? 0,
      feelsLike: data.main?.feels_like ?? 0,
    };
  } catch (error) {
    return {
      name: area,
      description: "",
      temp: 0,
      feelsLike: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Format weather for multiple cities
async function getWeatherText(areas: string[]): Promise<string> {
  if (areas.length === 0) {
    return "Please specify at least one city.";
  }

  // Fetch weather for all cities
  const weatherResults = await Promise.all(
    areas.map((area) => fetchWeatherData(area))
  );

  // If any errors, return them
  const errors = weatherResults.filter((w) => w.error);
  if (errors.length === weatherResults.length) {
    return errors.map((e) => `${e.name}: ${e.error}`).join("\n");
  }

  // Single city response
  if (weatherResults.length === 1) {
    const w = weatherResults[0];
    if (w.error) return `${w.name}: ${w.error}`;
    
    return (
      `🌤️ *Weather for ${w.name}:*\n` +
      `• ${w.description}\n` +
      `• Temp: ${w.temp}°C\n` +
      `• Feels like: ${w.feelsLike}°C`
    );
  }

  // Multiple cities - comparison format
  let response = "🌍 *Weather Comparison:*\n\n";
  
  for (const w of weatherResults) {
    if (w.error) {
      response += `*${w.name}*: ${w.error}\n\n`;
    } else {
      response += `*${w.name}*:\n`;
      response += `• ${w.description}\n`;
      response += `• Temp: ${w.temp}°C (feels like ${w.feelsLike}°C)\n\n`;
    }
  }

  // Add comparison summary
  const validWeather = weatherResults.filter((w) => !w.error);
  if (validWeather.length > 1) {
    const warmest = validWeather.reduce((a, b) => (a.temp > b.temp ? a : b));
    const coldest = validWeather.reduce((a, b) => (a.temp < b.temp ? a : b));
    
    response += `*Summary:*\n`;
    response += `• Warmest: ${warmest.name} (${warmest.temp}°C)\n`;
    response += `• Coldest: ${coldest.name} (${coldest.temp}°C)`;
  }

  return response;
}

function extractWeatherAreas(text: string): string[] {
  const lower = text.toLowerCase().trim();

  // Check if it's a weather-related query
  if (!/(weather|forecast|temperature|temp)/i.test(text)) {
    return [];
  }

  // Option 1: Explicit comparison with "compare", "vs", "versus"
  const compareMatch = lower.match(
    /(compare|check|show).*?(?:weather|forecast|temp).*?(?:in\s+|for\s+)(.+)/
  );
  if (compareMatch) {
    const citiesText = compareMatch[2];
    const cities = citiesText
      .split(/\s+(?:and|vs|versus|,)\s+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && !/(weather|forecast|temp|in|for)/i.test(c));
    if (cities.length > 0) return cities;
  }

  // Option 2: Multiple cities with separators (and, vs, versus, comma)
  const multiMatch = lower.match(/(?:weather|forecast).*?\bin\s+(.+)/);
  if (multiMatch) {
    const citiesText = multiMatch[1];
    // Split by "and", "vs", "versus", or comma
    if (/\s+(?:and|vs|versus)\s+|,/.test(citiesText)) {
      const cities = citiesText
        .split(/\s+(?:and|vs|versus)\s+|,\s*/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cities.length > 1) return cities;
    }
    // Single city
    return [citiesText.trim()];
  }

  // Option 3: Simple "weather in [city]"
  const simpleMatch = lower.match(/\bin\s+([^?!.]+)/);
  if (simpleMatch) {
    return [simpleMatch[1].trim()];
  }

  return [];
}

// Handle @mentions (only when bot is tagged)
app.event("app_mention", async ({ event, say }) => {
  const logger = createLogger(undefined, { userId: event.user, channelId: event.channel });
  
  try {
    const rawText = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    if (!rawText) {
      await say("Hi! How can I help?");
      return;
    }

    const threadBroadcast = {
      thread_ts: event.thread_ts || event.ts,
      reply_broadcast: true,
    };

    const areas = extractWeatherAreas(rawText);
    
    if (areas.length > 0) {
      const weatherText = await getWeatherText(areas);
      await say({ text: weatherText, ...threadBroadcast });
    } else {
      const result = await getClaude(rawText, event.user, event.channel);
      
      // If result has Slack blocks, send with blocks
      if (result.slackBlocks) {
        await say({ 
          text: result.response, // Fallback text
          blocks: result.slackBlocks,
          ...threadBroadcast,
        });
      } else {
        await say({ text: result.response, ...threadBroadcast });
      }
    }
  } catch (error) {
    logger.error("Error handling mention", error as Error);
    await say(
      `Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
});

// Handle DMs only (no channel thread replies)
app.message(async ({ message, say }) => {
  const logger = createLogger();
  
  try {
    // Ignore bot messages
    if ("bot_id" in message) return;
    if (!("text" in message) || !message.text) return;

    // Only handle direct messages (channel_type === "im")
    if (message.channel_type !== "im") return;
    
    const userId = "user" in message ? message.user : undefined;
    logger.addContext({ userId, channelType: "dm" });

    const areas = extractWeatherAreas(message.text);
    
    if (areas.length > 0) {
      const weatherText = await getWeatherText(areas);
      await say(weatherText);
    } else {
      const result = await getClaude(message.text, userId);
      
      // If result has Slack blocks, send with blocks
      if (result.slackBlocks) {
        await say({ 
          text: result.response, // Fallback text
          blocks: result.slackBlocks 
        });
      } else {
        await say(result.response);
      }
    }
  } catch (error) {
    logger.error("Error handling DM", error as Error);
    await say(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

// Slash command: /forecast [area]
app.command("/forecast", async ({ command, ack, respond }) => {
  await ack();

  const input = command.text.trim();
  if (!input) {
    await respond("Please provide location(s), e.g. `/forecast Tokyo` or `/forecast Tokyo and London`");
    return;
  }

  try {
    // Split by common separators if multiple cities
    const areas = input.split(/\s+(?:and|vs|versus)\s+|,\s*/).map((a) => a.trim());
    const text = await getWeatherText(areas);
    await respond(text);
  } catch (error) {
    console.error("Error in /forecast:", error);
    await respond(
      `Sorry, I couldn't fetch the weather: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
});

// Slash command: /connect-calendar
// Provides user with their personal Google Calendar authorization link
import { getAuthorizationUrl, isUserAuthenticated } from "./src/auth/googleCalendar";

app.command("/connect-calendar", async ({ command, ack, respond }) => {
  await ack();

  const userId = command.user_id;

  try {
    // Check if already authenticated
    if (isUserAuthenticated(userId)) {
      await respond({
        text: "✅ Your Google Calendar is already connected! You can ask me about your meetings anytime.",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "✅ *Your Google Calendar is already connected!*\n\nYou can ask me questions like:\n• Do I have any meetings today?\n• What's on my calendar this week?\n• Create a meeting tomorrow at 2pm",
            },
          },
        ],
        response_type: "ephemeral",
      });
      return;
    }

    // Generate authorization URL
    const authUrl = getAuthorizationUrl(userId);
    
    await respond({
      text: "Connect your Google Calendar to get started",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "📅 *Connect Your Google Calendar*\n\nAuthorize calendar access to check your meetings and manage your schedule.",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "🔗 Connect Calendar",
                emoji: true,
              },
              url: authUrl,
              style: "primary",
              action_id: "connect_calendar_slash",
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "_After authorizing, you can ask me about your meetings anytime!_",
            },
          ],
        },
      ],
      response_type: "ephemeral",
    });
  } catch (error) {
    console.error("Error in /connect-calendar:", error);
    await respond({
      text: `Error: ${error instanceof Error ? error.message : "Could not generate authorization link"}`,
      response_type: "ephemeral",
    });
  }
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  
  // Socket Mode connection errors are handled automatically by the client
  if (
    message.includes("server explicit disconnect") ||
    message.includes("Unhandled event") && message.includes("state 'connecting'")
  ) {
    console.log("Socket Mode connection issue detected - client will auto-reconnect");
    return;
  }
  
  // For other errors, log and gracefully shut down
  console.error("Fatal error:", message);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue for unhandled rejections
});

// Start bot
(async () => {
  try {
    console.log("Starting Slack bot...");
    await app.start();
    console.log("Slack bot is running!");
    console.log("Ready to receive messages");
    
    // Initialize leave management system
    console.log("\nInitializing leave management system...");
    await initializeLeaveSystem(app);
    console.log("Leave management system ready!");
    
    // Initialize weekly check-ins system
    console.log("\nInitializing weekly check-ins system...");
    try {
      await initializeWeeklyCheckInsSystem(app);
      console.log("Weekly check-ins system ready!");
    } catch (error) {
      console.warn("Weekly check-ins system not initialized:", error instanceof Error ? error.message : String(error));
      console.warn("This is optional - bot will continue without weekly check-ins.");
    }
    
    console.log("\nBot is fully operational!");
    console.log("Available commands:");
    console.log("  /request-leave - Submit a leave request");
    console.log("  /leave-status - View pending requests (managers only)");
    console.log("  /leave-audit - View audit log (managers only)");
  } catch (error) {
    console.error("Failed to start:", error);
    process.exit(1);
  }
})();

// Graceful shutdown handlers
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  try {
    await shutdownLeaveSystem();
    await shutdownWeeklyCheckInsSystem();
    await app.stop();
    console.log("Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
