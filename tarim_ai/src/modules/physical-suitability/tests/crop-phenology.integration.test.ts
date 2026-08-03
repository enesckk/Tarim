import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('crop phenology engine HTTP integration', () => {
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

  it('GET growth-stages list and details for wheat', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const wheat = listBody.items.find((i) => i.cropCode === 'wheat');
    expect(wheat).toBeTruthy();

    const stagesRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat!.id}/growth-stages`,
    );
    expect(stagesRes.status).toBe(200);
    const stagesBody = (await stagesRes.json()) as {
      items: Array<{ id: string; stageCode: string }>;
      count: number;
    };
    expect(stagesBody.count).toBe(13);
    expect(stagesBody.items[0]!.stageCode).toBe('SEED');

    const detailRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat!.id}/growth-stages/${stagesBody.items[0]!.id}`,
    );
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as {
      stageCode: string;
      references: unknown[];
    };
    expect(detail.stageCode).toBe('SEED');
    expect(Array.isArray(detail.references)).toBe(true);
  });

  it('POST duplicate StageCode returns 422', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const barley = listBody.items.find((i) => i.cropCode === 'barley')!;

    const res = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${barley.id}/growth-stages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageCode: 'SEED',
          stageName: 'Duplicate Seed',
          stageOrder: 50,
        }),
      },
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('GROWTH_STAGE_INVALID');
  });

  it('PUT then DELETE growth stage', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const chickpea = listBody.items.find((i) => i.cropCode === 'chickpea')!;

    const stagesRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${chickpea.id}/growth-stages`,
    );
    const stagesBody = (await stagesRes.json()) as {
      items: Array<{ id: string; stageCode: string; version: number }>;
    };
    const branching = stagesBody.items.find((s) => s.stageCode === 'BRANCHING')!;

    const putRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${chickpea.id}/growth-stages/${branching.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageName: 'Branching Updated' }),
      },
    );
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as { id: string; stageName: string; version: number };
    expect(putBody.stageName).toBe('Branching Updated');
    expect(putBody.version).toBe(branching.version + 1);

    const delRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${chickpea.id}/growth-stages/${putBody.id}`,
      { method: 'DELETE' },
    );
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { isActive: boolean };
    expect(delBody.isActive).toBe(false);
  });
});
