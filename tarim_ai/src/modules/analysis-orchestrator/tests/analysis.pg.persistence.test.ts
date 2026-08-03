import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { resetEnvCache } from '../../../config/env.js';
import {
  closePool,
  resetDatabaseClient,
  withTransaction,
  checkConnectivity,
} from '../../database/database-client.js';
import { migrateUp } from '../../database/migrations/runner.js';
import {
  resetSharedAnalysisRepository,
  createAnalysisRepository,
} from '../../database/persistence-factory.js';
import { buildInitialRecord } from '../repositories/analysis.repository.js';
import { ALL_STEP_KEYS, STEP_LABELS } from '../types/analysis.types.js';
import type { AnalysisResultResponse } from '../types/analysis.types.js';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://tarim:tarim@localhost:5433/tarim_ai';

function enablePgEnv(): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.DATABASE_ENABLED = 'true';
  process.env.PERSISTENCE_PROVIDER = 'postgresql';
  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_AUTO_MIGRATE = 'false';
  resetEnvCache();
  resetSharedAnalysisRepository();
}

describe('postgresql analysis persistence', () => {
  let connected = false;

  beforeAll(async () => {
    enablePgEnv();
    await resetDatabaseClient();
    try {
      connected = (await checkConnectivity()).connected;
    } catch {
      connected = false;
    }
    if (connected) await migrateUp();
  });

  afterAll(async () => {
    await closePool();
    process.env.PERSISTENCE_PROVIDER = 'in-memory';
    process.env.DATABASE_ENABLED = 'false';
    delete process.env.DATABASE_URL;
    resetEnvCache();
    resetSharedAnalysisRepository();
    await resetDatabaseClient();
  });

  beforeEach(async ({ skip }) => {
    if (!connected) skip();
    enablePgEnv();
    await resetDatabaseClient();
    await withTransaction(async (client) => {
      await client.query('TRUNCATE analysis_provider_snapshots CASCADE');
      await client.query('TRUNCATE analysis_steps CASCADE');
      await client.query('TRUNCATE analyses CASCADE');
    });
    resetSharedAnalysisRepository();
  });

  it('creates analysis and steps', async ({ skip }) => {
    if (!connected) skip();
    const repo = createAnalysisRepository();
    const id = randomUUID();
    const steps = ALL_STEP_KEYS.map((key) => ({
      key,
      label: STEP_LABELS[key],
      status: 'pending' as const,
    }));
    const record = buildInitialRecord(
      id,
      {
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
      steps,
      'corr-1',
      'live',
    );
    await repo.create(record);
    const loaded = await repo.findById(id);
    expect(loaded).toBeTruthy();
    expect(loaded!.steps.length).toBe(ALL_STEP_KEYS.length);
    expect(loaded!.status).toBe('queued');
  });

  it('persists step updates and final result across reload', async ({ skip }) => {
    if (!connected) skip();
    const repo = createAnalysisRepository();
    const id = randomUUID();
    const steps = ALL_STEP_KEYS.map((key) => ({
      key,
      label: STEP_LABELS[key],
      status: 'pending' as const,
    }));
    await repo.create(
      buildInitialRecord(
        id,
        {
          province: 'Gaziantep',
          district: 'Şehitkamil',
          neighborhood: 'Güngürge',
          block: '108',
          parcel: '7',
        },
        steps,
        null,
        'live',
      ),
    );

    await repo.upsertStep(id, {
      key: 'parcel',
      label: STEP_LABELS.parcel,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    await repo.upsertStep(id, {
      key: 'terrain',
      label: STEP_LABELS.terrain,
      status: 'failed',
      error: 'timeout',
      completedAt: new Date().toISOString(),
    });

    const result: AnalysisResultResponse = {
      analysisId: id,
      status: 'partial_completed',
      parcel: null,
      dataSources: [],
      satellite: null,
      terrain: null,
      climate: null,
      soil: null,
      fieldSurvey: null,
      landUsability: null,
      cropRecommendations: [],
      confidence: null,
      limitations: ['terrain_data_unavailable'],
      recommendedNextActions: [],
      recommendationsArePreliminary: true,
      generatedAt: new Date().toISOString(),
    };

    await repo.update(id, {
      status: 'partial_completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      result,
    });

    // Simulate restart: new repository instance
    resetSharedAnalysisRepository();
    const repo2 = createAnalysisRepository();
    const reloaded = await repo2.findById(id);
    expect(reloaded?.status).toBe('partial_completed');
    expect(reloaded?.result?.recommendationsArePreliminary).toBe(true);
    expect(reloaded?.result?.limitations).toContain('terrain_data_unavailable');
    const listed = await repo2.listSteps(id);
    expect(listed.find((s) => s.key === 'parcel')?.status).toBe('completed');
    expect(listed.find((s) => s.key === 'terrain')?.status).toBe('failed');
  });

  it('optimistic concurrency rejects stale version', async ({ skip }) => {
    if (!connected) skip();
    const repo = createAnalysisRepository();
    const id = randomUUID();
    const steps = ALL_STEP_KEYS.map((key) => ({
      key,
      label: STEP_LABELS[key],
      status: 'pending' as const,
    }));
    const created = await repo.create(
      buildInitialRecord(
        id,
        {
          province: 'A',
          district: 'B',
          neighborhood: 'C',
          block: '1',
          parcel: '2',
        },
        steps,
        null,
        'live',
      ),
    );

    await repo.update(id, { progress: 10 }, { expectedVersion: created.rowVersion });

    await expect(
      repo.update(id, { progress: 20 }, { expectedVersion: created.rowVersion }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('stores provider snapshot metadata without credentials', async ({ skip }) => {
    if (!connected) skip();
    const repo = createAnalysisRepository();
    const id = randomUUID();
    const steps = ALL_STEP_KEYS.map((key) => ({
      key,
      label: STEP_LABELS[key],
      status: 'pending' as const,
    }));
    await repo.create(
      buildInitialRecord(
        id,
        {
          province: 'A',
          district: 'B',
          neighborhood: 'C',
          block: '1',
          parcel: '2',
        },
        steps,
        null,
        'live',
      ),
    );
    await repo.addProviderSnapshot({
      analysisId: id,
      providerName: 'sentinel',
      stepKey: 'satellite_catalog',
      requestMetadata: { months: 6 },
      responseSummary: { usableObservationCount: 3 },
      status: 'completed',
      durationMs: 12,
    });

    const rows = await withTransaction(async (client) => {
      const r = await client.query(
        `SELECT provider_name, response_summary FROM analysis_provider_snapshots WHERE analysis_id = $1`,
        [id],
      );
      return r.rows;
    });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0])).not.toMatch(/token|secret|password/i);
  });
});
