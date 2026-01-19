/**
 * Structured logging system with request tracing
 * 
 * Provides consistent logging with:
 * - Request IDs for tracing
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Structured data (JSON-friendly)
 * - Timestamps
 */

import { CONFIG } from "./config";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  channelId?: string;
  tool?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Log level priorities
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Current log level from config
 */
const CURRENT_LEVEL = LOG_LEVELS[CONFIG.LOG_LEVEL as LogLevel] || LOG_LEVELS.info;

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: "\x1b[0m",
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
  dim: "\x1b[2m",    // Dim
};

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format log entry for console output
 */
function formatForConsole(entry: LogEntry): string {
  const color = COLORS[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const time = new Date(entry.timestamp).toISOString().split('T')[1].replace('Z', '');
  
  let output = `${COLORS.dim}${time}${COLORS.reset} ${color}${levelStr}${COLORS.reset} ${entry.message}`;
  
  // Add context if present
  if (entry.context && Object.keys(entry.context).length > 0) {
    const contextStr = Object.entries(entry.context)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    output += ` ${COLORS.dim}${contextStr}${COLORS.reset}`;
  }
  
  // Add error details if present
  if (entry.error) {
    output += `\n${COLORS.error}  Error: ${entry.error.message}${COLORS.reset}`;
    if (entry.error.stack && entry.level === "error") {
      output += `\n${COLORS.dim}${entry.error.stack}${COLORS.reset}`;
    }
  }
  
  return output;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  // Skip if below current log level
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
  
  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }
  
  // Console output (formatted for humans)
  console.log(formatForConsole(entry));
  
  // In production, you'd also send to logging service:
  // - DataDog, Logstash, CloudWatch, etc.
  // if (CONFIG.NODE_ENV === 'production') {
  //   sendToLoggingService(entry);
  // }
}

/**
 * Logger class with request context
 */
export class Logger {
  private requestId?: string;
  private context: LogContext;
  
  constructor(requestId?: string, initialContext?: LogContext) {
    this.requestId = requestId || generateRequestId();
    this.context = {
      requestId: this.requestId,
      ...initialContext,
    };
  }
  
  /**
   * Add context that will be included in all logs from this logger
   */
  addContext(context: LogContext): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }
  
  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.requestId, { ...this.context, ...context });
  }
  
  debug(message: string, context?: LogContext): void {
    log("debug", message, { ...this.context, ...context });
  }
  
  info(message: string, context?: LogContext): void {
    log("info", message, { ...this.context, ...context });
  }
  
  warn(message: string, context?: LogContext): void {
    log("warn", message, { ...this.context, ...context });
  }
  
  error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      log("error", message, { ...this.context, ...context }, errorOrContext);
    } else {
      log("error", message, { ...this.context, ...errorOrContext });
    }
  }
  
  /**
   * Time a function execution
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    this.debug(`${label} started`);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, error as Error, { duration });
      throw error;
    }
  }
  
  getRequestId(): string {
    return this.requestId!;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a new logger with request ID
 */
export function createLogger(requestId?: string, context?: LogContext): Logger {
  return new Logger(requestId, context);
}
