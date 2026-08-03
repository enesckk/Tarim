import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('crop water requirements HTTP integration', () => {
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

  it('GET water-requirements aggregate and factor for wheat', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const wheat = listBody.items.find((i) => i.cropCode === 'wheat')!;

    const aggRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/water-requirements`,
    );
    expect(aggRes.status).toBe(200);
    const agg = (await aggRes.json()) as { requirements: unknown[] };
    expect(agg.requirements).toHaveLength(9);

    const factorRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/water-requirements/factors/TOTAL_WATER_REQUIREMENT`,
    );
    expect(factorRes.status).toBe(200);
    const factor = (await factorRes.json()) as {
      waterFactor: string;
      minimum: number | null;
      unit: string;
    };
    expect(factor.waterFactor).toBe('TOTAL_WATER_REQUIREMENT');
    expect(factor.minimum).toBeNull();
    expect(factor.unit).toBe('mm');
  });

  it('POST duplicate WaterFactor returns 422', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const barley = listBody.items.find((i) => i.cropCode === 'barley')!;

    const res = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${barley.id}/water-requirements`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waterFactor: 'SAR_TOLERANCE', unit: 'SAR' }),
      },
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('WATER_REQUIREMENT_INVALID');
  });

  it('PUT then DELETE water requirement', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const melon = listBody.items.find((i) => i.cropCode === 'melon')!;

    const factorRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/water-requirements/factors/IRRIGATION_INTERVAL`,
    );
    const factor = (await factorRes.json()) as { id: string; version: number };

    const putRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/water-requirements/${factor.id}`,
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
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/water-requirements/${putBody.id}`,
      { method: 'DELETE' },
    );
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { isActive: boolean };
    expect(delBody.isActive).toBe(false);
  });
});
