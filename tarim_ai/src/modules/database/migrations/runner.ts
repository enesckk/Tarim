import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { getPool, query, type Queryable } from '../database-client.js';
import { DatabaseError } from '../errors/database-errors.js';

export interface MigrationFile {
  id: string;
  filename: string;
  sql: string;
}

function resolveMigrationsDir(): string {
  const beside = path.dirname(fileURLToPath(import.meta.url));
  if (existsSync(path.join(beside, '001_database_extensions.sql'))) {
    return beside;
  }
  return path.join(process.cwd(), 'src/modules/database/migrations');
}

export function listMigrationFiles(dir = resolveMigrationsDir()): MigrationFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((filename) => ({
      id: filename.replace(/\.sql$/, ''),
      filename,
      sql: readFileSync(path.join(dir, filename), 'utf8'),
    }));
}

/**
 * Some older rows were stored as short numeric ids (e.g. "035") while files use
 * full stems ("035_analysis_request_options"). Treat those as the same migration.
 */
export function migrationIdsEquivalent(appliedId: string, fileId: string): boolean {
  if (appliedId === fileId) return true;
  if (/^\d+$/.test(appliedId)) {
    return fileId === appliedId || fileId.startsWith(`${appliedId}_`);
  }
  if (/^\d+$/.test(fileId)) {
    return appliedId === fileId || appliedId.startsWith(`${fileId}_`);
  }
  return false;
}

function hasAppliedMigration(appliedIds: Iterable<string>, fileId: string): boolean {
  for (const appliedId of appliedIds) {
    if (migrationIdsEquivalent(appliedId, fileId)) return true;
  }
  return false;
}

async function ensureMigrationsTable(client: Queryable): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getAppliedMigrationIds(
  client: Queryable = getPool(),
): Promise<string[]> {
  await ensureMigrationsTable(client);
  const result = await client.query<{ id: string }>(
    'SELECT id FROM schema_migrations ORDER BY id ASC',
  );
  return result.rows.map((r) => r.id);
}

export async function migrateUp(options?: {
  client?: pg.PoolClient;
}): Promise<{ applied: string[]; alreadyApplied: string[] }> {
  const files = listMigrationFiles();
  const applied: string[] = [];
  const alreadyApplied: string[] = [];

  const run = async (client: Queryable) => {
    await ensureMigrationsTable(client);
    const existing = new Set(
      (
        await client.query<{ id: string }>('SELECT id FROM schema_migrations')
      ).rows.map((r) => r.id),
    );

    for (const file of files) {
      if (hasAppliedMigration(existing, file.id)) {
        alreadyApplied.push(file.id);
        if (!existing.has(file.id)) {
          const legacyId = [...existing].find(
            (id) => id !== file.id && migrationIdsEquivalent(id, file.id),
          );
          if (legacyId) {
            await client.query(
              'UPDATE schema_migrations SET id = $1, filename = $2 WHERE id = $3',
              [file.id, file.filename, legacyId],
            );
            existing.delete(legacyId);
            existing.add(file.id);
          }
        }
        continue;
      }
      
      try {
        console.log(`Applying migration ${file.filename}...`);
        await client.query('BEGIN');
        await client.query(file.sql);
        await client.query(
          'INSERT INTO schema_migrations (id, filename) VALUES ($1, $2)',
          [file.id, file.filename],
        );
        await client.query('COMMIT');
        applied.push(file.id);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply migration ${file.filename}:`, error);
        throw error;
      }
    }
  };

  if (options?.client) {
    await run(options.client);
  } else {
    const poolClient = await getPool().connect();
    try {
      await run(poolClient);
    } finally {
      poolClient.release();
    }
  }

  return { applied, alreadyApplied };
}

export async function getMigrationStatus(): Promise<{
  status: 'up_to_date' | 'pending' | 'unavailable';
  pending: string[];
  applied: string[];
}> {
  try {
    const files = listMigrationFiles();
    const applied = await getAppliedMigrationIds();
    const pending = files.map((f) => f.id).filter((id) => !hasAppliedMigration(applied, id));
    return {
      status: pending.length === 0 ? 'up_to_date' : 'pending',
      pending,
      applied,
    };
  } catch (e) { console.error("MIGRATION ERROR:", e); 
    return { status: 'unavailable', pending: [], applied: [] };
  }
}

export async function assertMigrationsUpToDate(): Promise<void> {
  const status = await getMigrationStatus();
  if (status.status === 'pending') {
    throw new DatabaseError(
      503,
      'Database migrations are required',
      'MIGRATION_REQUIRED',
      { pending: status.pending },
    );
  }
  if (status.status === 'unavailable') {
    throw new DatabaseError(503, 'Database unavailable', 'DATABASE_UNAVAILABLE');
  }
}

/** CLI helper entry used by npm run db:migrate */
export async function runMigrationsCli(): Promise<void> {
  const result = await migrateUp();
  console.log(
    JSON.stringify(
      {
        applied: result.applied,
        alreadyApplied: result.alreadyApplied.length,
      },
      null,
      2,
    ),
  );
  await query('SELECT 1');
}
