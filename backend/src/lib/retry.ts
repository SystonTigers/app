/**
 * Retry utilities with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalDuration: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'RATE_LIMIT'],
};

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoff(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);
  const delay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (±20% randomness) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.floor(delay + jitter);
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString();
  const errorCode = error.code || '';

  return retryableErrors.some(
    (retryableError) =>
      errorMessage.includes(retryableError) || errorCode === retryableError
  );
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: any = null;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalDuration: Date.now() - startTime,
      };
    } catch (error: any) {
      lastError = error;
      console.warn(`[Retry] Attempt ${attempt + 1}/${opts.maxAttempts} failed:`, error.message);

      // Don't retry if this is not a retryable error
      if (!isRetryable(error, opts.retryableErrors)) {
        console.error('[Retry] Non-retryable error, aborting:', error.message);
        return {
          success: false,
          error: error.message || String(error),
          attempts: attempt + 1,
          totalDuration: Date.now() - startTime,
        };
      }

      // Don't wait after the last attempt
      if (attempt < opts.maxAttempts - 1) {
        const delay = calculateBackoff(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.backoffMultiplier
        );
        console.log(`[Retry] Waiting ${delay}ms before attempt ${attempt + 2}...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || String(lastError),
    attempts: opts.maxAttempts,
    totalDuration: Date.now() - startTime,
  };
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const result = await retryWithBackoff(async () => {
    const response = await fetch(url, init);

    // Retry on 5xx errors and 429 (rate limit)
    if (response.status >= 500 || response.status === 429) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.code = response.status === 429 ? 'RATE_LIMIT' : 'SERVICE_UNAVAILABLE';
      throw error;
    }

    // Don't retry 4xx errors (client errors)
    if (response.status >= 400) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.code = 'CLIENT_ERROR';
      throw error;
    }

    return response;
  }, options);

  if (!result.success) {
    throw new Error(result.error || 'Fetch failed after retries');
  }

  return result.data!;
}
