export interface RateLimiter {
  /**
   * Blocks until a request slot is available. Never throws: on infrastructure
   * failure it degrades to a no-op so the import cannot be hard-blocked (the
   * provider's 429 handling remains the backstop).
   */
  acquire(): Promise<void>;
}

export class NoopRateLimiter implements RateLimiter {
  async acquire(): Promise<void> {}
}
