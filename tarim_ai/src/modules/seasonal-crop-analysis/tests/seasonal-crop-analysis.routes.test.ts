import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';
import { resetEnvCache } from '../../../config/env.js';

const GUNGURGE = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

// Snapshotted once so Sentinel credentials (loaded from .env for live/dev use)
// can be temporarily neutralized in these tests without leaking a permanent
// change into other test files that run in the same process.
const ORIGINAL_COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID;
const ORIGINAL_COPERNICUS_CLIENT_SECRET = process.env.COPERNICUS_CLIENT_SECRET;

function ensureEnv(): void {
  process.env.PARCEL_PROVIDER = 'mock';
  process.env.CLIMATE_PROVIDER = 'mock';
  process.env.SOIL_PROVIDER = 'mock';
  process.env.TERRAIN_PROVIDER = 'mock';
  process.env.PERSISTENCE_PROVIDER = 'in-memory';
  // Whitespace-only (not empty) so env schema validation (min length 1)
  // still passes, while isSentinelConfigured() treats it as "not configured"
  // — keeps the satellite step deterministic and offline in this suite.
  process.env.COPERNICUS_CLIENT_ID = ' ';
  process.env.COPERNICUS_CLIENT_SECRET = ' ';
  resetEnvCache();
}

function restoreEnv(): void {
  if (ORIGINAL_COPERNICUS_CLIENT_ID !== undefined) {
    process.env.COPERNICUS_CLIENT_ID = ORIGINAL_COPERNICUS_CLIENT_ID;
  } else {
    delete process.env.COPERNICUS_CLIENT_ID;
  }
  if (ORIGINAL_COPERNICUS_CLIENT_SECRET !== undefined) {
    process.env.COPERNICUS_CLIENT_SECRET = ORIGINAL_COPERNICUS_CLIENT_SECRET;
  } else {
    delete process.env.COPERNICUS_CLIENT_SECRET;
  }
  resetEnvCache();
}

