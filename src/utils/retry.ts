/**
 * Retry logic with exponential backoff
 * 
 * Handles transient failures for API calls:
 * - Network timeouts
 * - Rate limits (429)
 * - Server errors (5xx)
 */

import { logger } from "../logger";
import { CONFIG } from "../config";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: CONFIG.ATTIO_MAX_RETRIES,
  initialDelayMs: CONFIG.ATTIO_RETRY_DELAY_MS,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Check if HTTP status code is retryable
 */
function isRetryableStatusCode(status: number, options: Required<RetryOptions>): boolean {
  return options.retryableStatusCodes.includes(status);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.name === 'NetworkError') return true;
  if (error.name === 'TimeoutError') return true;
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ENOTFOUND') return true;
  
  return false;
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      logger.debug("API request", {
        url,
        method: options.method || 'GET',
        attempt: attempt + 1,
        maxAttempts: opts.maxRetries + 1,
      });
      
      const response = await fetch(url, options);
      
      // Success - return immediately
      if (response.ok) {
        if (attempt > 0) {
          logger.info("API request succeeded after retry", {
            url,
            attempt: attempt + 1,
          });
        }
        return response;
      }
      
      // Check if status code is retryable
      if (isRetryableStatusCode(response.status, opts)) {
        logger.warn("Retryable HTTP error", {
          url,
          status: response.status,
          attempt: attempt + 1,
          maxAttempts: opts.maxRetries + 1,
        });
        
        // Don't retry on last attempt
        if (attempt < opts.maxRetries) {
          const delay = calculateDelay(attempt, opts);
          
          // Special handling for rate limits
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : delay;
            logger.warn("Rate limited, waiting before retry", { delayMs });
            await sleep(delayMs);
            continue;
          }
          
          await sleep(delay);
          continue;
        }
      }
      
      // Non-retryable status code or last attempt - return response
      return response;
      
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (isRetryableError(error)) {
        logger.warn("Retryable network error", {
          url,
          error: lastError.message,
          attempt: attempt + 1,
          maxAttempts: opts.maxRetries + 1,
        });
        
        // Don't retry on last attempt
        if (attempt < opts.maxRetries) {
          const delay = calculateDelay(attempt, opts);
          await sleep(delay);
          continue;
        }
      }
      
      // Non-retryable error or last attempt - throw
      logger.error("API request failed", lastError, {
        url,
        attempt: attempt + 1,
        retryable: isRetryableError(error),
      });
      throw lastError;
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new Error("Request failed after all retries");
}

/**
 * Retry any async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < opts.maxRetries) {
        const delay = calculateDelay(attempt, opts);
        logger.warn("Retrying after error", {
          error: lastError.message,
          attempt: attempt + 1,
          delayMs: delay,
        });
        await sleep(delay);
        continue;
      }
      
      logger.error("All retries exhausted", lastError);
      throw lastError;
    }
  }
  
  throw lastError || new Error("Operation failed after all retries");
}
