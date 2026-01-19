/**
 * Shared types used across the application
 */

/**
 * Result from the orchestrator
 */
export interface OrchestratorResult {
  response: string;
  toolsUsed: string[];
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}
