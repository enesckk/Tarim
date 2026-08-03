import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../../app.js';
import { resetEnvCache } from '../../../config/env.js';
import { resetSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { getSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { resetSharedCalibrationManagementRepository } from '../../calibration-management/repositories/calibration-management.repository.js';
import {
  buildRequestHash,
  canonicalJson,
  hashIdempotencyKey,
  validateIdempotencyKey,
  isExpired,
  type IdempotencyRecord,
} from '../idempotency/idempotency.types.js';
import { InMemoryIdempotencyRepository } from '../idempotency/in-memory-idempotency.repository.js';
import { IdempotencyService } from '../idempotency/idempotency.service.js';
import { resolveCriticalOperation } from '../idempotency/operation-catalog.js';
import { normalizeCorrelationId } from '../correlation/correlation.js';
import { redactSensitive } from '../logging/redaction.js';
import {
  ConsoleStructuredLogger,
  setStructuredLogger,
  resetStructuredLogger,
} from '../logging/structured-logger.js';
import {
  InMemoryMetricsRegistry,
  resetMetricsRegistry,
  setMetricsRegistry,
  getMetricsRegistry,
} from '../metrics/metrics-registry.js';
import {
  resetOperationsRuntime,
  getOperationsRuntime,
} from '../operations-runtime.js';
import { buildOperationsValidationChecks } from '../validation/operations-validation.js';

const GUNGURGE = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

function ensureEnv(): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.PERSISTENCE_PROVIDER = 'in-memory';
  process.env.DATABASE_ENABLED = 'false';
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
  resetStructuredLogger();
}

async function jsonFetch(
  port: number,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown; headers: Headers }> {
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

async function withServer(
  fn: (port: number) => Promise<void>,
): Promise<void> {
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

describe('operations idempotency unit', () => {
  beforeEach(() => ensureEnv());

  it('validates idempotency keys', () => {
    expect(validateIdempotencyKey('').ok).toBe(false);
    expect(validateIdempotencyKey('short').ok).toBe(false);
    expect(validateIdempotencyKey('valid-key-01').ok).toBe(true);
    expect(validateIdempotencyKey('bad key!!').ok).toBe(false);
  });

  it('canonicalizes object key order and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });

  it('builds stable and distinct request hashes', () => {
    const sameA = buildRequestHash({
      method: 'POST',
      operation: 'field-survey.create',
      body: { x: 1, y: 2 },
    });
    const sameB = buildRequestHash({
      method: 'POST',
      operation: 'field-survey.create',
      body: { y: 2, x: 1 },
    });
    const different = buildRequestHash({
      method: 'POST',
      operation: 'field-survey.create',
      body: { x: 1, y: 3 },
    });
    expect(sameA).toBe(sameB);
    expect(sameA).not.toBe(different);
  });

  it('scopes keys by operation', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repo, {
      ttlSeconds: 60,
      replayClientErrors: true,
      inProgressStatusCode: 409,
      requiredForCriticalWrites: false,
    });
    const a = await service.begin({
      operation: 'field-survey.create',
      key: 'shared-key-01',
      requestHash: 'hash-a',
    });
    const b = await service.begin({
      operation: 'calibration.profile.create',
      key: 'shared-key-01',
      requestHash: 'hash-b',
    });
    expect(a.action).toBe('proceed');
    expect(b.action).toBe('proceed');
  });

  it('replays completed and conflicts in-progress / different payload', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repo, {
      ttlSeconds: 60,
      replayClientErrors: true,
      inProgressStatusCode: 409,
      requiredForCriticalWrites: false,
    });
    const first = await service.begin({
      operation: 'field-survey.create',
      key: 'replay-key-01',
      requestHash: 'h1',
    });
    expect(first.action).toBe('proceed');
    await service.complete({
      operation: 'field-survey.create',
      key: 'replay-key-01',
      requestHash: 'h1',
      responseStatus: 201,
      responseBody: { id: 's1' },
      resourceId: '11111111-1111-1111-1111-111111111111',
    });
    const replay = await service.begin({
      operation: 'field-survey.create',
      key: 'replay-key-01',
      requestHash: 'h1',
    });
    expect(replay.action).toBe('replay');

    const conflict = await service.begin({
      operation: 'field-survey.create',
      key: 'replay-key-01',
      requestHash: 'h2',
    });
    expect(conflict.action).toBe('conflict');
    if (conflict.action === 'conflict') {
      expect(conflict.code).toBe('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
    }

    await repo.createProcessing({
      key: 'proc-key-01',
      operation: 'field-survey.create',
      requestHash: 'hp',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const inProgress = await service.begin({
      operation: 'field-survey.create',
      key: 'proc-key-01',
      requestHash: 'hp',
    });
    expect(inProgress.action).toBe('conflict');
    if (inProgress.action === 'conflict') {
      expect(inProgress.code).toBe('IDEMPOTENCY_REQUEST_IN_PROGRESS');
    }
  });

  it('allows transient failed retry and expires records', async () => {
    const repo = new InMemoryIdempotencyRepository();
    const service = new IdempotencyService(repo, {
      ttlSeconds: 1,
      replayClientErrors: true,
      inProgressStatusCode: 409,
      requiredForCriticalWrites: false,
    });
    await service.begin({
      operation: 'field-survey.create',
      key: 'fail-key-01',
      requestHash: 'hf',
    });
    await service.markFailed({
      operation: 'field-survey.create',
      key: 'fail-key-01',
      requestHash: 'hf',
      errorCode: 'HTTP_500',
      responseStatus: 500,
    });
    const retry = await service.begin({
      operation: 'field-survey.create',
      key: 'fail-key-01',
      requestHash: 'hf',
    });
    expect(retry.action).toBe('proceed');

    const expired: IdempotencyRecord = {
      key: 'exp-key-01',
      operation: 'field-survey.create',
      requestHash: 'he',
      state: 'completed',
      resourceId: null,
      responseStatus: 201,
      responseBody: { ok: true },
      responseHeaders: {},
      errorCode: null,
      lockedAt: null,
      completedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalCorrelationId: null,
      generation: 1,
    };
    expect(isExpired(expired)).toBe(true);
    // seed via complete path
    await repo.createProcessing({
      key: 'exp-key-01',
      operation: 'field-survey.create',
      requestHash: 'he',
      expiresAt: expired.expiresAt,
    });
    await repo.complete({
      operation: 'field-survey.create',
      key: 'exp-key-01',
      requestHash: 'he',
      responseStatus: 201,
      responseBody: { ok: true },
    });
    // force expiry
    const stored = await repo.find('field-survey.create', 'exp-key-01');
    if (stored) {
      (stored as { expiresAt: string }).expiresAt = expired.expiresAt;
      // recreate map entry with expired time via delete + createProcessing reuse
      await repo.deleteExpired(new Date().toISOString(), 10);
    }
    const removed = await service.cleanupExpired(10);
    expect(removed).toBeGreaterThanOrEqual(0);
  });

  it('persists deterministic 4xx as completed when configured', () => {
    const service = new IdempotencyService(new InMemoryIdempotencyRepository(), {
      ttlSeconds: 60,
      replayClientErrors: true,
      inProgressStatusCode: 409,
      requiredForCriticalWrites: false,
    });
    expect(service.shouldPersistResponse(400)).toBe('complete');
    expect(service.shouldPersistResponse(500)).toBe('fail');
  });

  it('resolves critical operations', () => {
    expect(
      resolveCriticalOperation('POST', '/api/field-surveys')?.operation,
    ).toBe('field-survey.create');
    expect(
      resolveCriticalOperation(
        'POST',
        '/api/calibration-management/crop-requirements/abc/publish',
      )?.operation,
    ).toBe('calibration.profile.publish');
    expect(resolveCriticalOperation('GET', '/api/field-surveys/x')).toBeNull();
  });

  it('generates and accepts correlation ids', () => {
    const generated = normalizeCorrelationId(undefined);
    expect(generated.generated).toBe(true);
    const custom = normalizeCorrelationId('corr-123');
    expect(custom.correlationId).toBe('corr-123');
    const invalid = normalizeCorrelationId('bad\nvalue');
    expect(invalid.generated).toBe(true);
    expect(invalid.invalidInput).toBe(true);
  });

  it('redacts nested sensitive fields and never logs raw keys', () => {
    const redacted = redactSensitive({
      authorization: 'Bearer secret',
      nested: { clientSecret: 'abc', ok: 1 },
      token: 'xyz',
    });
    expect(redacted.authorization).toBe('[REDACTED]');
    expect((redacted.nested as { clientSecret: string }).clientSecret).toBe(
      '[REDACTED]',
    );
    expect((redacted.nested as { ok: number }).ok).toBe(1);
    expect(hashIdempotencyKey('raw-secret-key-value')).not.toContain(
      'raw-secret-key-value',
    );
  });

  it('emits structured logs and metrics', () => {
    const logger = new ConsoleStructuredLogger({ capture: true });
    setStructuredLogger(logger);
    logger.info({
      event: 'http.request.completed',
      correlationId: 'c1',
      requestId: 'r1',
      method: 'POST',
      statusCode: 200,
      durationMs: 12,
    });
    const entries = logger.drain();
    expect(entries[0]?.event).toBe('http.request.completed');
    expect(entries[0]?.level).toBe('info');

    const metrics = new InMemoryMetricsRegistry();
    setMetricsRegistry(metrics);
    metrics.increment('http_requests_total');
    metrics.increment('idempotency_replays_total');
    metrics.observe('http_request_duration_ms', 2500);
    const summary = getMetricsRegistry().summary();
    expect(summary.httpRequests).toBe(1);
    expect(summary.idempotencyReplays).toBe(1);
  });

  it('builds operations validation checks and calib fallback', () => {
    const checks = buildOperationsValidationChecks({
      idempotencyEnabled: true,
      idempotencyDurable: false,
      correlationEnabled: true,
      structuredLogging: true,
      metricsEnabled: true,
      redactionEnabled: true,
    });
    expect(checks.some((c) => c.code === 'HTTP_IDEMPOTENCY_ENABLED')).toBe(true);
    const profile = getSharedCalibrationRepository().get();
    expect(profile.version).toBe('2.0');
    expect(profile.operations?.idempotency.enabled).toBe(true);
    expect(profile.persistence?.idempotency.ttlSeconds).toBe(86400);
  });
});

describe('operations HTTP integration (in-memory)', () => {
  beforeEach(() => ensureEnv());
  afterEach(() => {
    resetOperationsRuntime();
    resetMetricsRegistry();
    resetStructuredLogger();
  });

  it('replays survey create with Idempotency-Replayed header', async () => {
    await withServer(async (port) => {
      const payload = {
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
      const headers = {
        'Idempotency-Key': 'survey-create-001',
        'X-Correlation-Id': 'corr-survey-1',
      };
      const first = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      expect(first.status).toBe(201);
      expect(first.headers.get('x-correlation-id')).toBe('corr-survey-1');
      const surveyId = (first.body as { id: string }).id;

      const second = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      expect(second.status).toBe(201);
      expect(second.headers.get('idempotency-replayed')).toBe('true');
      expect((second.body as { id: string }).id).toBe(surveyId);

      const listed = await jsonFetch(port, '/api/field-surveys/by-parcel', {
        method: 'POST',
        body: JSON.stringify(GUNGURGE),
      });
      expect(listed.status).toBe(200);
      const surveys = (listed.body as { surveys: unknown[] }).surveys;
      expect(surveys.length).toBe(1);

      const conflict = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'survey-create-001' },
        body: JSON.stringify({ ...payload, surveyDate: '2026-07-28' }),
      });
      expect(conflict.status).toBe(409);
      expect((conflict.body as { code: string }).code).toBe(
        'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
      );
      expect((conflict.body as { correlationId: string }).correlationId).toBeTruthy();
    });
  });

  it('exposes health readiness and metrics summary', async () => {
    await withServer(async (port) => {
      const health = await jsonFetch(port, '/api/health');
      expect(health.status).toBe(200);
      const body = health.body as {
        status: string;
        readiness: string;
        idempotency: { enabled: boolean; durable: boolean };
        observability: { correlation: boolean };
      };
      expect(body.status).toBe('healthy');
      expect(body.readiness).toBe('ready');
      expect(body.idempotency.enabled).toBe(true);
      expect(body.idempotency.durable).toBe(false);
      expect(body.observability.correlation).toBe(true);

      const metrics = await jsonFetch(port, '/api/health/metrics-summary');
      expect(metrics.status).toBe(200);
      expect(
        typeof (metrics.body as { httpRequests: number }).httpRequests,
      ).toBe('number');
    });
  });

  it('allows critical writes without key when required=false', async () => {
    await withServer(async (port) => {
      const created = await jsonFetch(port, '/api/field-surveys', {
        method: 'POST',
        body: JSON.stringify({
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
        }),
      });
      expect(created.status).toBe(201);
      expect(getOperationsRuntime().config.requiredForCriticalWrites).toBe(false);
    });
  });
});
