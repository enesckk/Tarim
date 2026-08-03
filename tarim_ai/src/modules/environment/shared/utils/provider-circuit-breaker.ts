/**
 * Simple circuit breaker shared by climate/soil upstream providers.
 * Opens after consecutiveFailures threshold; half-open after cooldown.
 */
export class ProviderCircuitBreaker {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly options: {
      failureThreshold: number;
      cooldownMs: number;
      name: string;
    },
  ) {}

  isOpen(now = Date.now()): boolean {
    if (this.openedAt == null) {
      return false;
    }
    if (now - this.openedAt >= this.options.cooldownMs) {
      // allow a probe attempt
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  recordFailure(now = Date.now()): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.openedAt = now;
      console.warn(`[CircuitBreaker] open`, {
        name: this.options.name,
        failures: this.consecutiveFailures,
        cooldownMs: this.options.cooldownMs,
      });
    }
  }

  getState(now = Date.now()): 'closed' | 'open' | 'half_open' {
    if (this.openedAt == null) {
      return 'closed';
    }
    if (now - this.openedAt >= this.options.cooldownMs) {
      return 'half_open';
    }
    return 'open';
  }

  /** Test helper */
  reset(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }
}
