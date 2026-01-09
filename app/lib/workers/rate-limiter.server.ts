import { logger } from "~/lib/logger";
import { getErrorMessage } from "~/lib/utils";

const RATE_LIMIT_WINDOW_SECONDS = 60; // Default 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 10; // Default 10 requests

export interface RateLimitOptions {
	windowSeconds?: number; // Time window size in seconds
	maxRequests?: number; // Maximum allowed requests within window
	kv: KVNamespace; // Cloudflare KV namespace
}

export interface RateLimitInfo {
	isLimited: boolean; // Whether rate limit has been reached
	remaining: number; // Remaining request count
	reset: number; // Reset timestamp (milliseconds)
}

export class RateLimiter {
	private windowSeconds: number; // Time window size in seconds
	private maxRequests: number; // Maximum allowed requests within window
	private kv: KVNamespace; // Cloudflare KV namespace
	private prefix = "rate_limit"; // KV key prefix

	constructor(options: RateLimitOptions) {
		this.windowSeconds = options.windowSeconds ?? RATE_LIMIT_WINDOW_SECONDS;
		this.maxRequests = options.maxRequests ?? RATE_LIMIT_MAX_REQUESTS;
		this.kv = options.kv;
	}

	/**
	 * Generate KV key
	 * @param identifier Client identifier
	 * @returns KV key
	 */
	private getKey(identifier: string): string {
		return `${this.prefix}:${identifier}`;
	}

	/**
	 * Check rate limit
	 * @param identifier Client identifier
	 * @returns Rate limit information
	 */
	async check(identifier: string): Promise<RateLimitInfo> {
		const key = this.getKey(identifier); // Get KV key
		const now = Date.now(); // Current timestamp

		try {
			const result = await this.kv.get<{
				remaining: number;
				reset: number;
			}>(key, "json");

			// First visit, set initial values
			if (!result) {
				const newResult = {
					remaining: this.maxRequests - 1,
					reset: now + this.windowSeconds * 1000,
				};

				await this.kv.put(key, JSON.stringify(newResult), {
					expirationTtl: this.windowSeconds,
				});

				return { isLimited: false, ...newResult };
			}

			// If reset time has passed, start counting again
			if (now >= result.reset) {
				const newResult = {
					remaining: this.maxRequests - 1,
					reset: now + this.windowSeconds * 1000,
				};

				await this.kv.put(key, JSON.stringify(newResult), {
					expirationTtl: this.windowSeconds,
				});

				return { isLimited: false, ...newResult };
			}

			// Check if rate limited
			const isLimited = result.remaining <= 0;
			const remaining = isLimited ? 0 : result.remaining - 1;
			const reset = isLimited ? result.reset : now + this.windowSeconds * 1000;

			// If not limited, update remaining requests and reset time
			if (!isLimited) {
				await this.kv.put(key, JSON.stringify({ remaining, reset }), {
					expirationTtl: this.windowSeconds,
				});
			}

			return {
				isLimited,
				remaining,
				reset,
			};
		} catch (err) {
			const message = getErrorMessage(err);
			logger.error({ event: "rate_limit_error", message });
			// On error, don't limit and return default values
			return {
				isLimited: false,
				remaining: this.maxRequests,
				reset: now + this.windowSeconds * 1000,
			};
		}
	}

	/**
	 * Reset rate limit counter for specified identifier
	 * @param identifier Client identifier
	 */
	async reset(identifier: string): Promise<void> {
		const key = this.getKey(identifier); // Get KV key
		await this.kv.delete(key); // Delete from KV
	}
}
