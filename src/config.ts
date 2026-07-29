/**
 * Configuration and environment validation
 * 
 * This file centralizes all configuration and validates required
 * environment variables at startup, preventing runtime errors.
 */

interface EnvironmentConfig {
  // Slack Configuration
  SLACK_BOT_TOKEN: string;
  SLACK_APP_TOKEN: string;
  
  // LLM Configuration
  LLM_PROVIDER: "openai" | "anthropic";
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_MODEL_CANDIDATES?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_RESOURCE?: string;
  ANTHROPIC_MODEL?: string;
  
  // Attio CRM Configuration
  ATTIO_API_KEY: string;
  
  // Database Configuration
  DB_HOST?: string;
  DB_PORT?: string;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  
  // Redis Configuration
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  
  // Manager Slack IDs
  AXEL_SLACK_ID?: string;
  NADIA_SLACK_ID?: string;
  
  // Leadership Slack IDs (for weekly check-ins reports)
  GURNOOR_SLACK_ID?: string;
  SANDEEP_SLACK_ID?: string;
  EMEKA_SLACK_ID?: string;
  
  // Google Service Account (for Google Sheets API)
  GOOGLE_SERVICE_ACCOUNT_KEY?: string;
  
  // Weekly Check-Ins Configuration
  WEEKLY_CHECKINS_SPREADSHEET_ID?: string;
  WEEKLY_CHECKINS_ROSTER_TAB?: string;
  WEEKLY_CHECKINS_WORKER_TAB?: string;
  WEEKLY_CHECKINS_MANAGER_TAB?: string;
  WORKER_CHECKIN_FORM_URL?: string;
  MANAGER_REVIEW_FORM_URL?: string;
  
  // Optional configurations
  WEATHER_API_KEY?: string;
  
  // Application settings
  NODE_ENV: string;
}

/**
 * Configuration constants
 */
export const CONFIG = {
  // Attio settings
  ATTIO_QUERY_LIMIT: 50,
  ATTIO_MAX_RETRIES: 3,
  ATTIO_RETRY_DELAY_MS: 1000,
  
  // LLM settings
  LLM_MAX_TOKENS: 1024,
  OPENAI_MODEL_CANDIDATES: ["gpt-5.5", "gpt-5.4-mini", "gpt-5.5-pro", "gpt-4.1-mini"],
  ANTHROPIC_MODEL: "claude-sonnet-4-5",
  
  // Orchestrator settings
  MAX_TOOL_ITERATIONS: 10,
  
  // API timeouts
  API_TIMEOUT_MS: 30000,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
} as const;

/**
 * Validate that all required environment variables are present
 * Throws an error with clear message if any are missing
 */
export function validateEnvironment(): EnvironmentConfig {
  const required: Array<"SLACK_BOT_TOKEN" | "SLACK_APP_TOKEN" | "ATTIO_API_KEY"> = [
    "SLACK_BOT_TOKEN",
    "SLACK_APP_TOKEN",
    "ATTIO_API_KEY",
  ];
  
  const missing: string[] = [];
  const config: Partial<EnvironmentConfig> = {};
  
  // Check required variables
  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    } else {
      config[key] = value;
    }
  }

  const llmProvider = resolveLLMProvider(process.env.LLM_PROVIDER);
  config.LLM_PROVIDER = llmProvider;

  if (llmProvider === "openai") {
    config.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    config.OPENAI_MODEL = normalizeOptional(process.env.OPENAI_MODEL);
    config.OPENAI_MODEL_CANDIDATES =
      normalizeOptional(process.env.OPENAI_MODEL_CANDIDATES) ||
      CONFIG.OPENAI_MODEL_CANDIDATES.join(",");

    if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY.trim() === "") {
      missing.push("OPENAI_API_KEY");
    }
  } else {
    config.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    config.ANTHROPIC_RESOURCE = process.env.ANTHROPIC_RESOURCE;
    config.ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || CONFIG.ANTHROPIC_MODEL;

    if (!config.ANTHROPIC_API_KEY || config.ANTHROPIC_API_KEY.trim() === "") {
      missing.push("ANTHROPIC_API_KEY");
    }

    if (!config.ANTHROPIC_RESOURCE || config.ANTHROPIC_RESOURCE.trim() === "") {
      missing.push("ANTHROPIC_RESOURCE");
    }
  }
  
  // If any required variables are missing, throw error with helpful message
  if (missing.length > 0) {
    const errorMessage = [
      " Missing required environment variables:",
      "",
      ...missing.map(key => `  - ${key}`),
      "",
      "Please create a .env file with these variables.",
      "See README.md for setup instructions.",
    ].join("\n");
    
    throw new Error(errorMessage);
  }
  
  // Add optional variables
  config.WEATHER_API_KEY = process.env.WEATHER_API_KEY;
  config.NODE_ENV = process.env.NODE_ENV || "development";
  
  // Validate API key formats (basic check)
  validateApiKeyFormat("ATTIO_API_KEY", config.ATTIO_API_KEY!);
  validateApiKeyFormat("SLACK_BOT_TOKEN", config.SLACK_BOT_TOKEN!);
  if (config.LLM_PROVIDER === "openai") {
    validateApiKeyFormat("OPENAI_API_KEY", config.OPENAI_API_KEY!);
  } else {
    validateApiKeyFormat("ANTHROPIC_API_KEY", config.ANTHROPIC_API_KEY!);
  }
  
  return config as EnvironmentConfig;
}

