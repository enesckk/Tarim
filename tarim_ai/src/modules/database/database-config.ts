import { z } from 'zod';
import { getEnv } from '../../config/env.js';

export type PersistenceProvider = 'in-memory' | 'postgresql';

export interface DatabaseRuntimeConfig {
  enabled: boolean;
  provider: PersistenceProvider;
  connectionString: string | null;
  connectionTimeoutMs: number;
  statementTimeoutMs: number;
  poolMin: number;
  poolMax: number;
  ssl: boolean;
  autoMigrate: boolean;
}

export function resolveDatabaseConfig(
  env: ReturnType<typeof getEnv> = getEnv(),
): DatabaseRuntimeConfig {
  const provider = env.PERSISTENCE_PROVIDER;
  const enabled = env.DATABASE_ENABLED && provider === 'postgresql';

  return {
    enabled,
    provider,
    connectionString: env.DATABASE_URL?.trim() || null,
    connectionTimeoutMs: env.DATABASE_CONNECTION_TIMEOUT_MS,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
    poolMin: env.DATABASE_POOL_MIN,
    poolMax: env.DATABASE_POOL_MAX,
    ssl: env.DATABASE_SSL,
    autoMigrate: env.DATABASE_AUTO_MIGRATE,
  };
}

export const persistenceMetaSchema = z.object({
  provider: z.enum(['in-memory', 'postgresql']),
  durable: z.boolean(),
  type: z.string().optional(),
});

export function persistenceMetaFor(
  provider: PersistenceProvider,
): {
  provider: PersistenceProvider;
  durable: boolean;
  type: string;
} {
  if (provider === 'postgresql') {
    return {
      provider: 'postgresql',
      durable: true,
      type: 'postgresql',
    };
  }
  return {
    provider: 'in-memory',
    durable: false,
    type: 'process_memory_only',
  };
}
