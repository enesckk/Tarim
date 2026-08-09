#!/usr/bin/env node
import { getEnv, resetEnvCache } from '../../config/env.js';
import { closePool, resetDatabaseClient } from './database-client.js';
import { migrateUp } from './migrations/runner.js';

async function main() {
  process.env.DATABASE_ENABLED = process.env.DATABASE_ENABLED || 'true';
  process.env.PERSISTENCE_PROVIDER =
    process.env.PERSISTENCE_PROVIDER || 'postgresql';
  resetEnvCache();
  await resetDatabaseClient();

  const env = getEnv();
  if (!env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const result = await migrateUp();
  console.log(
    JSON.stringify(
      {
        applied: result.applied,
        alreadyAppliedCount: result.alreadyApplied.length,
      },
      null,
      2,
    ),
  );
  await closePool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
