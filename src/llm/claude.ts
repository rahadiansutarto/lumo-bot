import AnthropicFoundry from "@anthropic-ai/foundry-sdk";

/**
 * Message in conversation history
 */
interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Parameters for Claude API call
 */
interface ClaudeCallParams {
  system: string;
  messages: Message[];
  maxTokens?: number;
}

/**
 * Singleton Anthropic Foundry client
 */
let claudeClient: AnthropicFoundry | null = null;

/**
 * Initialize or get existing Claude client
 */
function getClaudeClient(): AnthropicFoundry {
  if (!claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const resource = process.env.ANTHROPIC_RESOURCE;

    if (!apiKey || !resource) {
      throw new Error(
        "Missing required environment variables: ANTHROPIC_API_KEY, ANTHROPIC_RESOURCE"
      );
    }

    claudeClient = new AnthropicFoundry({
      apiKey,
      resource,
    });
  }

  return claudeClient;
}

/**
 * Call Claude via Anthropic Foundry (Azure)
 * 
 * @param params - System prompt, conversation history, and options
 * @returns Claude's text response
 * 
 * @throws Error if API call fails or response is malformed
 */
export async function callClaude(params: ClaudeCallParams): Promise<string> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: params.maxTokens || 2048,
    system: params.system,
    messages: params.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  });

  // Extract text content from response
  const firstContent = response.content[0];

  if (!firstContent || firstContent.type !== "text") {
    throw new Error("Unexpected response format from Claude");
  }

  return firstContent.text;
}
