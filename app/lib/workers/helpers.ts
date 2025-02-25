import {
  type RateLimitInfo,
  type RateLimitOptions,
  RateLimiter,
} from "./rate-limiter.server";

/**
 * Format wait time into a human-readable string
 * @param resetTime - Reset timestamp
 * @returns Formatted wait time string
 */
function formatWaitTime(resetTime: number): string {
  const seconds = Math.ceil((resetTime - Date.now()) / 1000);
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  let formattedWaitTime = `${hours} hours`;
  if (remainingMinutes > 0) {
    formattedWaitTime += ` ${remainingMinutes} minutes`;
  }
  return formattedWaitTime;
}

/**
 * Check rate limits for requests using RateLimiter
 * @param headers - Request headers for getting client IP
 * @param options - Rate limiting configuration
 * @param options.kv - Cloudflare KV namespace for storing rate limit data
 * @param options.windowSeconds - Time window in seconds (default: 60)
 * @param options.maxRequests - Max allowed requests in window (default: 10)
 * @throws {Error} When request exceeds rate limit
 */
export async function rateLimit(
  headers: Headers,
  options: RateLimitOptions,
): Promise<void> {
  const ip = headers.get("CF-Connecting-IP") || "127.0.0.1";
  const { kv, ...rateLimiterOptions } = options;
  const limiter = new RateLimiter({ kv, ...rateLimiterOptions });
  const result: RateLimitInfo = await limiter.check(ip);

  if (result.isLimited) {
    const waitTime = formatWaitTime(result.reset);
    const message = `Too many requests. Please try again in ${waitTime}`;
    throw new Error(message);
  }
}
