import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { DatabaseHealthService } from '../../database/database-health.service.js';
import { getDatabaseConfig, isDatabaseEnabled } from '../../database/database-client.js';
import { getOperationsRuntime } from '../operations-runtime.js';
import { getMetricsRegistry } from '../metrics/metrics-registry.js';

export function createOperationsHealthRouter(): Router {
  const router = createRouter();
  const dbHealth = new DatabaseHealthService();

  router.get('/', async (_req, res, next) => {
    try {
      const runtime = getOperationsRuntime();
      const config = getDatabaseConfig();
      let persistenceConnected = runtime.persistenceProvider === 'in-memory';
      let persistenceStatus: 'healthy' | 'unhealthy' | 'disabled' | 'degraded' = 'healthy';

      if (runtime.persistenceProvider === 'postgresql') {
        const status = await dbHealth.getStatus();
        persistenceConnected = status.connected;
        persistenceStatus =
          status.status === 'healthy'
            ? 'healthy'
            : status.status === 'disabled'
              ? 'disabled'
              : status.status === 'degraded'
                ? 'degraded'
                : 'unhealthy';
      }

      const ready =
        runtime.persistenceProvider === 'in-memory' ||
        (isDatabaseEnabled() && persistenceConnected);

      res.json({
        status: ready ? 'healthy' : 'unhealthy',
        readiness: ready ? 'ready' : 'not_ready',
        liveness: 'alive',
        persistence: {
          provider: runtime.persistenceProvider,
          connected: persistenceConnected,
          durable: runtime.durable,
          status: persistenceStatus,
          enabled: config.enabled,
        },
        idempotency: {
          enabled: runtime.config.idempotencyEnabled,
          provider: runtime.persistenceProvider,
          durable: runtime.durable,
          requiredForCriticalWrites: runtime.config.requiredForCriticalWrites,
          ttlSeconds: runtime.config.ttlSeconds,
        },
        observability: {
          structuredLogging: true,
          correlation: runtime.config.correlationEnabled,
          metrics: runtime.config.metricsEnabled,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/metrics-summary', (_req, res) => {
    const runtime = getOperationsRuntime();
    if (!runtime.config.metricsEnabled) {
      res.status(404).json({
        error: 'Metrics disabled',
        code: 'METRICS_DISABLED',
      });
      return;
    }
    res.json(getMetricsRegistry().summary());
  });

  router.get('/ready', async (_req, res, next) => {
    try {
      const runtime = getOperationsRuntime();
      if (runtime.persistenceProvider === 'postgresql') {
        const status = await dbHealth.getStatus();
        if (!status.connected) {
          res.status(503).json({ readiness: 'not_ready', reason: 'database_unavailable' });
          return;
        }
      }
      res.json({ readiness: 'ready' });
    } catch (error) {
      next(error);
    }
  });

  router.get('/live', (_req, res) => {
    res.json({ liveness: 'alive' });
  });

  return router;
}
