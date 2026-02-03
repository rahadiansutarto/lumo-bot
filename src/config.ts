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
  
  // Anthropic/Claude Configuration
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_RESOURCE: string;
  
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
  
  // Claude settings
  CLAUDE_MAX_TOKENS: 1024,
  CLAUDE_MODEL: "claude-sonnet-4-5",
  
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
  const required: (keyof EnvironmentConfig)[] = [
    "SLACK_BOT_TOKEN",
    "SLACK_APP_TOKEN",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_RESOURCE",
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
  validateApiKeyFormat("ANTHROPIC_API_KEY", config.ANTHROPIC_API_KEY!);
  
  return config as EnvironmentConfig;
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
  console.log(`   Claude Model: ${CONFIG.CLAUDE_MODEL}`);
  console.log(`   Max Tokens: ${CONFIG.CLAUDE_MAX_TOKENS}`);
  console.log(`   Max Tool Iterations: ${CONFIG.MAX_TOOL_ITERATIONS}`);
  console.log(`   Attio Query Limit: ${CONFIG.ATTIO_QUERY_LIMIT}`);
  console.log(`   Log Level: ${CONFIG.LOG_LEVEL}`);
  
  // Show masked API keys
  console.log("\n API Keys:");
  console.log(`   Slack: ${maskApiKey(config.SLACK_BOT_TOKEN)}`);
  console.log(`   Anthropic: ${maskApiKey(config.ANTHROPIC_API_KEY)}`);
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
