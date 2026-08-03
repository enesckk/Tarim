import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('crop terrain requirements HTTP integration', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET terrain-requirements aggregate and factor for wheat', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const wheat = listBody.items.find((i) => i.cropCode === 'wheat')!;

    const aggRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/terrain-requirements`,
    );
    expect(aggRes.status).toBe(200);
    const agg = (await aggRes.json()) as { requirements: unknown[] };
    expect(agg.requirements).toHaveLength(7);

    const factorRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/terrain-requirements/factors/ELEVATION`,
    );
    expect(factorRes.status).toBe(200);
    const factor = (await factorRes.json()) as {
      terrainFactor: string;
      minimum: number | null;
      unit: string;
    };
    expect(factor.terrainFactor).toBe('ELEVATION');
    expect(factor.minimum).toBeNull();
    expect(factor.unit).toBe('m');
  });

  it('POST duplicate TerrainFactor returns 422', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const barley = listBody.items.find((i) => i.cropCode === 'barley')!;

    const res = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${barley.id}/terrain-requirements`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terrainFactor: 'TWI', unit: 'index' }),
      },
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('TERRAIN_REQUIREMENT_INVALID');
  });

  it('PUT then DELETE terrain requirement', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const melon = listBody.items.find((i) => i.cropCode === 'melon')!;

    const factorRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/terrain-requirements/factors/ASPECT`,
    );
    const factor = (await factorRes.json()) as { id: string; version: number };

    const putRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/terrain-requirements/${factor.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'HTTP update' }),
      },
    );
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as {
      id: string;
      description: string;
      version: number;
    };
    expect(putBody.description).toBe('HTTP update');
    expect(putBody.version).toBe(factor.version + 1);

    const delRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/terrain-requirements/${putBody.id}`,
      { method: 'DELETE' },
    );
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { isActive: boolean };
    expect(delBody.isActive).toBe(false);
  });
});