async function json(port: number, path: string, init?: RequestInit): Promise<{ res: Response; body: any }> {
  const res = await fetch(`http://127.0.0.1:${port}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  return { res, body };
}

describe('seasonal-crop-analysis routes', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    ensureEnv();
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    restoreEnv();
  });

  it(
    'creates an analysis for a single target crop and exposes status + result',
    async () => {
      const created = await json(port, '/seasonal-crop-analysis', {
        method: 'POST',
        body: JSON.stringify({
          parcelQuery: GUNGURGE,
          seasonYear: 2026,
          productionMode: 'rainfed',
          irrigationAvailability: 'unavailable',
          targetCropCodes: ['wheat'],
        }),
      });
      expect(created.res.status).toBe(201);
      expect(created.body.analysisId).toBeTruthy();
      expect(['completed', 'partial_completed']).toContain(created.body.status);

      const analysisId = created.body.analysisId as string;

      const status = await json(port, `/seasonal-crop-analysis/${analysisId}/status`);
      expect(status.res.status).toBe(200);
      expect(status.body.analysisId).toBe(analysisId);
      expect(Array.isArray(status.body.steps)).toBe(true);

      const result = await json(port, `/seasonal-crop-analysis/${analysisId}`);
      expect(result.res.status).toBe(200);
      expect(result.body.analysisId).toBe(analysisId);
      expect(result.body.crops.length).toBe(1);
      expect(result.body.crops[0].requestedCropCode).toBe('wheat');
      expect(result.body.engineVersion).toBe('seasonal-crop-analysis-v1.1.0');

      // Ranking readiness is additive and must always be present, even for a
      // single-crop request.
      expect(result.body.rankingReadiness).toBeTruthy();
      expect(typeof result.body.rankingReadiness.rankingReadyCropCount).toBe('number');
      expect(typeof result.body.rankingReadiness.policy).toBe('string');
      expect(Array.isArray(result.body.ranking)).toBe(true);
      expect(Array.isArray(result.body.preliminaryCrops)).toBe(true);
      expect(Array.isArray(result.body.excludedCrops)).toBe(true);
      expect(
        result.body.rankingReadiness.rankingReadyCropCount +
          result.body.rankingReadiness.preliminaryCropCount +
          result.body.rankingReadiness.excludedCropCount,
      ).toBe(1);

      // Sentinel credentials are neutralized in this suite — satellite step
      // must cleanly skip, never fall back to a mock/faked observation.
      const satelliteStep = result.body.steps.find((s: { key: string }) => s.key === 'satellite');
      expect(satelliteStep?.status).toBe('skipped');
      expect(result.body.satelliteContext ?? null).toBeNull();

      const list = await json(port, `/parcels/${encodeURIComponent(result.body.parcelKey)}/seasonal-crop-analyses`);
      expect(list.res.status).toBe(200);
      expect(list.body.count).toBeGreaterThanOrEqual(1);
    },
    30_000,
  );

  it(
    'returns 404 for unknown analysis id',
    async () => {
      const res = await json(port, '/seasonal-crop-analysis/00000000-0000-0000-0000-000000000000');
      expect(res.res.status).toBe(404);
    },
    10_000,
  );

  it(
    'demo endpoint resolves the fixed Güngürge demo slug',
    async () => {
      const res = await json(port, '/demo/seasonal-analysis', {
        method: 'POST',
        body: JSON.stringify({
          parcelSlug: 'gungurge-108-7',
          seasonYear: 2026,
          productionMode: 'auto',
          irrigationAvailability: 'available_and_sufficient',
        }),
      });
      expect(res.res.status).toBe(201);
      expect(res.body.analysisId).toBeTruthy();
    },
    30_000,
  );

  it(
    'returns 404 for an unknown demo parcel slug',
    async () => {
      const res = await json(port, '/demo/seasonal-analysis', {
        method: 'POST',
        body: JSON.stringify({
          parcelSlug: 'unknown-slug',
          seasonYear: 2026,
          productionMode: 'auto',
          irrigationAvailability: 'unavailable',
        }),
      });
      expect(res.res.status).toBe(404);
    },
    10_000,
  );
});

describe('seasonal-crop-analysis routes — Sinan demo (verified real cadastral geometry)', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    ensureEnv();
    // This demo slug resolves to a real verified fixture
    // (fixtures/parcels/verified/sinan-0-1513.geojson) rather than the mock
    // provider's single hardcoded parcel, so it needs its own provider.
    process.env.PARCEL_PROVIDER = 'verified_geojson';
    resetEnvCache();
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    restoreEnv();
  });

  it(
    'demo endpoint resolves the Sinan (sinan-1513-0) demo slug end-to-end',
    async () => {
      const created = await json(port, '/demo/seasonal-analysis', {
        method: 'POST',
        body: JSON.stringify({
          parcelSlug: 'sinan-1513-0',
          seasonYear: 2026,
          productionMode: 'auto',
          irrigationAvailability: 'available_and_sufficient',
        }),
      });
      expect(created.res.status).toBe(201);
      expect(created.body.analysisId).toBeTruthy();
      expect(['completed', 'partial_completed']).toContain(created.body.status);

      const analysisId = created.body.analysisId as string;
      const result = await json(port, `/seasonal-crop-analysis/${analysisId}`);
      expect(result.res.status).toBe(200);
      expect(result.body.parcel?.neighborhood).toBe('Sinan');
      expect(result.body.parcel?.block).toBe('0');
      expect(result.body.parcel?.parcel).toBe('1513');
      expect(result.body.parcel?.verified).toBe(true);
      expect(result.body.engineVersion).toBe('seasonal-crop-analysis-v1.1.0');
      expect(result.body.rankingReadiness).toBeTruthy();
      expect(Array.isArray(result.body.crops)).toBe(true);
      expect(result.body.crops.length).toBeGreaterThan(0);
    },
    30_000,
  );
});
