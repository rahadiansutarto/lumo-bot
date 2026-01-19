/**
 * Example integration of orchestrator into Slack bot
 * 
 * This shows how to replace the direct Claude calls in slack-bot.ts
 * with the orchestrator that supports tool calling.
 */

import { orchestrate } from "./orchestrator";

/**
 * Replace your current getClaude() function with this
 */
async function getClaudeWithTools(message: string): Promise<string> {
  const result = await orchestrate(message);
  
  // Optionally log which tools were used
  if (result.toolsUsed.length > 0) {
    console.log(`Tools used: ${result.toolsUsed.join(", ")}`);
  }
  
  return result.response;
}

/**
 * Example Slack handler using orchestrator
 */
export async function handleSlackMessage(userMessage: string): Promise<string> {
  try {
    const response = await getClaudeWithTools(userMessage);
    return response;
  } catch (error) {
    console.error("Error in orchestrator:", error);
    return `Sorry, I encountered an error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

/**
 * In your slack-bot.ts, replace:
 * 
 * OLD:
 *   const reply = await getClaude(rawText);
 * 
 * NEW:
 *   const reply = await getClaudeWithTools(rawText);
 * 
 * Or import and use orchestrate() directly:
 *   const { response } = await orchestrate(rawText);
 */
