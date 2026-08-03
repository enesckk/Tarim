import { getEnv } from '../../config/env.js';
import { resolvePersistenceProvider } from '../database/persistence-factory.js';
import { InMemoryIdempotencyRepository } from './idempotency/in-memory-idempotency.repository.js';
import { PostgresIdempotencyRepository } from './idempotency/postgres-idempotency.repository.js';
import {
  IdempotencyService,
  type IdempotencyPolicy,
} from './idempotency/idempotency.service.js';
import type { IdempotencyRepository } from './idempotency/idempotency.types.js';
import { getStructuredLogger } from './logging/structured-logger.js';
import { getMetricsRegistry } from './metrics/metrics-registry.js';

export interface OperationsConfig {
  idempotencyEnabled: boolean;
  requiredForCriticalWrites: boolean;
  ttlSeconds: number;
  replayClientErrors: boolean;
  inProgressStatusCode: 409 | 425;
  maximumKeyLength: number;
  cleanupEnabled: boolean;
  cleanupIntervalSeconds: number;
  cleanupBatchSize: number;
  slowRequestThresholdMs: number;
  correlationEnabled: boolean;
  metricsEnabled: boolean;
}

export interface OperationsRuntime {
  config: OperationsConfig;
  idempotency: IdempotencyService;
  repository: IdempotencyRepository;
  persistenceProvider: 'in-memory' | 'postgresql';
  durable: boolean;
  stopCleanup: () => void;
}

let runtime: OperationsRuntime | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function resolveOperationsConfig(): OperationsConfig {
  const env = getEnv();
  return {
    idempotencyEnabled: env.IDEMPOTENCY_ENABLED,
    requiredForCriticalWrites: env.IDEMPOTENCY_REQUIRED_FOR_CRITICAL_WRITES,
    ttlSeconds: env.IDEMPOTENCY_TTL_SECONDS,
    replayClientErrors: env.IDEMPOTENCY_REPLAY_CLIENT_ERRORS,
    inProgressStatusCode: env.IDEMPOTENCY_IN_PROGRESS_STATUS_CODE,
    maximumKeyLength: 128,
    cleanupEnabled: env.IDEMPOTENCY_CLEANUP_ENABLED,
    cleanupIntervalSeconds: env.IDEMPOTENCY_CLEANUP_INTERVAL_SECONDS,
    cleanupBatchSize: env.IDEMPOTENCY_CLEANUP_BATCH_SIZE,
    slowRequestThresholdMs: env.SLOW_REQUEST_THRESHOLD_MS,
    correlationEnabled: env.CORRELATION_ENABLED,
    metricsEnabled: env.METRICS_ENABLED,
  };
}

export function createIdempotencyRepository(): IdempotencyRepository {
  const provider = resolvePersistenceProvider();
  if (provider === 'postgresql') {
    return new PostgresIdempotencyRepository();
  }
  return new InMemoryIdempotencyRepository();
}

export function getOperationsRuntime(): OperationsRuntime {
  if (!runtime) {
    runtime = buildRuntime();
  }
  return runtime;
}

function buildRuntime(): OperationsRuntime {
  const config = resolveOperationsConfig();
  const provider = resolvePersistenceProvider();
  const repository = createIdempotencyRepository();
  const policy: IdempotencyPolicy = {
    ttlSeconds: config.ttlSeconds,
    replayClientErrors: config.replayClientErrors,
    inProgressStatusCode: config.inProgressStatusCode,
    requiredForCriticalWrites: config.requiredForCriticalWrites,
  };
  const idempotency = new IdempotencyService(repository, policy);
  const durable = provider === 'postgresql';

  const stopCleanup = () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  };

  if (
    config.cleanupEnabled &&
    process.env.NODE_ENV !== 'test' &&
    process.env.VITEST !== 'true'
  ) {
    cleanupTimer = setInterval(() => {
      void (async () => {
        try {
          const removed = await idempotency.cleanupExpired(config.cleanupBatchSize);
          if (removed > 0) {
            getStructuredLogger().info({
              event: 'idempotency.cleanup.completed',
              removed,
              persistenceProvider: provider,
            });
          }
        } catch (error) {
          getStructuredLogger().warn({
            event: 'idempotency.cleanup.failed',
            message: error instanceof Error ? error.message : 'cleanup failed',
          });
        }
      })();
    }, config.cleanupIntervalSeconds * 1000);
    cleanupTimer.unref?.();
  }

  getStructuredLogger().info({
    event: 'application.startup',
    persistenceProvider: provider,
    idempotencyEnabled: config.idempotencyEnabled,
    metricsEnabled: config.metricsEnabled,
  });

  void getMetricsRegistry();

  return {
    config,
    idempotency,
    repository,
    persistenceProvider: provider,
    durable,
    stopCleanup,
  };
}

export function resetOperationsRuntime(): void {
  if (runtime) {
    runtime.stopCleanup();
  }
  runtime = null;
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
