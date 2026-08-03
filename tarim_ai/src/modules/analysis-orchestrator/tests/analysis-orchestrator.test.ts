import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createApp } from '../../../app.js';
import { resetEnvCache } from '../../../config/env.js';
import {
  resetSharedAnalysisRepository,
} from '../../database/persistence-factory.js';
import type { Server } from 'node:http';

const PARCEL = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

let server: Server;
let port: number;

function url(path: string): string {
  return `http://127.0.0.1:${port}${path}`;
}

async function jsonFetch(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const res = await fetch(url(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body, headers: res.headers };
}

describe('analysis orchestrator', () => {
  beforeAll(async () => {
    process.env.ANALYSIS_DATA_MODE = 'live';
    resetEnvCache();
    resetSharedAnalysisRepository();
    port = 15000 + Math.floor(Math.random() * 4000);
    const app = createApp();
    server = app.listen(port);
    await new Promise<void>((resolve) => server.on('listening', resolve));
  });

  afterAll(() => {
    server?.close();
    resetSharedAnalysisRepository();
  });

  it('POST /api/analyses creates an analysis', async () => {
    const res = await jsonFetch('/api/analyses', {
      method: 'POST',
      body: JSON.stringify(PARCEL),
    });
    expect(res.status).toBe(201);
    const body = res.body as Record<string, unknown>;
    expect(body.analysisId).toBeTruthy();
    expect(body.createdAt).toBeTruthy();
  });

  it('POST /api/analyses rejects invalid request', async () => {
    const res = await jsonFetch('/api/analyses', {
      method: 'POST',
      body: JSON.stringify({ province: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/analyses/:id returns 404 for nonexistent', async () => {
    const res = await jsonFetch(
      '/api/analyses/00000000-0000-0000-0000-000000000000',
    );
    expect(res.status).toBe(404);
  });

  it('GET status returns progress steps', async () => {
    const createRes = await jsonFetch('/api/analyses', {
      method: 'POST',
      body: JSON.stringify(PARCEL),
    });
    const analysisId = (createRes.body as Record<string, unknown>).analysisId as string;
    const statusRes = await jsonFetch(`/api/analyses/${analysisId}/status`);
    expect(statusRes.status).toBe(200);
    const body = statusRes.body as Record<string, unknown>;
    expect(Array.isArray(body.steps)).toBe(true);
  });

  it('correlation header is present', async () => {
    const res = await jsonFetch('/api/analyses', {
      method: 'POST',
      headers: { 'X-Correlation-Id': 'test-corr-persistence' },
      body: JSON.stringify(PARCEL),
    });
    expect(res.headers.get('x-correlation-id')).toBe('test-corr-persistence');
  });
});

describe('demo readiness semantics', () => {
  let readinessServer: Server;
  let readinessPort: number;

  afterEach(() => {
    readinessServer?.close();
    process.env.ANALYSIS_DATA_MODE = 'live';
    process.env.PARCEL_PROVIDER = process.env.PARCEL_PROVIDER || 'mock';
    resetEnvCache();
  });

  it('golden readiness reflects current dataset state', async () => {
    process.env.ANALYSIS_DATA_MODE = 'golden';
    resetEnvCache();
    readinessPort = 17000 + Math.floor(Math.random() * 1000);
    const app = createApp();
    readinessServer = app.listen(readinessPort);
    await new Promise<void>((resolve) => readinessServer.on('listening', resolve));

    const res = await fetch(`http://127.0.0.1:${readinessPort}/api/demo/readiness`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(['ready', 'not_ready']).toContain(body.status);
    const golden = body.goldenDataset as Record<string, unknown>;
    expect(golden.datasetType).toBeDefined();
    expect(body.demoReady).toBe(golden.demoReady);
  });

  it('live mock providers => not_ready demoReady false', async () => {
    process.env.ANALYSIS_DATA_MODE = 'live';
    process.env.PARCEL_PROVIDER = 'fallback';
    process.env.PARCEL_PROVIDER_ORDER = 'tkgm,verified_geojson,database';
    process.env.CLIMATE_PROVIDER = 'mock';
    process.env.SOIL_PROVIDER = 'mock';
    process.env.TERRAIN_PROVIDER = 'mock';
    resetEnvCache();
    readinessPort = 17100 + Math.floor(Math.random() * 1000);
    const app = createApp();
    readinessServer = app.listen(readinessPort);
    await new Promise<void>((resolve) => readinessServer.on('listening', resolve));

    const res = await fetch(`http://127.0.0.1:${readinessPort}/api/demo/readiness`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.demoReady).toBe(false);
    expect(['not_ready', 'degraded']).toContain(body.status);
    expect((body.activeParcelProvider as string) === 'tkgm' || body.activeParcelProvider === 'verified_geojson').toBe(true);
    expect(body.fallbackAvailable).toBe(true);
    const parcelSources = body.parcelSources as Record<string, unknown>;
    expect(parcelSources.verifiedGeojson).toBe('ready');
  });
});

describe('golden dataset verification levels', () => {
  it('matches the current fixture state', async () => {
    const { verifyGoldenDataset } = await import('../golden/golden-verify.js');
    const result = await verifyGoldenDataset();
    if (result.manifest.datasetType === 'captured' && result.manifest.demoReady === true) {
      expect(result.demoReady).toBe(true);
      expect(result.level).toBe('DEMO_READY');
    } else {
      expect(result.demoReady).toBe(false);
      expect(result.level).toBe('STRUCTURALLY_VALID_NOT_DEMO_READY');
    }
  });
});

describe('golden mode analysis rejects non-demo-ready dataset', () => {
  let goldenServer: Server;
  let goldenPort: number;

  beforeAll(async () => {
    process.env.ANALYSIS_DATA_MODE = 'golden';
    resetEnvCache();
    resetSharedAnalysisRepository();
    goldenPort = 17200 + Math.floor(Math.random() * 1000);
    const app = createApp();
    goldenServer = app.listen(goldenPort);
    await new Promise<void>((resolve) => goldenServer.on('listening', resolve));
  });

  afterAll(() => {
    process.env.ANALYSIS_DATA_MODE = 'live';
    resetEnvCache();
    goldenServer?.close();
    resetSharedAnalysisRepository();
  });

  it('golden analysis follows dataset readiness', async () => {
    const createRes = await fetch(`http://127.0.0.1:${goldenPort}/api/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PARCEL),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as Record<string, unknown>;
    const { verifyGoldenDataset } = await import('../golden/golden-verify.js');
    const verification = await verifyGoldenDataset();
    expect(created.status).toBe(verification.demoReady ? 'completed' : 'failed');
  });
});
