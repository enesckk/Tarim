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
import { getSharedCropRepository } from '../../crop-recommendation/repositories/json-crop.repository.js';
import { CropKnowledgeService } from '../../crop-recommendation/services/crop-knowledge.service.js';
import { resetSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { resetSharedCalibrationManagementRepository } from '../../calibration-management/repositories/calibration-management.repository.js';
import { resetOperationsRuntime, getOperationsRuntime } from '../operations-runtime.js';
import { resetMetricsRegistry } from '../metrics/metrics-registry.js';

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

const SAMPLE_POINTS = [
  { longitude: 37.47502, latitude: 37.20628, accuracyMeters: 3 },
  { longitude: 37.4748, latitude: 37.2065, accuracyMeters: 5 },
  { longitude: 37.4753, latitude: 37.2065, accuracyMeters: 4 },
  { longitude: 37.4751, latitude: 37.206, accuracyMeters: 6 },
  { longitude: 37.4755, latitude: 37.2062, accuracyMeters: 8 },
];
const DEPTHS = [28, 31, 35, 37, 40] as const;
const STONINESS = ['low', 'medium', 'medium', 'medium', 'low'] as const;

const admin = {
  id: 'admin-1',
  name: 'Admin',
  role: 'administrator',
} as const;
const soilScientist = {
  id: 'soil-1',
  name: 'Soil Expert',
  role: 'soil_scientist',
  organization: 'Test Org',
} as const;
const publisher = {
  id: 'rev-1',
  name: 'Authorized Reviewer',
  role: 'authorized_reviewer',
} as const;

async function jsonFetch(
  port: number,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const rawHeaders = (init?.headers ?? {}) as Record<string, string>;
  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawHeaders)) {
    if (k.toLowerCase() === 'content-type') continue;
    normalizedHeaders[k] = v;
  }
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...normalizedHeaders,
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

function enablePgEnv(): void {
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

function isInProgress(res: { status: number; body: unknown }): boolean {
  const bodyCode = typeof res.body === 'object' && res.body && 'code' in res.body
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res.body as any).code
    : undefined;
  return (
    (res.status === 409 || res.status === 425) &&
    bodyCode === 'IDEMPOTENCY_REQUEST_IN_PROGRESS'
  );
}

function isConflictDifferentPayload(res: { status: number; body: unknown }): boolean {
  const code = typeof res.body === 'object' && res.body && 'code' in res.body
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res.body as any).code
    : undefined;
  return (
    res.status === 409 &&
    code === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'
  );
}

function isReplay(res: { headers: Headers }): boolean {
  return res.headers.get('idempotency-replayed') === 'true';
}