function resolveLLMProvider(value: string | undefined): "openai" | "anthropic" {
  const provider = (value || (process.env.OPENAI_API_KEY ? "openai" : "anthropic")).toLowerCase();

  if (provider === "openai" || provider === "anthropic") {
    return provider;
  }

  throw new Error(`Unsupported LLM_PROVIDER "${value}". Use "openai" or "anthropic".`);
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Validate API key format (basic sanity check)
 */
function validateApiKeyFormat(name: string, key: string): void {
  // Check minimum length
  if (key.length < 20) {
    console.warn(`Warning: ${name} seems too short (${key.length} chars). Is it correct?`);
  }
  
  // Check for common mistakes
  if (key.includes(" ")) {
    throw new Error(`${name} contains spaces. Please check your .env file.`);
  }
  
  if (key.startsWith('"') || key.startsWith("'")) {
    throw new Error(`${name} has quotes. Remove quotes from .env file.`);
  }
}

/**
 * Get validated environment config
 * Call this once at startup
 */
let cachedConfig: EnvironmentConfig | null = null;

export function getConfig(): EnvironmentConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnvironment();
  }
  return cachedConfig;
}

/**
 * Pretty print configuration (for startup logs)
 * Masks sensitive values
 */
export function printConfig(): void {
  const config = getConfig();
  
  console.log(" Configuration:");
  console.log(`   Environment: ${config.NODE_ENV}`);
  console.log(`   LLM Provider: ${config.LLM_PROVIDER}`);
  console.log(
    `   LLM Model: ${
      config.LLM_PROVIDER === "openai"
        ? config.OPENAI_MODEL || `auto (${config.OPENAI_MODEL_CANDIDATES})`
        : config.ANTHROPIC_MODEL
    }`
  );
  console.log(`   Max Tokens: ${CONFIG.LLM_MAX_TOKENS}`);
  console.log(`   Max Tool Iterations: ${CONFIG.MAX_TOOL_ITERATIONS}`);
  console.log(`   Attio Query Limit: ${CONFIG.ATTIO_QUERY_LIMIT}`);
  console.log(`   Log Level: ${CONFIG.LOG_LEVEL}`);
  
  // Show masked API keys
  console.log("\n API Keys:");
  console.log(`   Slack: ${maskApiKey(config.SLACK_BOT_TOKEN)}`);
  if (config.LLM_PROVIDER === "openai") {
    console.log(`   OpenAI: ${maskApiKey(config.OPENAI_API_KEY!)}`);
  } else {
    console.log(`   Anthropic: ${maskApiKey(config.ANTHROPIC_API_KEY!)}`);
  }
  console.log(`   Attio: ${maskApiKey(config.ATTIO_API_KEY)}`);
  
  if (config.WEATHER_API_KEY) {
    console.log(`   Weather: ${maskApiKey(config.WEATHER_API_KEY)}`);
  }
  
  console.log("");
}

/**
 * Mask API key for safe logging
 */
function maskApiKey(key: string): string {
  if (key.length < 8) return "***";
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}
