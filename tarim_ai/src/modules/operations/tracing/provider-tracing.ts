import { getStructuredLogger } from '../logging/structured-logger.js';
import { getMetricsRegistry } from '../metrics/metrics-registry.js';
import { getRequestObservabilityContext } from '../observability/async-local-request-context.js';

export async function traceExternalProviderCall<T>(input: {
  provider: string;
  operation: string;
  attempt?: number;
  cacheHit?: boolean;
  retry?: boolean;
  fallbackUsed?: boolean;
  correlationId?: string | null;
  requestId?: string | null;
  fn: () => Promise<T>;
}): Promise<T> {
  const logger = getStructuredLogger();
  const metrics = getMetricsRegistry();
  const store = getRequestObservabilityContext();
  const correlationId = input.correlationId ?? store?.correlationId ?? null;
  const requestId = input.requestId ?? store?.requestId ?? null;

  const started = Date.now();
  logger.info({
    event: 'external.provider.request.started',
    provider: input.provider,
    operation: input.operation,
    attempt: input.attempt ?? 1,
    cacheHit: input.cacheHit ?? null,
    retry: input.retry ?? false,
    fallbackUsed: input.fallbackUsed ?? false,
    correlationId,
    requestId,
  });

  try {
    const result = await input.fn();
    const durationMs = Date.now() - started;
    metrics.observe('external_provider_duration_ms', durationMs);
    if (store) {
      store.providerDurationsMs[input.provider] =
        (store.providerDurationsMs[input.provider] ?? 0) + durationMs;
    }
    logger.info({
      event: 'external.provider.request.completed',
      provider: input.provider,
      operation: input.operation,
      attempt: input.attempt ?? 1,
      status: 'ok',
      durationMs,
      cacheHit: input.cacheHit ?? null,
      retry: input.retry ?? false,
      fallbackUsed: input.fallbackUsed ?? false,
      correlationId,
      requestId,
    });
    return result;
  } catch (error) {
    const durationMs = Date.now() - started;
    metrics.increment('external_provider_errors_total');
    metrics.observe('external_provider_duration_ms', durationMs);
    if (store) {
      store.providerDurationsMs[input.provider] =
        (store.providerDurationsMs[input.provider] ?? 0) + durationMs;
    }
    logger.error({
      event: 'external.provider.request.failed',
      provider: input.provider,
      operation: input.operation,
      attempt: input.attempt ?? 1,
      status: 'error',
      durationMs,
      cacheHit: input.cacheHit ?? null,
      retry: input.retry ?? false,
      fallbackUsed: input.fallbackUsed ?? false,
      correlationId,
      requestId,
      message: error instanceof Error ? error.message.slice(0, 200) : 'provider error',
    });
    throw error;
  }
}
