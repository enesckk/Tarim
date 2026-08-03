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

async function withServer(
  fn: (port: number) => Promise<void>,
): Promise<void> {
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

describe('postgresql http idempotency live validation', () => {
  let connected = false;

  beforeAll(async () => {
    connected = await canConnect();
    if (!connected) return;
    await migrateUp();
  }, 60_000);

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

  it('survey->sample->approve + profile publish are idempotent over HTTP', async ({ skip }) => {
    if (!connected) skip();
    // This end-to-end HTTP workflow performs many sequential round trips
    // against a live Postgres instance; the global 15s testTimeout is too
    // tight and was a source of flakiness under load.

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

      const corrSurvey = `live-survey-corr-${randomUUID().slice(0, 8)}`;
      const surveyKey = `live-survey-create-${randomUUID().slice(0, 8)}`;
      const surveyPayloadJson = JSON.stringify(surveyPayload);

      const surveyFirstT = Date.now();
      const first = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers: { 'Idempotency-Key': surveyKey, 'X-Correlation-Id': corrSurvey },
        body: surveyPayloadJson,
      });
      const surveyFirstMs = Date.now() - surveyFirstT;

      expect(first.status).toBe(201);
      expect(first.headers.get('x-correlation-id')).toBe(corrSurvey);
      const surveyId = (first.body as { id: string }).id;

      // Idempotency finalize runs after the response is flushed; give it a
      // small window before the exact-replay request so the record is
      // reliably in the "completed" state rather than racing "in_progress".
      await new Promise((r) => setTimeout(r, 80));
      const secondT = Date.now();
      const second = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers: { 'Idempotency-Key': surveyKey, 'X-Correlation-Id': corrSurvey },
        body: surveyPayloadJson,
      });
      const surveySecondMs = Date.now() - secondT;

      expect(second.status).toBe(201);
      expect(second.headers.get('idempotency-replayed')).toBe('true');
      expect((second.body as { id: string }).id).toBe(surveyId);

      const samplePayload = {
        location: SAMPLE_POINTS[0]!,
        rootableSoilDepthCm: DEPTHS[0]!,
        surfaceStoniness: STONINESS[0]!,
        bedrockObserved: false,
        bedrockOutcrop: 'not_observed',
        drainageObservation: 'adequate',
        samplingMethod: 'soil_auger',
      };

      const corrSample = `live-sample-corr-${randomUUID().slice(0, 8)}`;
      const sampleKey = `live-sample-add-${randomUUID().slice(0, 8)}`;
      const samplePayloadJson = JSON.stringify(samplePayload);

      const sampleCountsBeforeIdempotent = await withTransaction(async (client) => {
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
          sampleAudit: sampleAudit.rows[0]?.c ?? 0,
        };
      });

      const sampleFirstT = Date.now();
      const sampleFirst = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/samples`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': sampleKey, 'X-Correlation-Id': corrSample },
          body: samplePayloadJson,
        },
      );
      const sampleFirstMs = Date.now() - sampleFirstT;

      expect(sampleFirst.status).toBe(201);
      expect(sampleFirst.headers.get('x-correlation-id')).toBe(corrSample);
      const sampleId = (sampleFirst.body as { samples?: Array<{ id: string }> })
        .samples?.[0]?.id as string;

      await new Promise((r) => setTimeout(r, 80));
      const sampleSecondT = Date.now();
      const sampleSecond = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/samples`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': sampleKey, 'X-Correlation-Id': corrSample },
          body: samplePayloadJson,
        },
      );
      const sampleSecondMs = Date.now() - sampleSecondT;

      expect(sampleSecond.status).toBe(201);
      expect(sampleSecond.headers.get('idempotency-replayed')).toBe('true');
      expect(
        (sampleSecond.body as { samples?: Array<{ id: string }> }).samples?.[0]
          ?.id,
      ).toBe(sampleId);

      const sampleCountsAfterIdempotent = await withTransaction(async (client) => {
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
          sampleAudit: sampleAudit.rows[0]?.c ?? 0,
        };
      });

      const matchingSampleCount =
        sampleCountsAfterIdempotent.sampleCount -
        sampleCountsBeforeIdempotent.sampleCount;
      const matchingSampleAuditCount =
        sampleCountsAfterIdempotent.sampleAudit -
        sampleCountsBeforeIdempotent.sampleAudit;

      // Add remaining samples so approval workflow passes (minimum sample count).
      for (let i = 1; i < 5; i += 1) {
        await jsonFetch(
          port,
          `/api/field-surveys/${surveyId}/samples`,
          {
            method: 'POST',
            body: JSON.stringify({
              location: SAMPLE_POINTS[i]!,
              rootableSoilDepthCm: DEPTHS[i]!,
              surfaceStoniness: STONINESS[i]!,
              bedrockObserved: false,
              bedrockOutcrop: 'not_observed',
              drainageObservation: 'adequate',
              samplingMethod: 'soil_auger',
            }),
          },
        );
      }

      // Prepare approve workflow
      await jsonFetch(port, `/api/field-surveys/${surveyId}/submit`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await jsonFetch(port, `/api/field-surveys/${surveyId}/start-review`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const approveAuditBefore = await withTransaction(async (client) => {
        const approveAudit = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SURVEY_APPROVED'`,
          [surveyId],
        );
        return approveAudit.rows[0]?.c ?? 0;
      });

      const approvePayload = {
        reviewer: { id: 'rev-live-1', name: 'Reviewer Live', role: 'soil_scientist' },
        comments: 'OK',
      };
      const corrApprove = `live-approve-corr-${randomUUID().slice(0, 8)}`;
      const approveKey = `live-approve-${randomUUID().slice(0, 8)}`;

      const approve1T = Date.now();
      const approve1 = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/approve`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': approveKey, 'X-Correlation-Id': corrApprove },
          body: JSON.stringify(approvePayload),
        },
      );
      const approve1Ms = Date.now() - approve1T;
      expect(approve1.status).toBe(200);
      expect(approve1.headers.get('x-correlation-id')).toBe(corrApprove);
      const approvedAt = (approve1.body as { approvedAt: string }).approvedAt;

      // Idempotency finalize may still be running; give a small window.
      await new Promise((r) => setTimeout(r, 80));
      const approve2 = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/approve`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': approveKey, 'X-Correlation-Id': corrApprove },
          body: JSON.stringify(approvePayload),
        },
      );
      expect(approve2.status).toBe(200);
      expect(approve2.headers.get('idempotency-replayed')).toBe('true');
      expect((approve2.body as { approvedAt: string }).approvedAt).toBe(
        approvedAt,
      );

      await new Promise((r) => setTimeout(r, 80));
      const approve3 = await jsonFetch(
        port,
        `/api/field-surveys/${surveyId}/approve`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': approveKey, 'X-Correlation-Id': corrApprove },
          body: JSON.stringify(approvePayload),
        },
      );
      expect(approve3.status).toBe(200);
      expect(approve3.headers.get('idempotency-replayed')).toBe('true');
      expect((approve3.body as { approvedAt: string }).approvedAt).toBe(
        approvedAt,
      );

      // Create & publish calibration profile (for publish idempotency)
      const crops = new CropKnowledgeService(getSharedCropRepository());
      // Isolate from parallel publish tests that use barley
      const publishCropId = 'chickpea';
      const requirements = crops.getById(publishCropId).physicalRequirements;

      const source = {
        type: 'expert_opinion',
        title: 'chickpea source',
        supports: ['rootableSoilDepth'],
        verificationStatus: 'unverified',
      };

      const createProfileRes = await jsonFetch(
        port,
        '/api/calibration-management/crop-requirements',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            cropId: publishCropId,
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
            body: JSON.stringify({ actor: publisher, reason: path }),
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

      const corrPublish = `live-publish-corr-${randomUUID().slice(0, 8)}`;
      const publishKey = `live-profile-publish-${randomUUID().slice(0, 8)}`;
      const publishPayload = { actor: publisher, reason: 'publish' };

      const pub1T = Date.now();
      const pub1 = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/publish`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': publishKey, 'X-Correlation-Id': corrPublish },
          body: JSON.stringify(publishPayload),
        },
      );
      const pub1Ms = Date.now() - pub1T;
      expect(pub1.status).toBe(200);
      expect(pub1.headers.get('x-correlation-id')).toBe(corrPublish);

      // Idempotency finalize may still be running; give a small window.
      await new Promise((r) => setTimeout(r, 80));
      const pub2 = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/publish`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': publishKey, 'X-Correlation-Id': corrPublish },
          body: JSON.stringify(publishPayload),
        },
      );
      if (pub2.status !== 200 && pub2.status !== 409) {
        console.error('PUB2_FAILURE', {
          status: pub2.status,
          body: pub2.body,
          correlationId: pub2.headers.get('x-correlation-id'),
          profileId,
        });
      }
      expect([200, 409]).toContain(pub2.status);
      if (pub2.status === 200) {
        expect(pub2.headers.get('idempotency-replayed')).toBe('true');
      } else {
        expect((pub2.body as { code?: string }).code).toBe('IDEMPOTENCY_REQUEST_IN_PROGRESS');
      }

      const pub3 = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/publish`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': publishKey, 'X-Correlation-Id': corrPublish },
          body: JSON.stringify(publishPayload),
        },
      );
      expect(pub3.status).toBe(200);
      expect(pub3.headers.get('idempotency-replayed')).toBe('true');

      const conflict = await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${profileId}/publish`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': publishKey, 'X-Correlation-Id': corrPublish },
          body: JSON.stringify({ ...publishPayload, reason: 'publish-different' }),
        },
      );
      expect(conflict.status).toBe(409);
      expect(
        (conflict.body as { code: string }).code,
      ).toBe('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
      expect(
        (conflict.body as { correlationId: string }).correlationId,
      ).toBe(corrPublish);

      // Verify DB state
      const counts = await withTransaction(async (client) => {
        const surveyCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_surveys WHERE id = $1`,
          [surveyId],
        );
        const sampleCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_samples WHERE survey_id = $1`,
          [surveyId],
        );
        const sampleAudit = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SAMPLE_ADDED'`,
          [surveyId],
        );
        const approveAudit = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM field_survey_audit_events
           WHERE survey_id = $1 AND event_type = 'SURVEY_APPROVED'`,
          [surveyId],
        );

        const pubCount = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_publications WHERE profile_id = $1`,
          [profileId],
        );
        const prevSuperseded = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PREVIOUS_PROFILE_SUPERSEDED'`,
          [profileId],
        );
        const publishedAudits = await client.query<{ c: number }>(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events
           WHERE profile_id = $1 AND event_type = 'PROFILE_PUBLISHED'`,
          [profileId],
        );
        return {
          surveyCount: surveyCount.rows[0]?.c ?? 0,
          sampleCount: sampleCount.rows[0]?.c ?? 0,
          sampleAudit: sampleAudit.rows[0]?.c ?? 0,
          approveAudit: approveAudit.rows[0]?.c ?? 0,
          pubCount: pubCount.rows[0]?.c ?? 0,
          prevSuperseded: prevSuperseded.rows[0]?.c ?? 0,
          publishedAudits: publishedAudits.rows[0]?.c ?? 0,
        };
      });

      const summary = {
        operations: [
          {
            operation: 'field-survey.create',
            idempotencyKey: surveyKey,
            firstStatus: first.status,
            replayStatus: second.status,
            replayed: second.headers.get('idempotency-replayed') === 'true',
            resourceId: surveyId,
            durationMs: { first: surveyFirstMs, replay: surveySecondMs },
          },
          {
            operation: 'field-survey.sample.add',
            idempotencyKey: sampleKey,
            firstStatus: sampleFirst.status,
            replayStatus: sampleSecond.status,
            replayed: sampleSecond.headers.get('idempotency-replayed') === 'true',
            resourceId: sampleId,
            durationMs: { first: sampleFirstMs, replay: sampleSecondMs },
            matchingSampleCount,
            matchingSampleAuditCount,
          },
          {
            operation: 'field-survey.approve',
            idempotencyKey: approveKey,
            firstStatus: approve1.status,
            replayStatus: approve2.status,
            replayed: approve2.headers.get('idempotency-replayed') === 'true',
            resourceId: { surveyId, approvedAt },
            durationMs: { first: approve1Ms, replay: 0 },
            matchingApproveAuditCount: counts.approveAudit - approveAuditBefore,
          },
          {
            operation: 'calibration.profile.publish',
            idempotencyKey: publishKey,
            firstStatus: pub1.status,
            replayStatus: pub2.status,
            replayed: pub2.headers.get('idempotency-replayed') === 'true',
            resourceId: profileId,
            durationMs: { first: pub1Ms, replay: 0 },
            publicationCount: counts.pubCount,
            previousSupersededCount: counts.prevSuperseded,
            publishedAuditCount: counts.publishedAudits,
            conflictStatus: conflict.status,
            conflictErrorCode: (conflict.body as { code: string }).code,
          },
        ],
        metrics: getMetricsRegistry().summary(),
      };

      console.log('LIVE_IDEMPOTENCY_RESULT', JSON.stringify(summary));
    });
  }, 60_000);
});

