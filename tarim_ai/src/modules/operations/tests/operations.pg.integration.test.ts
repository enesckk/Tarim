import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../../app.js';
import { resetEnvCache } from '../../../config/env.js';
import {
  closePool,
  resetDatabaseClient,
  withTransaction,
  checkConnectivity,
} from '../../database/database-client.js';
import { migrateUp } from '../../database/migrations/runner.js';
import { resetSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { resetSharedCalibrationManagementRepository } from '../../calibration-management/repositories/calibration-management.repository.js';
import { PostgresIdempotencyRepository } from '../idempotency/postgres-idempotency.repository.js';
import { IdempotencyService } from '../idempotency/idempotency.service.js';
import {
  resetOperationsRuntime,
  getOperationsRuntime,
} from '../operations-runtime.js';
import { resetMetricsRegistry, getMetricsRegistry } from '../metrics/metrics-registry.js';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://tarim:tarim@localhost:5433/tarim_ai';

const GUNGURGE = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

function enablePgEnv() {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.DATABASE_ENABLED = 'true';
  process.env.PERSISTENCE_PROVIDER = 'postgresql';
  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_AUTO_MIGRATE = 'false';
  process.env.IDEMPOTENCY_ENABLED = 'true';
  process.env.IDEMPOTENCY_REQUIRED_FOR_CRITICAL_WRITES = 'false';
  process.env.IDEMPOTENCY_CLEANUP_ENABLED = 'false';
  process.env.CALIBRATION_MANAGEMENT_ENABLED = 'true';
  process.env.PARCEL_PROVIDER = 'mock';
  process.env.TERRAIN_PROVIDER = 'mock';
  process.env.SOIL_PROVIDER = 'mock';
  process.env.LAND_USABILITY_ENABLED = 'true';
  resetEnvCache();
  resetSharedCalibrationRepository();
  resetSharedCalibrationManagementRepository();
  resetOperationsRuntime();
  resetMetricsRegistry();
}

async function canConnect(): Promise<boolean> {
  enablePgEnv();
  await resetDatabaseClient();
  try {
    return (await checkConnectivity()).connected;
  } catch {
    return false;
  }
}

async function jsonFetch(
  port: number,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: any; headers: Headers }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

async function withServer(fn: (port: number) => Promise<void>): Promise<void> {
  resetOperationsRuntime();
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(port);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

const surveyPayload = {
  parcelQuery: GUNGURGE,
  surveyDate: '2026-07-29',
  surveyor: { id: 'field-1', name: 'Saha', organization: 'TK' },
  weatherConditions: {
    recentRainfall: 'none',
    soilSurfaceCondition: 'dry',
  },
  parcelObservations: {
    machineAccess: 'verified_accessible',
    drainageObservation: 'adequate',
    bedrockOutcrop: 'not_observed',
  },
};

describe('postgresql idempotency integration', () => {
  let connected = false;

  beforeAll(async () => {
    connected = await canConnect();
    if (!connected) return;
    await migrateUp();
  });

  afterAll(async () => {
    await closePool();
    resetEnvCache();
    resetOperationsRuntime();
  });

  beforeEach(async ({ skip }) => {
    if (!connected) skip();
    enablePgEnv();
    await resetDatabaseClient();
    await withTransaction(async (client) => {
      await client.query('TRUNCATE idempotency_records CASCADE');
      await client.query('TRUNCATE calibration_audit_events CASCADE');
      await client.query('TRUNCATE calibration_publications CASCADE');
      await client.query('TRUNCATE calibration_impact_analyses CASCADE');
      await client.query('TRUNCATE calibration_reviews CASCADE');
      await client.query('TRUNCATE calibration_sources CASCADE');
      await client.query('TRUNCATE crop_requirement_profiles CASCADE');
      await client.query('TRUNCATE field_survey_audit_events CASCADE');
      await client.query('TRUNCATE field_survey_samples CASCADE');
      await client.query('TRUNCATE field_surveys CASCADE');
    });
    resetOperationsRuntime();
    resetMetricsRegistry();
  });

  it('maps postgres rows and survives repository restart', async ({ skip }) => {
    if (!connected) skip();
    const repo1 = new PostgresIdempotencyRepository();
    const service = new IdempotencyService(repo1, {
      ttlSeconds: 3600,
      replayClientErrors: true,
      inProgressStatusCode: 409,
      requiredForCriticalWrites: false,
    });
    const begin = await service.begin({
      operation: 'field-survey.create',
      key: 'pg-restart-001',
      requestHash: 'hash-1',
      correlationId: 'corr-1',
    });
    expect(begin.action).toBe('proceed');
    await service.complete({
      operation: 'field-survey.create',
      key: 'pg-restart-001',
      requestHash: 'hash-1',
      responseStatus: 201,
      responseBody: { id: '11111111-1111-1111-1111-111111111111' },
      resourceId: '11111111-1111-1111-1111-111111111111',
    });

    const repo2 = new PostgresIdempotencyRepository();
    const service2 = new IdempotencyService(repo2, {
      ttlSeconds: 3600,
      replayClientErrors: true,
      inProgressStatusCode: 409,
      requiredForCriticalWrites: false,
    });
    const replay = await service2.begin({
      operation: 'field-survey.create',
      key: 'pg-restart-001',
      requestHash: 'hash-1',
    });
    expect(replay.action).toBe('replay');
    if (replay.action === 'replay') {
      expect(replay.record.state).toBe('completed');
      expect(replay.record.responseStatus).toBe(201);
    }
  });

  it('replays survey create over HTTP and avoids duplicates', async ({ skip }) => {
    if (!connected) skip();
    await withServer(async (port) => {
      expect(getOperationsRuntime().durable).toBe(true);
      const key = `survey-create-${randomUUID().slice(0, 8)}`;
      const headers = { 'Idempotency-Key': key, 'X-Correlation-Id': 'pg-corr-1' };

      const first = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers,
        body: JSON.stringify(surveyPayload),
      });
      expect(first.status).toBe(201);
      const surveyId = first.body.id as string;

      const second = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers,
        body: JSON.stringify(surveyPayload),
      });
      expect(second.status).toBe(201);
      expect(second.headers.get('idempotency-replayed')).toBe('true');
      expect(second.body.id).toBe(surveyId);

      const third = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers,
        body: JSON.stringify(surveyPayload),
      });
      expect(third.status).toBe(201);
      expect(third.headers.get('idempotency-replayed')).toBe('true');

      const count = await withTransaction(async (client) => {
        const result = await client.query('SELECT COUNT(*)::int AS c FROM field_surveys');
        return result.rows[0].c as number;
      });
      expect(count).toBe(1);

      const audits = await withTransaction(async (client) => {
        const result = await client.query(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events WHERE event_type = 'SURVEY_CREATED'`,
        );
        return result.rows[0].c as number;
      });
      expect(audits).toBe(1);
      expect(getMetricsRegistry().summary().idempotencyReplays).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles parallel same-key create without duplicate resources', async ({ skip }) => {
    if (!connected) skip();
    await withServer(async (port) => {
      const key = `parallel-create-${randomUUID().slice(0, 8)}`;
      const headers = { 'Idempotency-Key': key };
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          jsonFetch(port, '/api/field-surveys', {
            method: 'POST',
            headers,
            body: JSON.stringify(surveyPayload),
          }),
        ),
      );

      const successes = results.filter((r) => r.status === 201);
      const inProgress = results.filter(
        (r) =>
          r.status === 409 &&
          r.body?.code === 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
      );
      expect(successes.length + inProgress.length).toBe(10);
      expect(successes.length).toBeGreaterThanOrEqual(1);

      const ids = new Set(
        successes.map((r) => r.body.id as string).filter(Boolean),
      );
      expect(ids.size).toBe(1);

      const count = await withTransaction(async (client) => {
        const result = await client.query('SELECT COUNT(*)::int AS c FROM field_surveys');
        return result.rows[0].c as number;
      });
      expect(count).toBe(1);

      const leaked = results.some(
        (r) =>
          typeof r.body?.error === 'string' &&
          String(r.body.error).toLowerCase().includes('duplicate key'),
      );
      expect(leaked).toBe(false);
    });
  });

  it('rolls back business work without completed idempotency record', async ({ skip }) => {
    if (!connected) skip();
    const repo = new PostgresIdempotencyRepository();
    const service = new IdempotencyService(repo, {
      ttlSeconds: 3600,
      replayClientErrors: true,
      inProgressStatusCode: 409,
      requiredForCriticalWrites: false,
    });
    await service.begin({
      operation: 'field-survey.create',
      key: 'rollback-key-01',
      requestHash: 'rh',
    });
    await service.markFailed({
      operation: 'field-survey.create',
      key: 'rollback-key-01',
      requestHash: 'rh',
      errorCode: 'HTTP_500',
      responseStatus: 500,
    });
    const found = await repo.find('field-survey.create', 'rollback-key-01');
    expect(found?.state).toBe('failed');
    expect(found?.responseStatus).toBe(500);
  });
});
