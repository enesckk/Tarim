import pg from 'pg';
import {
  resolveDatabaseConfig,
  type DatabaseRuntimeConfig,
} from './database-config.js';
import { DatabaseError, mapPgError } from './errors/database-errors.js';

const { Pool } = pg;

export type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

let sharedPool: pg.Pool | null = null;
let sharedConfig: DatabaseRuntimeConfig | null = null;

export function getDatabaseConfig(): DatabaseRuntimeConfig {
  if (!sharedConfig) {
    sharedConfig = resolveDatabaseConfig();
  }
  return sharedConfig;
}

export function resetDatabaseConfigCache(): void {
  sharedConfig = null;
}

export function isDatabaseEnabled(): boolean {
  return getDatabaseConfig().enabled;
}

export function getPool(): pg.Pool {
  const config = getDatabaseConfig();
  if (!config.enabled || !config.connectionString) {
    throw new DatabaseError(
      503,
      'Database is not enabled',
      'DATABASE_CONFIGURATION_INVALID',
    );
  }
  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString: config.connectionString,
      min: config.poolMin,
      max: config.poolMax,
      connectionTimeoutMillis: config.connectionTimeoutMs,
      statement_timeout: config.statementTimeoutMs,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });
    sharedPool.on('error', (err) => {
      console.error('[Database] idle client error', {
        message: err instanceof Error ? err.message : 'unknown',
      });
    });
  }
  return sharedPool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
  client?: Queryable,
): Promise<pg.QueryResult<T>> {
  const q = client ?? getPool();
  try {
    return await q.query<T>(text, params);
  } catch (error) {
    mapPgError(error);
  }
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  let client: pg.PoolClient;
  const started = Date.now();
  try {
    client = await pool.connect();
  } catch (error) {
    mapPgError(error);
  }

  try {
    await client.query('BEGIN');
    try {
      const { getStructuredLogger } = await import(
        '../operations/logging/structured-logger.js'
      );
        const { getRequestObservabilityContext } = await import(
          '../operations/observability/async-local-request-context.js'
        );
      const { getMetricsRegistry } = await import(
        '../operations/metrics/metrics-registry.js'
      );
        const ctx = getRequestObservabilityContext();
        getStructuredLogger().info({
          event: 'database.transaction.started',
          correlationId: ctx?.correlationId ?? null,
          requestId: ctx?.requestId ?? null,
          operation: ctx?.operation ?? null,
        });
      void getMetricsRegistry();
    } catch {
      // operations module optional during early bootstrap
    }
    const result = await fn(client);
    await client.query('COMMIT');
    try {
      const { getStructuredLogger } = await import(
        '../operations/logging/structured-logger.js'
      );
        const { getRequestObservabilityContext } = await import(
          '../operations/observability/async-local-request-context.js'
        );
      const { getMetricsRegistry } = await import(
        '../operations/metrics/metrics-registry.js'
      );
      const durationMs = Date.now() - started;
        const ctx = getRequestObservabilityContext();
        if (ctx) {
          // Aggregate DB time across multiple transactions per HTTP request.
          ctx.databaseDurationMs += durationMs;
        }
      getStructuredLogger().info({
        event: 'database.transaction.committed',
        durationMs,
          correlationId: ctx?.correlationId ?? null,
          requestId: ctx?.requestId ?? null,
          operation: ctx?.operation ?? null,
      });
      getMetricsRegistry().observe('database_transaction_duration_ms', durationMs);
    } catch {
      // ignore
    }
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    try {
      const { getStructuredLogger } = await import(
        '../operations/logging/structured-logger.js'
      );
      const { getRequestObservabilityContext } = await import(
        '../operations/observability/async-local-request-context.js'
      );
      const { getMetricsRegistry } = await import(
        '../operations/metrics/metrics-registry.js'
      );
      const ctx = getRequestObservabilityContext();
      getStructuredLogger().warn({
        event: 'database.transaction.rolled_back',
        durationMs: Date.now() - started,
        correlationId: ctx?.correlationId ?? null,
        requestId: ctx?.requestId ?? null,
        operation: ctx?.operation ?? null,
      });
      getMetricsRegistry().increment('database_transaction_rollbacks_total');
    } catch {
      // ignore
    }
    if (
      (error as { code?: string })?.code === 'IDEMPOTENCY_CONFLICT' ||
      error instanceof DatabaseError ||
      (error as { statusCode?: number })?.statusCode
    ) {
      throw error;
    }
    mapPgError(error);
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (!sharedPool) return;
  const pool = sharedPool;
  sharedPool = null;
  try {
    await pool.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('more than once')) {
      throw error;
    }
  }
}

/** Test helper: replace pool/config (e.g. after env change). */
export async function resetDatabaseClient(): Promise<void> {
  await closePool();
  resetDatabaseConfigCache();
}

export async function checkConnectivity(): Promise<{
  connected: boolean;
  latencyMs: number;
}> {
  const started = Date.now();
  try {
    await query('SELECT 1 AS ok');
    return { connected: true, latencyMs: Date.now() - started };
  } catch {
    return { connected: false, latencyMs: Date.now() - started };
  }
}
