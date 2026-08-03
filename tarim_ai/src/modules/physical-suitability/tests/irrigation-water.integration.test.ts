import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('irrigation water laboratory HTTP integration', () => {
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

  it('water source CRUD + parcel listing', async () => {
    const createdRes = await fetch(`http://127.0.0.1:${port}/api/water-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceCode: `HTTP-WS-${port}`,
        sourceName: 'HTTP Well',
        sourceType: 'WELL',
        parcelId: 'parcel-1',
        latitude: 37.1,
        longitude: 37.4,
        declaredDischarge: 0,
      }),
    });
    expect(createdRes.status).toBe(201);
    const created = (await createdRes.json()) as { id: string };

    const listedRes = await fetch(`http://127.0.0.1:${port}/api/parcels/parcel-1/water-sources`);
    expect(listedRes.status).toBe(200);
    const listed = (await listedRes.json()) as { items: { id: string }[] };
    expect(listed.items.some((s) => s.id === created.id)).toBe(true);

    const updatedRes = await fetch(`http://127.0.0.1:${port}/api/water-sources/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceName: 'Updated Well' }),
    });
    expect(updatedRes.status).toBe(200);
    const updated = (await updatedRes.json()) as { sourceName: string };
    expect(updated.sourceName).toBe('Updated Well');

    const deletedRes = await fetch(`http://127.0.0.1:${port}/api/water-sources/${created.id}`, {
      method: 'DELETE',
    });
    expect(deletedRes.status).toBe(200);
    const deleted = (await deletedRes.json()) as { isActive: boolean };
    expect(deleted.isActive).toBe(false);
  });

  it('sample CRUD, results, normalize, indicators, custody', async () => {
    const sourceRes = await fetch(`http://127.0.0.1:${port}/api/water-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceCode: `HTTP-SRC-${port}`,
        sourceName: 'Src',
        sourceType: 'SPRING',
      }),
    });
    expect(sourceRes.status).toBe(201);
    const source = (await sourceRes.json()) as { id: string };

    const sampleRes = await fetch(`http://127.0.0.1:${port}/api/water-samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waterSourceId: source.id,
        sampleCode: `HTTP-S-${port}`,
        currentStatus: 'COLLECTED',
      }),
    });
    expect(sampleRes.status).toBe(201);
    const sample = (await sampleRes.json()) as { id: string };

    const statusRes = await fetch(`http://127.0.0.1:${port}/api/water-samples/${sample.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStatus: 'RECEIVED' }),
    });
    expect(statusRes.status).toBe(200);
    const status = (await statusRes.json()) as { currentStatus: string };
    expect(status.currentStatus).toBe('RECEIVED');

    const paramsRes = await fetch(`http://127.0.0.1:${port}/api/water-parameters`);
    expect(paramsRes.status).toBe(200);
    const params = (await paramsRes.json()) as { count: number };
    expect(params.count).toBeGreaterThanOrEqual(24);

    const sodiumRes = await fetch(`http://127.0.0.1:${port}/api/water-parameters/code/SODIUM`);
    expect(sodiumRes.status).toBe(200);
    const sodium = (await sodiumRes.json()) as { id: string; canonicalUnitId: string };

    const ionRes = await fetch(`http://127.0.0.1:${port}/api/water-analysis-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: sample.id,
        parameterId: sodium.id,
        measuredValue: 5,
        measuredUnitId: sodium.canonicalUnitId,
        rawValue: '5',
        rawUnit: 'meq/L',
      }),
    });
    expect(ionRes.status).toBe(201);
    const ionResult = (await ionRes.json()) as { id: string; rawValue: string };
    expect(ionResult.rawValue).toBe('5');

    const ca = (await (
      await fetch(`http://127.0.0.1:${port}/api/water-parameters/code/CALCIUM`)
    ).json()) as { id: string; canonicalUnitId: string };
    const mg = (await (
      await fetch(`http://127.0.0.1:${port}/api/water-parameters/code/MAGNESIUM`)
    ).json()) as { id: string; canonicalUnitId: string };

    await fetch(`http://127.0.0.1:${port}/api/water-analysis-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: sample.id,
        parameterId: ca.id,
        measuredValue: 2,
        measuredUnitId: ca.canonicalUnitId,
      }),
    });
    await fetch(`http://127.0.0.1:${port}/api/water-analysis-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: sample.id,
        parameterId: mg.id,
        measuredValue: 2,
        measuredUnitId: mg.canonicalUnitId,
      }),
    });

    const resultsRes = await fetch(
      `http://127.0.0.1:${port}/api/water-samples/${sample.id}/results`,
    );
    expect(resultsRes.status).toBe(200);
    const results = (await resultsRes.json()) as { count: number };
    expect(results.count).toBeGreaterThanOrEqual(3);

    const normalizeRes = await fetch(
      `http://127.0.0.1:${port}/api/water-analysis-results/normalize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: ionResult.id }),
      },
    );
    expect(normalizeRes.status).toBe(200);
    const normalized = (await normalizeRes.json()) as { rawValue: string };
    expect(normalized.rawValue).toBe('5');

    const calcRes = await fetch(
      `http://127.0.0.1:${port}/api/water-samples/${sample.id}/calculate-indicators`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    );
    expect(calcRes.status).toBe(200);
    const calc = (await calcRes.json()) as {
      items: { indicatorCode: string; calculationStatus: string }[];
    };
    const sar = calc.items.find((i) => i.indicatorCode === 'SAR');
    expect(sar?.calculationStatus).toBe('CALCULATED');

    const invalidCalc = await fetch(
      `http://127.0.0.1:${port}/api/water-samples/00000000-0000-4000-8000-000000000099/calculate-indicators`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    );
    expect(invalidCalc.status).toBe(404);

    const custody1 = await fetch(
      `http://127.0.0.1:${port}/api/water-samples/${sample.id}/chain-of-custody`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COLLECTED',
          performedAt: '2026-07-01T08:00:00.000Z',
          performedBy: 'Tech',
        }),
      },
    );
    expect(custody1.status).toBe(201);

    const custody2 = await fetch(
      `http://127.0.0.1:${port}/api/water-samples/${sample.id}/chain-of-custody`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECEIVED',
          performedAt: '2026-07-01T12:00:00.000Z',
        }),
      },
    );
    expect(custody2.status).toBe(201);

    const custodyListRes = await fetch(
      `http://127.0.0.1:${port}/api/water-samples/${sample.id}/chain-of-custody`,
    );
    const custodyList = (await custodyListRes.json()) as { count: number };
    expect(custodyList.count).toBe(2);
  });

  it('parameter catalog CRUD', async () => {
    const createdRes = await fetch(`http://127.0.0.1:${port}/api/water-parameters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: `CUSTOM_${port}`,
        canonicalName: 'Custom param',
        turkishDisplayName: 'Özel',
        englishDisplayName: 'Custom',
        category: 'GENERAL',
        isDirectlyMeasured: true,
        isCalculated: false,
      }),
    });
    expect(createdRes.status).toBe(201);
    const created = (await createdRes.json()) as { id: string };

    const updatedRes = await fetch(`http://127.0.0.1:${port}/api/water-parameters/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turkishDisplayName: 'Güncel' }),
    });
    expect(updatedRes.status).toBe(200);
    const updated = (await updatedRes.json()) as { turkishDisplayName: string };
    expect(updated.turkishDisplayName).toBe('Güncel');
  });
});
