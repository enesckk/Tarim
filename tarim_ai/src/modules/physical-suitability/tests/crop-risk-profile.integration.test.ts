import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('crop risk profile HTTP integration', () => {
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

  it('GET risk-profile aggregate and risk type for wheat', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const wheat = listBody.items.find((i) => i.cropCode === 'wheat')!;

    const aggRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/risk-profile`,
    );
    expect(aggRes.status).toBe(200);
    const agg = (await aggRes.json()) as { risks: unknown[] };
    expect(agg.risks).toHaveLength(12);

    const factorRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/risk-profile/risks/FROST`,
    );
    expect(factorRes.status).toBe(200);
    const factor = (await factorRes.json()) as {
      riskType: string;
      riskLevel: string;
      sensitivity: string;
      mitigationSuggestion: string | null;
    };
    expect(factor.riskType).toBe('FROST');
    expect(factor.riskLevel).toBe('Unknown');
    expect(factor.sensitivity).toBe('Unknown');
    expect(factor.mitigationSuggestion).toBeNull();
  });

  it('POST duplicate RiskType returns 422', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const barley = listBody.items.find((i) => i.cropCode === 'barley')!;

    const res = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${barley.id}/risk-profile/risks`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskType: 'HAIL' }),
      },
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('CROP_RISK_INVALID');
  });

  it('PUT then DELETE crop risk', async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const melon = listBody.items.find((i) => i.cropCode === 'melon')!;

    const factorRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/risk-profile/risks/WIND`,
    );
    const factor = (await factorRes.json()) as { id: string; version: number };

    const putRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/risk-profile/${factor.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'HTTP update', riskLevel: 'Low' }),
      },
    );
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as {
      id: string;
      description: string;
      riskLevel: string;
      version: number;
    };
    expect(putBody.description).toBe('HTTP update');
    expect(putBody.riskLevel).toBe('Low');
    expect(putBody.version).toBe(factor.version + 1);

    const delRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${melon.id}/risk-profile/${putBody.id}`,
      { method: 'DELETE' },
    );
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { isActive: boolean };
    expect(delBody.isActive).toBe(false);
  });
});