describe('postgresql idempotency parallel live validation', () => {
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

  it('field-survey.create: 10 parallel + replay + same-key conflict + restart replay', async () => {
    if (!connected) return;

    await withServer(async (port) => {
      expect(getOperationsRuntime().durable).toBe(true);

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

      const surveyKey = `parallel-survey-create-${randomUUID().slice(0, 8)}`;

      const parallel = await Promise.all(
        Array.from({ length: 10 }).map(async (_, i) => {
          const corr = `parallel-survey-create-${i}-${randomUUID().slice(0, 8)}`;
          return jsonFetch(port, '/api/field-surveys', {
            method: 'POST',
            headers: { 'Idempotency-Key': surveyKey, 'X-Correlation-Id': corr },
            body: JSON.stringify(surveyPayload),
          });
        }),
      );

      const leakedRawConstraintError = parallel.some((r) =>
        typeof r.body === 'object'
          ? JSON.stringify(r.body)
              .toLowerCase()
              .includes('violates unique constraint') ||
            JSON.stringify(r.body).toLowerCase().includes('duplicate key value') ||
            JSON.stringify(r.body).toLowerCase().includes('constraint')
          : false,
      );
      expect(leakedRawConstraintError).toBe(false);

      const successCount = parallel.filter(
        (r) => r.status === 201,
      ).length;
      const replayCount = parallel.filter(isReplay).length;
      const inProgressCount = parallel.filter(isInProgress).length;
      const otherErrorCount = parallel.length - successCount - inProgressCount;

      // Business execution = 1 created survey + 1 SURVEY_CREATED audit event.
      const surveyCreatedCounts = await withTransaction(async (client) => {
        const surveyCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_surveys`,
          [],
        );
        const createdAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE event_type = 'SURVEY_CREATED'`,
          [],
        );
        return {
          surveyCount: surveyCount.rows[0]?.c ?? 0,
          createdAuditCount: createdAudits.rows[0]?.c ?? 0,
        };
      });

      expect(surveyCreatedCounts.surveyCount).toBe(1);
      expect(surveyCreatedCounts.createdAuditCount).toBe(1);

      // Capture final resource state from the only survey.
      const finalResource = await withTransaction(async (client) => {
        const s = await client.query<{
          id: string;
          status: string;
          approved_at: string | null;
          submitted_at: string | null;
        }>(
          `SELECT id, status, approved_at, submitted_at FROM field_surveys LIMIT 1`,
          [],
        );
        return s.rows[0];
      });

      // Processing -> completed replay check.
      const replayRes = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers: {
          'Idempotency-Key': surveyKey,
          'X-Correlation-Id': `replay-${randomUUID().slice(0, 8)}`,
        },
        body: JSON.stringify(surveyPayload),
      });
      expect(replayRes.status).toBe(201);
      expect(isReplay(replayRes)).toBe(true);

      // Same key / different payload conflict.
      const conflictRes = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers: {
          'Idempotency-Key': surveyKey,
          'X-Correlation-Id': `conflict-${randomUUID().slice(0, 8)}`,
        },
        body: JSON.stringify({ ...surveyPayload, surveyDate: '2026-07-30' }),
      });
      expect(isConflictDifferentPayload(conflictRes)).toBe(true);

      // Restart replay: same DB state, new HTTP server instance.
      const countsBeforeRestart = await withTransaction(async (client) => {
        const surveyCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_surveys`,
          [],
        );
        const createdAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE event_type = 'SURVEY_CREATED'`,
          [],
        );
        return {
          surveyCount: surveyCount.rows[0]?.c ?? 0,
          createdAuditCount: createdAudits.rows[0]?.c ?? 0,
        };
      });

      await withServer(async (port2) => {
        const replayAfterRestart = await jsonFetch(
          port2,
          '/api/field-surveys',
          {
            method: 'POST',
            headers: {
              'Idempotency-Key': surveyKey,
              'X-Correlation-Id': `restart-replay-${randomUUID().slice(
                0,
                8,
              )}`,
            },
            body: JSON.stringify(surveyPayload),
          },
        );
        expect(replayAfterRestart.status).toBe(201);
        expect(isReplay(replayAfterRestart)).toBe(true);

        const countsAfterRestart = await withTransaction(async (client) => {
          const surveyCount = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM field_surveys`,
            [],
          );
          const createdAudits = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
             WHERE event_type = 'SURVEY_CREATED'`,
            [],
          );
          return {
            surveyCount: surveyCount.rows[0]?.c ?? 0,
            createdAuditCount: createdAudits.rows[0]?.c ?? 0,
          };
        });

        expect(countsAfterRestart).toEqual(countsBeforeRestart);
      });

      const report = {
        operation: 'field-survey.create',
        parallelRequestCount: 10,
        successCount,
        replayCount,
        inProgressCount,
        otherErrorCount,
        businessExecutionCount: surveyCreatedCounts.createdAuditCount,
        resourceCount: surveyCreatedCounts.surveyCount,
        matchingAuditCount: surveyCreatedCounts.createdAuditCount,
        rawConstraintErrorLeaked: leakedRawConstraintError,
        finalResourceState: finalResource,
      };

      console.log('PARALLEL_LIVE_IDEMPOTENCY_RESULT', JSON.stringify(report));
    });
  });

  it('field-survey.sample.add: 10 parallel + replay + same-key conflict + restart replay', async () => {
    if (!connected) return;

    await withServer(async (port) => {
      // Setup survey (non-parallel).
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
      const surveyRes = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers: { 'X-Correlation-Id': `setup-survey-${randomUUID().slice(0, 8)}` },
        body: JSON.stringify(surveyPayload),
      });
      expect(surveyRes.status).toBe(201);
      const surveyId = (surveyRes.body as { id: string }).id;

      const samplePayload = {
        location: SAMPLE_POINTS[0]!,
        rootableSoilDepthCm: DEPTHS[0]!,
        surfaceStoniness: STONINESS[0]!,
        bedrockObserved: false,
        bedrockOutcrop: 'not_observed',
        drainageObservation: 'adequate',
        samplingMethod: 'soil_auger',
      };

      const sampleKey = `parallel-sample-add-${randomUUID().slice(0, 8)}`;

      const before = await withTransaction(async (client) => {
        const sampleCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_samples WHERE survey_id = $1`,
          [surveyId],
        );
        const sampleAudit = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SAMPLE_ADDED'`,
          [surveyId],
        );
        return {
          sampleCount: sampleCount.rows[0]?.c ?? 0,
          sampleAuditCount: sampleAudit.rows[0]?.c ?? 0,
        };
      });

      const parallel = await Promise.all(
        Array.from({ length: 10 }).map(async (_, i) => {
          const corr = `parallel-sample-add-${i}-${randomUUID().slice(0, 8)}`;
          return jsonFetch(
            port,
            `/api/field-surveys/${surveyId}/samples`,
            {
              method: 'POST',
              headers: {
                'Idempotency-Key': sampleKey,
                'X-Correlation-Id': corr,
              },
              body: JSON.stringify(samplePayload),
            },
          );
        }),
      );

      const leakedRawConstraintError = parallel.some((r) =>
        typeof r.body === 'object'
          ? JSON.stringify(r.body)
              .toLowerCase()
              .includes('violates unique constraint') ||
            JSON.stringify(r.body).toLowerCase().includes('duplicate key value') ||
            JSON.stringify(r.body).toLowerCase().includes('constraint')
          : false,
      );
      expect(leakedRawConstraintError).toBe(false);

      const success = parallel.filter((r) => r.status === 201);
      const firstSuccess = success[0];
      const sampleId = firstSuccess
        ? (firstSuccess.body as { samples?: Array<{ id: string }> }).samples?.[0]
            ?.id
        : undefined;

      const successCount = parallel.filter((r) => r.status === 201).length;
      const replayCount = parallel.filter(isReplay).length;
      const inProgressCount = parallel.filter(isInProgress).length;
      const otherErrorCount = parallel.length - successCount - inProgressCount;

      const after = await withTransaction(async (client) => {
        const sampleCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_samples WHERE survey_id = $1`,
          [surveyId],
        );
        const sampleAudit = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SAMPLE_ADDED'`,
          [surveyId],
        );
        return {
          sampleCount: sampleCount.rows[0]?.c ?? 0,
          sampleAuditCount: sampleAudit.rows[0]?.c ?? 0,
        };
      });

      const matchingSampleCount = after.sampleCount - before.sampleCount;
      const matchingSampleAuditCount = after.sampleAuditCount - before.sampleAuditCount;

      expect(matchingSampleCount).toBe(1);
      expect(matchingSampleAuditCount).toBe(1);
      expect(after.sampleCount - before.sampleCount).toBe(1);
      expect(after.sampleAuditCount - before.sampleAuditCount).toBe(1);

      // Processing -> completed replay check.
      const replayRes = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/samples`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': sampleKey,
            'X-Correlation-Id': `replay-${randomUUID().slice(0, 8)}`,
          },
          body: JSON.stringify(samplePayload),
        },
      );
      expect(replayRes.status).toBe(201);
      expect(isReplay(replayRes)).toBe(true);
      if (sampleId) {
        const replaySampleId = (replayRes.body as { samples?: Array<{ id: string }> })
          .samples?.[0]?.id;
        expect(replaySampleId).toBe(sampleId);
      }

      // Same key / different payload conflict.
      const conflictRes = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/samples`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': sampleKey,
            'X-Correlation-Id': `conflict-${randomUUID().slice(0, 8)}`,
          },
          body: JSON.stringify({
            ...samplePayload,
            rootableSoilDepthCm: DEPTHS[1]!,
          }),
        },
      );
      expect(isConflictDifferentPayload(conflictRes)).toBe(true);

      // Verify no extra mutations after conflict.
      const afterConflict = await withTransaction(async (client) => {
        const sampleCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_samples WHERE survey_id = $1`,
          [surveyId],
        );
        const sampleAudit = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SAMPLE_ADDED'`,
          [surveyId],
        );
        return {
          sampleCount: sampleCount.rows[0]?.c ?? 0,
          sampleAuditCount: sampleAudit.rows[0]?.c ?? 0,
        };
      });
      expect(afterConflict).toEqual(after);

      // Restart replay.
      const countsBeforeRestart = await withTransaction(async (client) => {
        const sampleCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_samples WHERE survey_id = $1`,
          [surveyId],
        );
        const sampleAudit = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SAMPLE_ADDED'`,
          [surveyId],
        );
        return {
          sampleCount: sampleCount.rows[0]?.c ?? 0,
          sampleAuditCount: sampleAudit.rows[0]?.c ?? 0,
        };
      });

      await withServer(async (port2) => {
        const replayAfterRestart = await jsonFetch(
          port2,
          `/api/field-surveys/${surveyId}/samples`,
          {
            method: 'POST',
            headers: {
              'Idempotency-Key': sampleKey,
              'X-Correlation-Id': `restart-replay-${randomUUID().slice(
                0,
                8,
              )}`,
            },
            body: JSON.stringify(samplePayload),
          },
        );
        expect(replayAfterRestart.status).toBe(201);
        expect(isReplay(replayAfterRestart)).toBe(true);

        const countsAfterRestart = await withTransaction(async (client) => {
          const sampleCount = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM field_survey_samples WHERE survey_id = $1`,
            [surveyId],
          );
          const sampleAudit = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
             WHERE survey_id = $1 AND event_type = 'SAMPLE_ADDED'`,
            [surveyId],
          );
          return {
            sampleCount: sampleCount.rows[0]?.c ?? 0,
            sampleAuditCount: sampleAudit.rows[0]?.c ?? 0,
          };
        });
        expect(countsAfterRestart).toEqual(countsBeforeRestart);
      });

      const finalSample = await withTransaction(async (client) => {
        const s = await client.query<{
          id: string;
          location: unknown;
          rootable_soil_depth_cm: number;
        }>(
          `SELECT id, location, rootable_soil_depth_cm
           FROM field_survey_samples
           WHERE survey_id = $1
           LIMIT 1`,
          [surveyId],
        );
        return s.rows[0];
      });

      const report = {
        operation: 'field-survey.sample.add',
        parallelRequestCount: 10,
        successCount,
        replayCount,
        inProgressCount,
        otherErrorCount,
        businessExecutionCount: matchingSampleAuditCount,
        resourceCount: matchingSampleCount,
        matchingAuditCount: matchingSampleAuditCount,
        rawConstraintErrorLeaked: leakedRawConstraintError,
        finalResourceState: finalSample,
      };

      console.log('PARALLEL_LIVE_IDEMPOTENCY_RESULT', JSON.stringify(report));
    });
  });

  it('field-survey.approve: 10 parallel + replay + same-key conflict + restart replay', async () => {
    if (!connected) return;

    await withServer(async (port) => {
      // Setup survey and make it approvable.
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

      const surveyRes = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers: { 'X-Correlation-Id': `setup-survey-${randomUUID().slice(0, 8)}` },
        body: JSON.stringify(surveyPayload),
      });
      expect(surveyRes.status).toBe(201);
      const surveyId = (surveyRes.body as { id: string }).id;

      for (let i = 0; i < 5; i += 1) {
        const samplePayload = {
          location: SAMPLE_POINTS[i]!,
          rootableSoilDepthCm: DEPTHS[i]!,
          surfaceStoniness: STONINESS[i]!,
          bedrockObserved: false,
          bedrockOutcrop: 'not_observed',
          drainageObservation: 'adequate',
          samplingMethod: 'soil_auger',
        };
        const r = await jsonFetch(
          port,
          `/api/field-surveys/${surveyId}/samples`,
          {
            method: 'POST',
            headers: { 'X-Correlation-Id': `setup-sample-${i}-${randomUUID().slice(0, 8)}` },
            body: JSON.stringify(samplePayload),
          },
        );
        expect(r.status).toBe(201);
      }

      await jsonFetch(port, `/api/field-surveys/${surveyId}/submit`, {
        method: 'POST',
        headers: { 'X-Correlation-Id': `setup-submit-${randomUUID().slice(0, 8)}` },
        body: JSON.stringify({}),
      });
      await jsonFetch(port, `/api/field-surveys/${surveyId}/start-review`, {
        method: 'POST',
        headers: {
          'X-Correlation-Id': `setup-start-${randomUUID().slice(0, 8)}`,
        },
        body: JSON.stringify({}),
      });

      const approvePayload = {
        reviewer: { id: 'rev-live-1', name: 'Reviewer Live', role: 'soil_scientist' },
        comments: 'OK',
      };

      const approveKey = `parallel-approve-${randomUUID().slice(0, 8)}`;

      const before = await withTransaction(async (client) => {
        const approvedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SURVEY_APPROVED'`,
          [surveyId],
        );
        return {
          approvedAuditCount: approvedAudits.rows[0]?.c ?? 0,
        };
      });

      const parallel = await Promise.all(
        Array.from({ length: 10 }).map(async (_, i) => {
          const corr = `parallel-approve-${i}-${randomUUID().slice(0, 8)}`;
          return jsonFetch(
            port,
            `/api/field-surveys/${surveyId}/approve`,
            {
              method: 'POST',
              headers: {
                'Idempotency-Key': approveKey,
                'X-Correlation-Id': corr,
              },
              body: JSON.stringify(approvePayload),
            },
          );
        }),
      );

      const leakedRawConstraintError = parallel.some((r) =>
        typeof r.body === 'object'
          ? JSON.stringify(r.body)
              .toLowerCase()
              .includes('violates unique constraint') ||
            JSON.stringify(r.body).toLowerCase().includes('duplicate key value') ||
            JSON.stringify(r.body).toLowerCase().includes('constraint')
          : false,
      );
      expect(leakedRawConstraintError).toBe(false);

      const success = parallel.filter((r) => r.status === 200);
      const firstSuccess = success[0];
      const approvedAt = firstSuccess
        ? (firstSuccess.body as { approvedAt: string }).approvedAt
        : undefined;

      const successCount = success.length;
      const replayCount = parallel.filter(isReplay).length;
      const inProgressCount = parallel.filter(isInProgress).length;
      const otherErrorCount = parallel.length - successCount - inProgressCount;

      for (const s of success) {
        expect((s.body as { approvedAt: string }).approvedAt).toBe(approvedAt);
      }

      const after = await withTransaction(async (client) => {
        const approvedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SURVEY_APPROVED'`,
          [surveyId],
        );
        const survey = await client.query<{
          id: string;
          status: string;
          approved_at: string | null;
        }>(
          `SELECT id, status, approved_at FROM field_surveys WHERE id = $1`,
          [surveyId],
        );
        return {
          approvedAuditCount: approvedAudits.rows[0]?.c ?? 0,
          survey: survey.rows[0],
        };
      });

      const matchingAuditCount = after.approvedAuditCount - before.approvedAuditCount;
      expect(matchingAuditCount).toBe(1);
      expect(after.survey.status).toBe('approved');
      if (approvedAt) {
        const receivedIso = after.survey.approved_at
          ? new Date(after.survey.approved_at).toISOString()
          : null;
        const expectedIso = new Date(approvedAt).toISOString();
        expect(receivedIso).toBe(expectedIso);
      }

      // Processing -> completed replay check.
      const replayRes = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/approve`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': approveKey,
            'X-Correlation-Id': `replay-${randomUUID().slice(0, 8)}`,
          },
          body: JSON.stringify(approvePayload),
        },
      );
      expect(replayRes.status).toBe(200);
      expect(isReplay(replayRes)).toBe(true);
      expect((replayRes.body as { approvedAt: string }).approvedAt).toBe(approvedAt);

      // Same key / different payload conflict.
      const conflictRes = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/approve`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': approveKey,
            'X-Correlation-Id': `conflict-${randomUUID().slice(0, 8)}`,
          },
          body: JSON.stringify({ ...approvePayload, comments: 'DIFFERENT' }),
        },
      );
      expect(isConflictDifferentPayload(conflictRes)).toBe(true);

      const afterConflict = await withTransaction(async (client) => {
        const approvedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SURVEY_APPROVED'`,
          [surveyId],
        );
        return {
          approvedAuditCount: approvedAudits.rows[0]?.c ?? 0,
        };
      });
      expect(afterConflict.approvedAuditCount).toBe(after.approvedAuditCount);

      // Restart replay.
      const countsBeforeRestart = await withTransaction(async (client) => {
        const approvedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SURVEY_APPROVED'`,
          [surveyId],
        );
        return {
          approvedAuditCount: approvedAudits.rows[0]?.c ?? 0,
        };
      });

      await withServer(async (port2) => {
        const replayAfterRestart = await jsonFetch(
          port2,
          `/api/field-surveys/${surveyId}/approve`,
          {
            method: 'POST',
            headers: {
              'Idempotency-Key': approveKey,
              'X-Correlation-Id': `restart-replay-${randomUUID().slice(
                0,
                8,
              )}`,
            },
            body: JSON.stringify(approvePayload),
          },
        );
        expect(replayAfterRestart.status).toBe(200);
        expect(isReplay(replayAfterRestart)).toBe(true);
        expect((replayAfterRestart.body as { approvedAt: string }).approvedAt).toBe(
          approvedAt,
        );

        const countsAfterRestart = await withTransaction(async (client) => {
          const approvedAudits = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
             WHERE survey_id = $1 AND event_type = 'SURVEY_APPROVED'`,
            [surveyId],
          );
          return {
            approvedAuditCount: approvedAudits.rows[0]?.c ?? 0,
          };
        });
        expect(countsAfterRestart).toEqual(countsBeforeRestart);
      });

      const report = {
        operation: 'field-survey.approve',
        parallelRequestCount: 10,
        successCount,
        replayCount,
        inProgressCount,
        otherErrorCount,
        businessExecutionCount: matchingAuditCount,
        resourceCount: 1,
        matchingAuditCount,
        rawConstraintErrorLeaked: leakedRawConstraintError,
        finalResourceState: after.survey,
      };

      console.log('PARALLEL_LIVE_IDEMPOTENCY_RESULT', JSON.stringify(report));
    });
  });

  it('calibration.profile.publish (supersede A): 10 parallel + replay + same-key conflict + restart replay', async () => {
    if (!connected) return;

    await withServer(async (port) => {
      const crops = new CropKnowledgeService(getSharedCropRepository());
      const requirements = crops.getById('barley').physicalRequirements;
      const source = {
        type: 'expert_opinion',
        title: 'barley source',
        supports: ['rootableSoilDepth'],
        verificationStatus: 'unverified',
      };

      // Create and approve one profile (no previous published profile).
      const createProfileRes = await jsonFetch(
        port,
        '/api/calibration-management/crop-requirements',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            cropId: 'barley',
            requirements,
            createdBy: admin,
            sources: [source],
          }),
        },
      );
      expect(createProfileRes.status).toBe(201);
      const profileId = (createProfileRes.body as { profile: { id: string } }).profile
        .id;

      for (const path of ['submit', 'start-review'] as const) {
        const r = await jsonFetch(port, `/api/calibration-management/crop-requirements/${profileId}/${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ actor: publisher, reason: path }),
        });
        expect(r.status).toBe(200);
      }

      const reviewRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/reviews`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            reviewer: soilScientist,
            decision: 'approved',
            reviewedFields: ['rootableSoilDepth'],
            comments: 'looks fine',
            fieldStatusUpdates: { rootableSoilDepth: 'expert_reviewed' },
          }),
        },
      );
      expect(reviewRes.status).toBe(201);

      const approveProfileRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/approve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ actor: publisher, reason: 'approve' }),
        },
      );
      expect(approveProfileRes.status).toBe(200);

      const impactRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/impact-analysis`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            actor: admin,
            existingScores: { barley: { score: 70, rank: 1 } },
          }),
        },
      );
      expect(impactRes.status).toBe(200);

      const publishKey = `parallel-publish-${randomUUID().slice(0, 8)}`;
      const publishPayload = { actor: publisher, reason: 'publish' };

      const before = await withTransaction(async (client) => {
        const pubCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
          [profileId],
        );
        const publishedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
          [profileId],
        );
        const prevSuperseded = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PREVIOUS_PROFILE_SUPERSEDED'`,
          [profileId],
        );
        const cropId = await client.query<{ crop_id: string }>(
          `SELECT crop_id FROM crop_requirement_profiles WHERE id = $1`,
          [profileId],
        );
        const cropIdValue = cropId.rows[0]?.crop_id ?? '';
        const activePublished = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM crop_requirement_profiles
           WHERE crop_id = $1 AND status = 'published'`,
          [cropIdValue],
        );
        return {
          pubCount: pubCount.rows[0]?.c ?? 0,
          publishedAuditCount: publishedAudits.rows[0]?.c ?? 0,
          prevSupersededCount: prevSuperseded.rows[0]?.c ?? 0,
          activePublishedCount: activePublished.rows[0]?.c ?? 0,
          cropId: cropIdValue,
        };
      });

      const parallel = await Promise.all(
        Array.from({ length: 10 }).map(async (_, i) => {
          const corr = `parallel-publish-${i}-${randomUUID().slice(0, 8)}`;
          return jsonFetch(
            port,
            `/api/calibration-management/crop-requirements/${profileId}/publish`,
            {
              method: 'POST',
              headers: {
                'Idempotency-Key': publishKey,
                'X-Correlation-Id': corr,
              },
              body: JSON.stringify(publishPayload),
            },
          );
        }),
      );

      const leakedRawConstraintError = parallel.some((r) =>
        typeof r.body === 'object'
          ? JSON.stringify(r.body)
              .toLowerCase()
              .includes('violates unique constraint') ||
            JSON.stringify(r.body).toLowerCase().includes('duplicate key value') ||
            JSON.stringify(r.body).toLowerCase().includes('constraint')
          : false,
      );
      expect(leakedRawConstraintError).toBe(false);

      const successCount = parallel.filter((r) => r.status === 200).length;
      const replayCount = parallel.filter(isReplay).length;
      const inProgressCount = parallel.filter(isInProgress).length;
      const otherErrorCount = parallel.length - successCount - inProgressCount;

      const after = await withTransaction(async (client) => {
        const pubCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
          [profileId],
        );
        const publishedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
          [profileId],
        );
        const prevSuperseded = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PREVIOUS_PROFILE_SUPERSEDED'`,
          [profileId],
        );
        const activePublished = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM crop_requirement_profiles
           WHERE crop_id = $1 AND status = 'published'`,
          [before.cropId],
        );
        const profile = await client.query<{ id: string; status: string }>(
          `SELECT id, status FROM crop_requirement_profiles WHERE id = $1`,
          [profileId],
        );
        return {
          pubCount: pubCount.rows[0]?.c ?? 0,
          publishedAuditCount: publishedAudits.rows[0]?.c ?? 0,
          prevSupersededCount: prevSuperseded.rows[0]?.c ?? 0,
          activePublishedCount: activePublished.rows[0]?.c ?? 0,
          profile: profile.rows[0],
        };
      });

      const publicationCount = after.pubCount - before.pubCount;
      const matchingAuditCount = after.publishedAuditCount - before.publishedAuditCount;
      const previousSupersededCount =
        after.prevSupersededCount - before.prevSupersededCount;

      expect(publicationCount).toBe(1);
      expect(matchingAuditCount).toBe(1);
      expect(previousSupersededCount).toBe(0);
      expect(after.activePublishedCount).toBe(1);

      // Processing -> completed replay check.
      const replayRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/publish`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': publishKey,
            'X-Correlation-Id': `replay-${randomUUID().slice(0, 8)}`,
          },
          body: JSON.stringify(publishPayload),
        },
      );
      expect(replayRes.status).toBe(200);
      expect(isReplay(replayRes)).toBe(true);

      const conflictRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/publish`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': publishKey,
            'X-Correlation-Id': `conflict-${randomUUID().slice(0, 8)}`,
          },
          body: JSON.stringify({ ...publishPayload, reason: 'publish-different' }),
        },
      );
      expect(isConflictDifferentPayload(conflictRes)).toBe(true);

      // Restart replay.
      const countsBeforeRestart = await withTransaction(async (client) => {
        const pubCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
          [profileId],
        );
        const publishedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
          [profileId],
        );
        return {
          pubCount: pubCount.rows[0]?.c ?? 0,
          publishedAuditCount: publishedAudits.rows[0]?.c ?? 0,
        };
      });

      await withServer(async (port2) => {
        const replayAfterRestart = await jsonFetch(
          port2,
          `/api/calibration-management/crop-requirements/${profileId}/publish`,
          {
            method: 'POST',
            headers: {
              'Idempotency-Key': publishKey,
              'X-Correlation-Id': `restart-replay-${randomUUID().slice(
                0,
                8,
              )}`,
            },
            body: JSON.stringify(publishPayload),
          },
        );
        expect(replayAfterRestart.status).toBe(200);
        expect(isReplay(replayAfterRestart)).toBe(true);

        const countsAfterRestart = await withTransaction(async (client) => {
          const pubCount = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
            [profileId],
          );
          const publishedAudits = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM calibration_audit_events
             WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
            [profileId],
          );
          return {
            pubCount: pubCount.rows[0]?.c ?? 0,
            publishedAuditCount: publishedAudits.rows[0]?.c ?? 0,
          };
        });
        expect(countsAfterRestart).toEqual(countsBeforeRestart);
      });

      const report = {
        operation: 'calibration.profile.publish',
        parallelRequestCount: 10,
        successCount,
        replayCount,
        inProgressCount,
        otherErrorCount,
        businessExecutionCount: matchingAuditCount,
        resourceCount: publicationCount,
        matchingAuditCount,
        previousSupersededCount,
        activePublishedCount: after.activePublishedCount,
        publicationCount,
        rawConstraintErrorLeaked: leakedRawConstraintError,
        finalResourceState: after.profile,
      };

      console.log('PARALLEL_LIVE_IDEMPOTENCY_RESULT', JSON.stringify(report));
    });
  });

  it('calibration.profile.publish (supersede B): 10 parallel + replay + same-key conflict + restart replay', async () => {
    if (!connected) return;

    await withServer(async (port) => {
      const crops = new CropKnowledgeService(getSharedCropRepository());
      const requirements = crops.getById('barley').physicalRequirements;
      const source = {
        type: 'expert_opinion',
        title: 'barley source',
        supports: ['rootableSoilDepth'],
        verificationStatus: 'unverified',
      };

      async function createAndApproveProfile(
        reasonSuffix: string,
      ): Promise<string> {
        const createProfileRes = await jsonFetch(
          port,
          '/api/calibration-management/crop-requirements',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              cropId: 'barley',
              requirements,
              createdBy: admin,
              sources: [source],
            }),
          },
        );
        expect(createProfileRes.status).toBe(201);
        const profileId = (createProfileRes.body as { profile: { id: string } }).profile
          .id;

        for (const path of ['submit', 'start-review'] as const) {
          const r = await jsonFetch(
            port,
            `/api/calibration-management/crop-requirements/${profileId}/${path}`,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ actor: publisher, reason: `${path}-${reasonSuffix}` }),
            },
          );
          expect(r.status).toBe(200);
        }

        const reviewRes = await jsonFetch(
          port,
          `/api/calibration-management/crop-requirements/${profileId}/reviews`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              reviewer: soilScientist,
              decision: 'approved',
              reviewedFields: ['rootableSoilDepth'],
              comments: `looks fine-${reasonSuffix}`,
              fieldStatusUpdates: { rootableSoilDepth: 'expert_reviewed' },
            }),
          },
        );
        expect(reviewRes.status).toBe(201);

        const approveProfileRes = await jsonFetch(
          port,
          `/api/calibration-management/crop-requirements/${profileId}/approve`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ actor: publisher, reason: `approve-${reasonSuffix}` }),
          },
        );
        expect(approveProfileRes.status).toBe(200);

        const impactRes = await jsonFetch(
          port,
          `/api/calibration-management/crop-requirements/${profileId}/impact-analysis`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              actor: admin,
              existingScores: { barley: { score: 70, rank: 1 } },
            }),
          },
        );
        expect(impactRes.status).toBe(200);

        const pubKey = `setup-publish-${randomUUID().slice(0, 8)}`;
        const corrPublish = `setup-publish-corr-${randomUUID().slice(0, 8)}`;
        const pubRes = await jsonFetch(
          port,
          `/api/calibration-management/crop-requirements/${profileId}/publish`,
          {
            method: 'POST',
            headers: { 'Idempotency-Key': pubKey, 'X-Correlation-Id': corrPublish },
            body: JSON.stringify({ actor: publisher, reason: 'publish' }),
          },
        );
        expect(pubRes.status).toBe(200);
        return profileId;
      }

      const prevProfileId = await createAndApproveProfile('previous');

      // Create another approvable profile; it should supersede prev.
      const currCreateRes = await jsonFetch(
        port,
        '/api/calibration-management/crop-requirements',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            cropId: 'barley',
            requirements,
            createdBy: admin,
            sources: [source],
          }),
        },
      );
      expect(currCreateRes.status).toBe(201);
      const profileId = (currCreateRes.body as { profile: { id: string } }).profile.id;

      for (const path of ['submit', 'start-review'] as const) {
        const r = await jsonFetch(
          port,
          `/api/calibration-management/crop-requirements/${profileId}/${path}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ actor: publisher, reason: `${path}-current` }),
          },
        );
        expect(r.status).toBe(200);
      }

      const reviewRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/reviews`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            reviewer: soilScientist,
            decision: 'approved',
            reviewedFields: ['rootableSoilDepth'],
            comments: 'looks fine-current',
            fieldStatusUpdates: { rootableSoilDepth: 'expert_reviewed' },
          }),
        },
      );
      expect(reviewRes.status).toBe(201);

      const approveProfileRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/approve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ actor: publisher, reason: 'approve-current' }),
        },
      );
      expect(approveProfileRes.status).toBe(200);

      const impactRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/impact-analysis`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            actor: admin,
            existingScores: { barley: { score: 70, rank: 1 } },
          }),
        },
      );
      expect(impactRes.status).toBe(200);

      const publishKey = `parallel-publish-${randomUUID().slice(0, 8)}`;
      const publishPayload = { actor: publisher, reason: 'publish' };

      const before = await withTransaction(async (client) => {
        const cropIdRes = await client.query<{ crop_id: string }>(
          `SELECT crop_id FROM crop_requirement_profiles WHERE id = $1`,
          [profileId],
        );
        const cropId = cropIdRes.rows[0]?.crop_id;
        const pubCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
          [profileId],
        );
        const publishedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
          [profileId],
        );
        const prevSuperseded = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PREVIOUS_PROFILE_SUPERSEDED'`,
          [prevProfileId],
        );
        const activePublished = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM crop_requirement_profiles
           WHERE crop_id = $1 AND status = 'published'`,
          [cropId],
        );
        return {
          cropId,
          pubCount: pubCount.rows[0]?.c ?? 0,
          publishedAuditCount: publishedAudits.rows[0]?.c ?? 0,
          prevSupersededCount: prevSuperseded.rows[0]?.c ?? 0,
          activePublishedCount: activePublished.rows[0]?.c ?? 0,
        };
      });

      const parallel = await Promise.all(
        Array.from({ length: 10 }).map(async (_, i) => {
          const corr = `parallel-publish-${i}-${randomUUID().slice(0, 8)}`;
          return jsonFetch(
            port,
            `/api/calibration-management/crop-requirements/${profileId}/publish`,
            {
              method: 'POST',
              headers: {
                'Idempotency-Key': publishKey,
                'X-Correlation-Id': corr,
              },
              body: JSON.stringify(publishPayload),
            },
          );
        }),
      );

      const successCount = parallel.filter((r) => r.status === 200).length;
      const replayCount = parallel.filter(isReplay).length;
      const inProgressCount = parallel.filter(isInProgress).length;
      const otherErrorCount = parallel.length - successCount - inProgressCount;

      const leakedRawConstraintError = parallel.some((r) =>
        typeof r.body === 'object'
          ? JSON.stringify(r.body)
              .toLowerCase()
              .includes('violates unique constraint') ||
            JSON.stringify(r.body).toLowerCase().includes('duplicate key value') ||
            JSON.stringify(r.body).toLowerCase().includes('constraint')
          : false,
      );
      expect(leakedRawConstraintError).toBe(false);

      const after = await withTransaction(async (client) => {
        const pubCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
          [profileId],
        );
        const publishedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
          [profileId],
        );
        const prevSuperseded = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PREVIOUS_PROFILE_SUPERSEDED'`,
          [prevProfileId],
        );
        const activePublished = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM crop_requirement_profiles
           WHERE crop_id = $1 AND status = 'published'`,
          [before.cropId],
        );
        const prevProfile = await client.query<{ status: string }>(
          `SELECT status FROM crop_requirement_profiles WHERE id = $1`,
          [prevProfileId],
        );
        const currProfile = await client.query<{ status: string }>(
          `SELECT status FROM crop_requirement_profiles WHERE id = $1`,
          [profileId],
        );
        return {
          pubCount: pubCount.rows[0]?.c ?? 0,
          publishedAuditCount: publishedAudits.rows[0]?.c ?? 0,
          prevSupersededCount: prevSuperseded.rows[0]?.c ?? 0,
          activePublishedCount: activePublished.rows[0]?.c ?? 0,
          prevStatus: prevProfile.rows[0]?.status ?? null,
          currStatus: currProfile.rows[0]?.status ?? null,
        };
      });

      const publicationCount = after.pubCount - before.pubCount;
      const matchingAuditCount = after.publishedAuditCount - before.publishedAuditCount;
      const previousSupersededCount =
        after.prevSupersededCount - before.prevSupersededCount;

      expect(publicationCount).toBe(1);
      expect(matchingAuditCount).toBe(1);
      expect(previousSupersededCount).toBe(1);
      expect(after.activePublishedCount).toBe(1);
      expect(after.prevStatus).toBe('superseded');
      expect(after.currStatus).toBe('published');

      const replayRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/publish`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': publishKey,
            'X-Correlation-Id': `replay-${randomUUID().slice(0, 8)}`,
          },
          body: JSON.stringify(publishPayload),
        },
      );
      expect(replayRes.status).toBe(200);
      expect(isReplay(replayRes)).toBe(true);

      const conflictRes = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/publish`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': publishKey,
            'X-Correlation-Id': `conflict-${randomUUID().slice(0, 8)}`,
          },
          body: JSON.stringify({ ...publishPayload, reason: 'publish-different' }),
        },
      );
      expect(isConflictDifferentPayload(conflictRes)).toBe(true);

      const countsBeforeRestart = await withTransaction(async (client) => {
        const pubCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
          [profileId],
        );
        const publishedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
          [profileId],
        );
        return {
          pubCount: pubCount.rows[0]?.c ?? 0,
          publishedAuditCount: publishedAudits.rows[0]?.c ?? 0,
        };
      });

      await withServer(async (port2) => {
        const replayAfterRestart = await jsonFetch(
          port2,
          `/api/calibration-management/crop-requirements/${profileId}/publish`,
          {
            method: 'POST',
            headers: {
              'Idempotency-Key': publishKey,
              'X-Correlation-Id': `restart-replay-${randomUUID().slice(
                0,
                8,
              )}`,
            },
            body: JSON.stringify(publishPayload),
          },
        );
        expect(replayAfterRestart.status).toBe(200);
        expect(isReplay(replayAfterRestart)).toBe(true);

        const countsAfterRestart = await withTransaction(async (client) => {
          const pubCount = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
            [profileId],
          );
          const publishedAudits = await client.query<{ c: number }>(
            `SELECT COUNT(*)::int AS c FROM calibration_audit_events
             WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
            [profileId],
          );
          return {
            pubCount: pubCount.rows[0]?.c ?? 0,
            publishedAuditCount: publishedAudits.rows[0]?.c ?? 0,
          };
        });
        expect(countsAfterRestart).toEqual(countsBeforeRestart);
      });

      const report = {
        operation: 'calibration.profile.publish',
        parallelRequestCount: 10,
        successCount,
        replayCount,
        inProgressCount,
        otherErrorCount,
        businessExecutionCount: matchingAuditCount,
        resourceCount: publicationCount,
        matchingAuditCount,
        previousSupersededCount,
        activePublishedCount: after.activePublishedCount,
        publicationCount,
        rawConstraintErrorLeaked: leakedRawConstraintError,
        finalResourceState: {
          previousProfile: { id: prevProfileId, status: after.prevStatus },
          currentProfile: { id: profileId, status: after.currStatus },
        },
      };

      console.log('PARALLEL_LIVE_IDEMPOTENCY_RESULT', JSON.stringify(report));
    });
  });
});

