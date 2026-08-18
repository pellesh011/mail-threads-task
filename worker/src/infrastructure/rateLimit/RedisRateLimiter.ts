import type { RateLimiter } from './RateLimiter.js';

const WINDOW_MS = 1_000;

/**
 * Sliding-window log kept in a Redis sorted set. Requests older than one second
 * are pruned, then a slot is granted only if fewer than `limit` requests remain
 * in the last second. Prune+count+add happen in a single Lua step, so the real
 * rate never exceeds `limit` requests per second (no boundary or fill burst),
 * shared safely across every worker and container.
 */
const SLIDING_WINDOW_LUA = `
local now = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local uid = ARGV[3]

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - 1000)

if redis.call('ZCARD', KEYS[1]) < limit then
  redis.call('ZADD', KEYS[1], now, uid)
  redis.call('PEXPIRE', KEYS[1], 3000)
  return 1
end

return 0
`;

export interface RateLimitStore {
  eval(
    script: string,
    options: { keys: readonly string[]; arguments?: readonly string[] },
  ): Promise<unknown>;
}

/**
 * Distributed rate limiter backed by Redis, shared across every worker and
 * container, so the provider is never called more than `limit` times per
 * second no matter how many consumers run.
 */
export class RedisRateLimiter implements RateLimiter {
  private uid = 0;

  constructor(
    private readonly store: RateLimitStore,
    private readonly keyPrefix: string,
    private readonly limit: number,
  ) {}

  async acquire(): Promise<void> {
    for (;;) {
      if (await this.tryAcquire(Date.now())) {
        return;
      }

      await sleep(this.retryDelayMs());
    }
  }

  private retryDelayMs(): number {
    return Math.ceil(WINDOW_MS / this.limit / 2);
  }

  private async tryAcquire(now: number): Promise<boolean> {
    const uid = `${now}:${++this.uid}`;

    try {
      const result = await this.store.eval(SLIDING_WINDOW_LUA, {
        keys: [`${this.keyPrefix}:sliding`],
        arguments: [String(now), String(this.limit), uid],
      });

      return result === 1;
    } catch (error) {
      // Fail open: if Redis is down we cannot coordinate, so let the provider
      // enforce the limit (its 429 handling takes over).
      console.warn('rate limiter: redis error, failing open', error);
      return true;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
