import { callLLM } from "./llm/claude";
import { toolRegistry } from "./tools";
import { getToolSystemPrompt } from "./prompts";

/**
 * Represents a tool call request from the model
 */
interface ToolCallRequest {
  tool: string;
  parameters: Record<string, any>;
}

/**
 * Result from orchestrator execution
 */
interface OrchestratorResult {
  response: string;
  toolsUsed: string[];
  slackBlocks?: any[]; // Slack Block Kit blocks for rich formatting
}

/**
 * Conversation turn for multi-turn interactions
 */
interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Options for orchestrator
 */
interface OrchestratorOptions {
  userId?: string;      // Slack user ID for personalized tool access
  channelId?: string;   // Slack channel ID for context
}

/**
 * Maximum number of tool calling iterations to prevent infinite loops
 */
const MAX_ITERATIONS = 10;

/**
 * Main orchestrator that handles tool calling loop
 * 
 * Flow:
 * 1. Send user message to the configured LLM with tool system prompt
 * 2. Parse the model's response for tool requests
 * 3. If tool requested: execute it, send result back to the model
 * 4. If normal response: return to user
 * 5. Repeat until final answer or max iterations
 */
export async function orchestrate(
  userMessage: string,
  options: OrchestratorOptions = {}
): Promise<OrchestratorResult> {
  const conversationHistory: ConversationTurn[] = [];
  const toolsUsed: string[] = [];
  let iterations = 0;

  // Add initial user message
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Call the configured LLM with current conversation state (with dynamic date/time)
    const modelResponse = await callLLM({
      system: getToolSystemPrompt(),
      messages: conversationHistory,
    });

    // Try to parse as tool request
    const toolRequest = parseToolRequest(modelResponse);

    if (toolRequest === null) {
      // Normal response - we're done
      return {
        response: modelResponse,
        toolsUsed,
      };
    }

    // Tool was requested - validate and execute
    const tool = toolRegistry.get(toolRequest.tool);

    if (!tool) {
      // Tool doesn't exist - inform model and retry
      conversationHistory.push({
        role: "assistant",
        content: modelResponse,
      });
      conversationHistory.push({
        role: "user",
        content: `Error: Tool "${toolRequest.tool}" does not exist. Available tools: ${Array.from(
          toolRegistry.keys()
        ).join(", ")}. Please use a valid tool or provide a direct answer.`,
      });
      continue;
    }

    // Execute tool safely with user context
    let toolResult: string;
    let slackBlocks: any[] | undefined;
    
    try {
      // Pass userId to tool for personalized access
      const toolParams = {
        ...toolRequest.parameters,
        userId: options.userId,
        channelId: options.channelId,
      };
      
      const result = await tool.execute(toolParams);
      
      // Check if tool returned Slack blocks (for rich formatting)
      if (result.slackBlocks) {
        slackBlocks = result.slackBlocks;
      }
      
      // If tool requires auth and returned blocks, return immediately with blocks
      if (result.requiresAuth && slackBlocks) {
        return {
          response: result.message || "Authentication required",
          toolsUsed,
          slackBlocks,
        };
      }
      
      toolResult = JSON.stringify(result, null, 2);
      toolsUsed.push(toolRequest.tool);
    } catch (error) {
      toolResult = `Error executing tool: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }

    // Add tool request and result to conversation
    conversationHistory.push({
      role: "assistant",
      content: modelResponse,
    });
    conversationHistory.push({
      role: "user",
      content: `Tool "${toolRequest.tool}" result:\n${toolResult}\n\nPlease provide a final answer to the user based on this result.`,
    });
  }

  // Max iterations reached - return what we have
  return {
    response: "I apologize, but I couldn't complete the request within the allowed processing steps.",
    toolsUsed,
  };
}

/**
 * Attempts to parse a tool call request from model output
 * 
 * Expected format:
 * <tool_call>
 * {
 *   "tool": "tool_name",
 *   "parameters": { ... }
 * }
 * </tool_call>
 * 
 * Returns null if no valid tool request found
 */
function parseToolRequest(modelOutput: string): ToolCallRequest | null {
  // Look for tool_call tags
  const toolCallMatch = modelOutput.match(
    /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/
  );

  if (!toolCallMatch) {
    return null;
  }

  try {
    const jsonContent = toolCallMatch[1].trim();
    const parsed = JSON.parse(jsonContent);

    // Validate structure
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.tool !== "string"
    ) {
      console.warn("Invalid tool request structure:", parsed);
      return null;
    }

    return {
      tool: parsed.tool,
      parameters: parsed.parameters || {},
    };
  } catch (error) {
    console.warn("Failed to parse tool request JSON:", error);
    return null;
  }
}
