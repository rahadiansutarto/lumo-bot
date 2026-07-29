import AnthropicFoundry from "@anthropic-ai/foundry-sdk";
import OpenAI from "openai";
import { CONFIG, getConfig } from "../config";

/**
 * Message in conversation history
 */
interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Parameters for an LLM API call
 */
interface LLMCallParams {
  system: string;
  messages: Message[];
  maxTokens?: number;
}

/**
 * Singleton LLM clients
 */
let claudeClient: AnthropicFoundry | null = null;
let openAIClient: OpenAI | null = null;
let resolvedOpenAIModel: string | null = null;

/**
 * Initialize or get existing Claude client
 */
function getClaudeClient(): AnthropicFoundry {
  if (!claudeClient) {
    const config = getConfig();
    const apiKey = config.ANTHROPIC_API_KEY;
    const resource = config.ANTHROPIC_RESOURCE;

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
 * Initialize or get existing OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!openAIClient) {
    const config = getConfig();
    const apiKey = config.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing required environment variable: OPENAI_API_KEY");
    }

    openAIClient = new OpenAI({ apiKey });
  }

  return openAIClient;
}

/**
 * Call the configured LLM provider
 * 
 * @param params - System prompt, conversation history, and options
 * @returns Model text response
 * 
 * @throws Error if API call fails or response is malformed
 */
export async function callLLM(params: LLMCallParams): Promise<string> {
  const config = getConfig();

  if (config.LLM_PROVIDER === "openai") {
    return callOpenAI(params);
  }

  return callAnthropic(params);
}

async function callAnthropic(params: LLMCallParams): Promise<string> {
  const client = getClaudeClient();
  const config = getConfig();

  const response = await client.messages.create({
    model: config.ANTHROPIC_MODEL || CONFIG.ANTHROPIC_MODEL,
    max_tokens: params.maxTokens || CONFIG.LLM_MAX_TOKENS,
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

async function callOpenAI(params: LLMCallParams): Promise<string> {
  const client = getOpenAIClient();
  const model = await resolveOpenAIModel(client);

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: params.maxTokens || CONFIG.LLM_MAX_TOKENS,
    messages: [
      { role: "system", content: params.system },
      ...params.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Unexpected response format from OpenAI");
  }

  return content;
}

async function resolveOpenAIModel(client: OpenAI): Promise<string> {
  const config = getConfig();

  if (config.OPENAI_MODEL) {
    return config.OPENAI_MODEL;
  }

  if (resolvedOpenAIModel) {
    return resolvedOpenAIModel;
  }

  const candidates = parseOpenAIModelCandidates(config.OPENAI_MODEL_CANDIDATES);

  try {
    const models = await client.models.list();
    const availableModelIds = models.data.map((model) => model.id);
    const availableModels = new Set(availableModelIds);
    const preferredModel = candidates.find((model) => availableModels.has(model));

    if (preferredModel) {
      resolvedOpenAIModel = preferredModel;
      return preferredModel;
    }

    const fallbackModel = availableModelIds.find(isLikelyChatModel);

    if (fallbackModel) {
      resolvedOpenAIModel = fallbackModel;
      return fallbackModel;
    }

    throw new Error(
      `No chat-capable OpenAI models found. Available models: ${availableModelIds.join(", ")}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    throw new Error(
      `Could not auto-select an OpenAI model. Set OPENAI_MODEL to a known model, or update OPENAI_MODEL_CANDIDATES. ${message}`
    );
  }
}

function parseOpenAIModelCandidates(value: string | undefined): string[] {
  const rawCandidates =
    value || CONFIG.OPENAI_MODEL_CANDIDATES.join(",");

  return rawCandidates
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function isLikelyChatModel(modelId: string): boolean {
  return /^(gpt-|o\d|o-|chatgpt-)/.test(modelId);
}

export const callClaude = callLLM;
