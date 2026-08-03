/**
 * Live idempotency validation against PostgreSQL (scenarios A–F).
 * Run: DATABASE_URL=... npx tsx scripts/live-idempotency-validation.ts
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { resetEnvCache } from '../src/config/env.js';
import {
  closePool,
  resetDatabaseClient,
  withTransaction,
  checkConnectivity,
} from '../src/modules/database/database-client.js';
import { migrateUp } from '../src/modules/database/migrations/runner.js';
import { resetSharedCalibrationRepository } from '../src/modules/crop-recommendation/calibration/calibration-profile.repository.js';
import { resetSharedCalibrationManagementRepository } from '../src/modules/calibration-management/repositories/calibration-management.repository.js';
import {
  resetOperationsRuntime,
  getOperationsRuntime,
} from '../src/modules/operations/operations-runtime.js';
import {
  getMetricsRegistry,
  resetMetricsRegistry,
} from '../src/modules/operations/metrics/metrics-registry.js';
import { getStructuredLogger, resetStructuredLogger } from '../src/modules/operations/logging/structured-logger.js';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://tarim:tarim@localhost:5433/tarim_ai';

const GUNGURGE = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

const surveyPayload = {
  parcelQuery: GUNGURGE,
  surveyDate: '2026-07-29',
  surveyor: { id: 'field-1', name: 'Saha', organization: 'TK' },
  weatherConditions: {
    recentRainfall: 'none' as const,
    soilSurfaceCondition: 'dry' as const,
  },
  parcelObservations: {
    machineAccess: 'verified_accessible' as const,
    drainageObservation: 'adequate' as const,
    bedrockOutcrop: 'not_observed' as const,
  },
};

function enableEnv() {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.DATABASE_ENABLED = 'true';
  process.env.PERSISTENCE_PROVIDER = 'postgresql';
  process.env.DATABASE_URL = databaseUrl;
  process.env.IDEMPOTENCY_ENABLED = 'true';
  process.env.IDEMPOTENCY_CLEANUP_ENABLED = 'false';
  process.env.CALIBRATION_MANAGEMENT_ENABLED = 'true';
  process.env.PARCEL_PROVIDER = 'mock';
  process.env.TERRAIN_PROVIDER = 'mock';
  process.env.SOIL_PROVIDER = 'mock';
  resetEnvCache();
  resetSharedCalibrationRepository();
  resetSharedCalibrationManagementRepository();
  resetOperationsRuntime();
  resetMetricsRegistry();
  resetStructuredLogger();
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

async function count(sql: string): Promise<number> {
  return withTransaction(async (client) => {
    const result = await client.query(sql);
    return result.rows[0].c as number;
  });
}

async function main() {
  enableEnv();
  await resetDatabaseClient();
  const connected = (await checkConnectivity()).connected;
  if (!connected) {
    console.error('PostgreSQL unavailable');
    process.exit(1);
  }
  await migrateUp();
  await withTransaction(async (client) => {
    await client.query('TRUNCATE idempotency_records CASCADE');
    await client.query('TRUNCATE field_survey_audit_events CASCADE');
    await client.query('TRUNCATE field_survey_samples CASCADE');
    await client.query('TRUNCATE field_surveys CASCADE');
    await client.query('TRUNCATE calibration_audit_events CASCADE');
    await client.query('TRUNCATE calibration_publications CASCADE');
    await client.query('TRUNCATE calibration_impact_analyses CASCADE');
    await client.query('TRUNCATE calibration_reviews CASCADE');
    await client.query('TRUNCATE calibration_sources CASCADE');
    await client.query('TRUNCATE crop_requirement_profiles CASCADE');
  });

  resetOperationsRuntime();
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const report: Record<string, unknown> = {
    runtime: {
      durable: getOperationsRuntime().durable,
      provider: getOperationsRuntime().persistenceProvider,
    },
  };

  try {
    // A. SURVEY CREATE x3
    const createKey = 'live-survey-create-001';
    const createResults = [];
    for (let i = 0; i < 3; i += 1) {
      const started = Date.now();
      const res = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers: { 'Idempotency-Key': createKey },
        body: JSON.stringify(surveyPayload),
      });
      createResults.push({
        status: res.status,
        id: res.body?.id,
        replayed: res.headers.get('idempotency-replayed'),
        durationMs: Date.now() - started,
      });
    }
    report.A_surveyCreate = {
      results: createResults,
      surveyCount: await count('SELECT COUNT(*)::int AS c FROM field_surveys'),
      createdAuditCount: await count(
        `SELECT COUNT(*)::int AS c FROM field_survey_audit_events WHERE event_type = 'SURVEY_CREATED'`,
      ),
      metricsReplays: getMetricsRegistry().summary().idempotencyReplays,
    };
    const surveyId = createResults[0]?.id as string;

    // B. SAMPLE ADD x3
    const samplePayload = {
      location: { latitude: 37.0662, longitude: 37.3833, accuracyMeters: 5 },
      rootableSoilDepthCm: 45,
      surfaceStoniness: 'low',
      bedrockObserved: false,
      bedrockOutcrop: 'not_observed',
      drainageObservation: 'adequate',
      samplingMethod: 'soil_auger',
    };
    const sampleKey = 'live-sample-add-001';
    const sampleResults = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await jsonFetch(port, `/api/field-surveys/${surveyId}/samples`, {
        method: 'POST',
        headers: { 'Idempotency-Key': sampleKey },
        body: JSON.stringify(samplePayload),
      });
      sampleResults.push({
        status: res.status,
        sampleId: res.body?.samples?.at?.(-1)?.id ?? res.body?.id,
        replayed: res.headers.get('idempotency-replayed'),
      });
    }
    report.B_sampleAdd = {
      results: sampleResults,
      sampleCount: await count('SELECT COUNT(*)::int AS c FROM field_survey_samples'),
      sampleAuditCount: await count(
        `SELECT COUNT(*)::int AS c FROM field_survey_audit_events WHERE event_type = 'SAMPLE_ADDED'`,
      ),
    };

    // Add remaining samples for workflow + approve
    for (let i = 0; i < 4; i += 1) {
      await jsonFetch(port, `/api/field-surveys/${surveyId}/samples`, {
        method: 'POST',
        body: JSON.stringify({
          ...samplePayload,
          location: {
            latitude: 37.0662 + i * 0.0002,
            longitude: 37.3833 + i * 0.0002,
            accuracyMeters: 5,
          },
          rootableSoilDepthCm: 40 + i,
        }),
      });
    }
    await jsonFetch(port, `/api/field-surveys/${surveyId}/submit`, {
      method: 'POST',
      body: '{}',
    });
    await jsonFetch(port, `/api/field-surveys/${surveyId}/start-review`, {
      method: 'POST',
      body: '{}',
    });

    // C. APPROVE x3
    const approveKey = 'live-survey-approve-001';
    const approveBody = {
      actor: { id: 'rev-1', name: 'Reviewer', role: 'authorized_reviewer' },
      notes: 'ok',
    };
    const approveResults = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await jsonFetch(port, `/api/field-surveys/${surveyId}/approve`, {
        method: 'POST',
        headers: { 'Idempotency-Key': approveKey },
        body: JSON.stringify(approveBody),
      });
      approveResults.push({
        status: res.status,
        approvedAt: res.body?.approvedAt,
        replayed: res.headers.get('idempotency-replayed'),
      });
    }
    report.C_surveyApprove = {
      results: approveResults,
      approvedAuditCount: await count(
        `SELECT COUNT(*)::int AS c FROM field_survey_audit_events WHERE event_type = 'SURVEY_APPROVED'`,
      ),
    };

    // D. PROFILE PUBLISH x3
    const admin = { id: 'admin-1', name: 'Admin', role: 'administrator' };
    const bootstrap = await jsonFetch(port, '/api/calibration-management/bootstrap', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'live-bootstrap-001' },
      body: JSON.stringify({ actor: admin }),
    });
    const profileId = bootstrap.body?.profileIds?.[0] as string;
    // move to approved via service endpoints if available — use HTTP workflow
    // For live script, create+submit+review+approve then publish
    let publishProfileId = profileId;
    if (publishProfileId) {
      await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${publishProfileId}/submit`,
        { method: 'POST', body: JSON.stringify({ actor: admin }) },
      );
      await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${publishProfileId}/start-review`,
        { method: 'POST', body: JSON.stringify({ actor: admin }) },
      );
      await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${publishProfileId}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify({
            actor: {
              id: 'soil-1',
              name: 'Soil',
              role: 'soil_scientist',
              organization: 'Org',
            },
            decision: 'approve',
            notes: 'ok',
          }),
        },
      );
      await jsonFetch(
        port,
        `/api/calibration-management/crop-requirements/${publishProfileId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({
            actor: { id: 'rev-1', name: 'Rev', role: 'authorized_reviewer' },
          }),
        },
      );
      const publishKey = 'live-profile-publish-001';
      const publishResults = [];
      for (let i = 0; i < 3; i += 1) {
        const res = await jsonFetch(
          port,
          `/api/calibration-management/crop-requirements/${publishProfileId}/publish`,
          {
            method: 'POST',
            headers: { 'Idempotency-Key': publishKey },
            body: JSON.stringify({
              actor: { id: 'rev-1', name: 'Rev', role: 'authorized_reviewer' },
            }),
          },
        );
        publishResults.push({
          status: res.status,
          profileId: res.body?.profile?.id ?? res.body?.id,
          statusValue: res.body?.profile?.status ?? res.body?.status,
          replayed: res.headers.get('idempotency-replayed'),
        });
      }
      report.D_profilePublish = {
        results: publishResults,
        publicationCount: await count(
          'SELECT COUNT(*)::int AS c FROM calibration_publications',
        ),
        publishedAuditCount: await count(
          `SELECT COUNT(*)::int AS c FROM calibration_audit_events WHERE event_type = 'PROFILE_PUBLISHED'`,
        ),
      };
    }

    // E. DIFFERENT PAYLOAD
    const conflict = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      headers: { 'Idempotency-Key': createKey },
      body: JSON.stringify({ ...surveyPayload, surveyDate: '2026-01-01' }),
    });
    report.E_differentPayload = {
      status: conflict.status,
      code: conflict.body?.code,
      surveyCountAfter: await count('SELECT COUNT(*)::int AS c FROM field_surveys'),
    };

    // F. CORRELATION
    const corr = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      headers: {
        'Idempotency-Key': 'live-corr-001',
        'X-Correlation-Id': 'custom-correlation-live-99',
      },
      body: JSON.stringify(surveyPayload),
    });
    const err = await jsonFetch(port, '/api/field-surveys', {
      method: 'POST',
      headers: {
        'Idempotency-Key': 'bad',
        'X-Correlation-Id': 'custom-correlation-live-99',
      },
      body: JSON.stringify(surveyPayload),
    });
    const logs = getStructuredLogger().drain();
    report.F_correlation = {
      responseHeader: corr.headers.get('x-correlation-id'),
      errorCorrelationId: err.body?.correlationId,
      errorCode: err.body?.code,
      logHasCorrelation: logs.some(
        (l) => l.correlationId === 'custom-correlation-live-99',
      ),
      credentialInLogs: logs.some((l) =>
        JSON.stringify(l).toLowerCase().includes('client_secret'),
      ),
    };

    report.metrics = getMetricsRegistry().summary();
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
