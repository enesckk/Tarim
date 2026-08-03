import { createApp } from './app.js';
import { getEnv, resetEnvCache } from './config/env.js';
import {
  closePool,
  isDatabaseEnabled,
  resetDatabaseClient,
} from './modules/database/database-client.js';
import { migrateUp } from './modules/database/migrations/runner.js';

async function main() {
  resetEnvCache();
  await resetDatabaseClient();
  const env = getEnv();

  if (isDatabaseEnabled()) {
    if (env.DATABASE_AUTO_MIGRATE) {
      const result = await migrateUp();
      console.log('[Database] migrations applied', {
        applied: result.applied.length,
      });
    }
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`Satellite service listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Shutdown] ${signal}`);
    try {
      const { getStructuredLogger, resetOperationsRuntime } = await import(
        './modules/operations/index.js'
      );
      getStructuredLogger().info({
        event: 'application.shutdown',
        signal,
      });
      resetOperationsRuntime();
    } catch {
      // ignore
    }
    server.close(async () => {
      try {
        await closePool();
      } catch (error) {
        console.error('[Shutdown] pool close failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error(
    'Failed to start server:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
