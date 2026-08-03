export interface MetricsSummary {
  httpRequests: number;
  httpErrors: number;
  idempotencyRecordsCreated: number;
  idempotencyReplays: number;
  idempotencyConflicts: number;
  databaseRollbacks: number;
  externalProviderErrors: number;
  httpRequestDurationMsAvg: number | null;
  databaseTransactionDurationMsAvg: number | null;
  externalProviderDurationMsAvg: number | null;
}

export interface MetricsRegistry {
  increment(name: string, value?: number, labels?: Record<string, string>): void;
  observe(name: string, valueMs: number, labels?: Record<string, string>): void;
  summary(): MetricsSummary;
  reset(): void;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export class InMemoryMetricsRegistry implements MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly timings = new Map<string, number[]>();

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  observe(name: string, valueMs: number): void {
    const list = this.timings.get(name) ?? [];
    list.push(valueMs);
    if (list.length > 5_000) list.shift();
    this.timings.set(name, list);
  }

  summary(): MetricsSummary {
    return {
      httpRequests: this.counters.get('http_requests_total') ?? 0,
      httpErrors: this.counters.get('http_request_errors_total') ?? 0,
      idempotencyRecordsCreated:
        this.counters.get('idempotency_records_created_total') ?? 0,
      idempotencyReplays: this.counters.get('idempotency_replays_total') ?? 0,
      idempotencyConflicts: this.counters.get('idempotency_conflicts_total') ?? 0,
      databaseRollbacks:
        this.counters.get('database_transaction_rollbacks_total') ?? 0,
      externalProviderErrors:
        this.counters.get('external_provider_errors_total') ?? 0,
      httpRequestDurationMsAvg: avg(
        this.timings.get('http_request_duration_ms') ?? [],
      ),
      databaseTransactionDurationMsAvg: avg(
        this.timings.get('database_transaction_duration_ms') ?? [],
      ),
      externalProviderDurationMsAvg: avg(
        this.timings.get('external_provider_duration_ms') ?? [],
      ),
    };
  }

  reset(): void {
    this.counters.clear();
    this.timings.clear();
  }
}

let sharedMetrics: MetricsRegistry | null = null;

export function getMetricsRegistry(): MetricsRegistry {
  if (!sharedMetrics) {
    sharedMetrics = new InMemoryMetricsRegistry();
  }
  return sharedMetrics;
}

export function setMetricsRegistry(registry: MetricsRegistry): void {
  sharedMetrics = registry;
}

export function resetMetricsRegistry(): void {
  sharedMetrics = null;
}
