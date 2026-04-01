/**
 * EXAMPLE: How to integrate leave management into slack-bot.ts
 * 
 * Copy the relevant parts into your actual slack-bot.ts file
 */

import { App } from "@slack/bolt";
import "dotenv/config";
import { getConfig, printConfig } from "../src/config";
import { createLogger } from "../src/logger";
import { orchestrate } from "../src/orchestrator";

// ==========================================
// ADD THIS: Import leave system
// ==========================================
import { 
  initializeLeaveSystem, 
  shutdownLeaveSystem,
  healthCheck 
} from "../src/leave-system";

// Validate environment
const config = getConfig();
printConfig();

// Initialize Slack app
const app = new App({
  token: config.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: config.SLACK_APP_TOKEN,
});

console.log("Initializing Slack Bot...");

// ==========================================
// YOUR EXISTING HANDLERS
// ==========================================

// Claude orchestration function
async function getClaude(message: string, userId?: string, channelId?: string) {
  const logger = createLogger(undefined, { userId, channelId });
  
  logger.info("Message received", {
    messageLength: message.length,
    preview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
  });
  
  const result = await logger.time("orchestration", async () => {
    return await orchestrate(message);
  });
  
  if (result.toolsUsed.length > 0) {
    logger.info("Tools executed", {
      tools: result.toolsUsed,
      toolCount: result.toolsUsed.length,
    });
  }
  
  return result.response;
}

// @mentions
app.event("app_mention", async ({ event, say }) => {
  const logger = createLogger(undefined, { userId: event.user, channelId: event.channel });
  
  try {
    const rawText = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    if (!rawText) {
      await say("Hi! How can I help?");
      return;
    }

    const reply = await getClaude(rawText, event.user, event.channel);
    await say({ text: reply, thread_ts: event.thread_ts || event.ts });
  } catch (error) {
    logger.error("Error handling mention", error as Error);
    await say(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

// DMs
app.message(async ({ message, say }) => {
  const logger = createLogger();
  
  try {
    if ("bot_id" in message) return;
    if (!("text" in message) || !message.text) return;
    if (message.channel_type !== "im") return;
    
    const userId = "user" in message ? message.user : undefined;
    logger.addContext({ userId, channelType: "dm" });

    const reply = await getClaude(message.text, userId);
    await say(reply);
  } catch (error) {
    logger.error("Error handling DM", error as Error);
    await say(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

// ==========================================
// START BOT
// ==========================================

(async () => {
  try {
    console.log("Starting Slack bot...");
    
    // Start Slack app
    await app.start();
    console.log("Slack bot is running!");
    
    // ==========================================
    // ADD THIS: Initialize leave management system
    // ==========================================
    console.log("\nInitializing leave management system...");
    await initializeLeaveSystem(app);
    console.log("Leave management system ready!");
    
    // ==========================================
    // ADD THIS: Health check
    // ==========================================
    const health = await healthCheck();
    console.log("\nSystem Health:", health.status);
    console.log("Details:", health.details);
    
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

// ==========================================
// ADD THIS: Graceful shutdown
// ==========================================

async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  try {
    // Shutdown leave system first
    await shutdownLeaveSystem();
    
    // Stop Slack app
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

// ==========================================
// ADD THIS: Unhandled error handlers
// ==========================================

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit on uncaught exceptions
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
