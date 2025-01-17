type LogLevel = "debug" | "info" | "warn" | "error";

interface LogParams {
  event: string;
  level?: LogLevel;
  [key: string]: unknown;
}

type BaseLogParams = Omit<LogParams, "level"> & { event: string };

/**
 * Structured Logging Utility
 * Format and output JSON logs according to Cloudflare Workers Logs best practices
 *
 * @see {@link https://developers.cloudflare.com/workers/observability/logs/workers-logs/}
 * @param {LogParams} params - Log parameters object
 * @param {string} params.event - Event name, used to identify the type of log event
 * @param {LogLevel} [params.level] - Log level, defaults to 'info'
 *
 * @example
 * logger.info({
 *   event: 'auth_success',
 *   user_id: '123',
 *   provider: 'google'
 * });
 *
 * // Output:
 * // {
 * //   event: 'auth_success',
 * //   level: 'info',
 * //   user_id: '123',
 * //   provider: 'google',
 * //   timestamp: '2024-03-21T08:00:00.000Z'
 * // }
 */
export const logger = {
  log(params: LogParams) {
    console.log({
      ...params,
      level: params.level || "info",
      timestamp: new Date().toISOString(),
    });
  },

  debug(params: BaseLogParams) {
    this.log({ ...params, level: "debug" });
  },

  info(params: BaseLogParams) {
    this.log({ ...params, level: "info" });
  },

  warn(params: BaseLogParams) {
    this.log({ ...params, level: "warn" });
  },

  error(params: BaseLogParams) {
    this.log({ ...params, level: "error" });
  },
};
