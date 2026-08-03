import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('crop production calendar HTTP integration', () => {
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

  it('GET production-calendar aggregate is empty for wheat', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const wheat = listBody.items.find((i) => i.cropCode === 'wheat')!;

    const aggRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/production-calendar`,
    );
    expect(aggRes.status).toBe(200);
    const agg = (await aggRes.json()) as { calendars: unknown[]; regionCode: string | null };
    expect(agg.calendars).toHaveLength(0);
    expect(agg.regionCode).toBe('TR-GA');
  });

  it('POST Province shell then reject duplicate RegionId', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const barley = listBody.items.find((i) => i.cropCode === 'barley')!;

    const createRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${barley.id}/production-calendar/regions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: 'TR-27',
          regionScope: 'Province',
          regionCode: 'TR-27',
          irrigatedSupported: true,
        }),
      },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      plantingStart: string | null;
      regionScope: string;
    };
    expect(created.plantingStart).toBeNull();
    expect(created.regionScope).toBe('Province');

    const dupRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${barley.id}/production-calendar/regions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: 'TR-27',
          regionScope: 'Province',
        }),
      },
    );
    expect(dupRes.status).toBe(422);
    const body = (await dupRes.json()) as { error: { code: string } };
    expect(body.error.code).toBe('PRODUCTION_CALENDAR_INVALID');
  });

  it('PUT then DELETE production calendar', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const melon = listBody.items.find((i) => i.cropCode === 'melon')!;

    const createRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/production-calendar/regions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: 'TR-27-1901',
          regionScope: 'District',
          parentRegionId: 'TR-27',
          rainfedSupported: true,
        }),
      },
    );
    const created = (await createRes.json()) as { id: string; version: number };

    const putRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/production-calendar/${created.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ greenhouseSupported: true }),
      },
    );
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as {
      id: string;
      greenhouseSupported: boolean;
      version: number;
      harvestStart: string | null;
    };
    expect(putBody.greenhouseSupported).toBe(true);
    expect(putBody.harvestStart).toBeNull();
    expect(putBody.version).toBe(created.version + 1);

    const delRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/production-calendar/${putBody.id}`,
      { method: 'DELETE' },
    );
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { isActive: boolean };
    expect(delBody.isActive).toBe(false);
  });
});
