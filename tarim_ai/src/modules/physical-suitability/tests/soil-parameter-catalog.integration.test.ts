import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('soil parameter catalog HTTP integration (2.2C)', () => {
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

  it('parameter catalog CRUD + unit convert + result normalization', async () => {
    const list = await fetch(`http://127.0.0.1:${port}/api/soil-parameters`);
    expect(list.status).toBe(200);
    const listed = (await list.json()) as { count: number; items: Array<{ code: string }> };
    expect(listed.count).toBeGreaterThan(40);
    expect(listed.items.some((p) => p.code === 'SOIL_PH')).toBe(true);

    const byCode = await fetch(`http://127.0.0.1:${port}/api/soil-parameters/code/SOIL_EC`);
    expect(byCode.status).toBe(200);
    const ec = (await byCode.json()) as { id: string; code: string };
    expect(ec.code).toBe('SOIL_EC');

    const created = await fetch(`http://127.0.0.1:${port}/api/soil-parameters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'CUSTOM_TEST_PARAM',
        canonicalName: 'Custom test',
        turkishDisplayName: 'Özel test',
        englishDisplayName: 'Custom test',
        category: 'Chemical',
        dataType: 'Decimal',
        valueType: 'NUMERIC',
        canonicalUnitId: (
          await (
            await fetch(`http://127.0.0.1:${port}/api/soil-units`)
          ).json() as { items: Array<{ id: string; code: string }> }
        ).items.find((u) => u.code === 'NONE')!.id,
      }),
    });
    expect(created.status).toBe(201);
    const param = (await created.json()) as { id: string };
    const updated = await fetch(`http://127.0.0.1:${port}/api/soil-parameters/${param.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ englishDisplayName: 'Custom test updated' }),
    });
    expect(updated.status).toBe(200);

    const convert = await fetch(`http://127.0.0.1:${port}/api/soil-units/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1.5, fromUnit: 'MS_PER_CM', toUnit: 'DS_PER_M' }),
    });
    expect(convert.status).toBe(200);
    const converted = (await convert.json()) as { ok: boolean; value: number };
    expect(converted.ok).toBe(true);
    expect(converted.value).toBe(1.5);

    const invalidUnit = await fetch(`http://127.0.0.1:${port}/api/soil-units/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1, fromUnit: 'PERCENT', toUnit: 'DS_PER_M' }),
    });
    expect(invalidUnit.status).toBe(422);

    const sampleRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/soil-samples`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelId: 'parcel-c', sampleCode: 'C-1' }),
      },
    );
    expect(sampleRes.status).toBe(201);
    const sample = (await sampleRes.json()) as { id: string };

    const resultRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/soil-samples/${sample.id}/results`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameterCode: 'SOIL_EC',
          rawValue: 2.2,
          rawUnit: 'mS/cm',
          valueSourceType: 'Measured',
        }),
      },
    );
    expect(resultRes.status).toBe(201);
    const result = (await resultRes.json()) as {
      id: string;
      rawValue: string;
      rawUnit: string;
      normalizedValue: number;
      unit: string;
      normalizationStatus: string;
    };
    expect(result.rawValue).toBe('2.2');
    expect(result.rawUnit).toBe('mS/cm');
    expect(result.normalizedValue).toBe(2.2);
    expect(result.unit).toBe('DS_PER_M');
    expect(result.normalizationStatus).toBe('NORMALIZED');

    const normalize = await fetch(
      `http://127.0.0.1:${port}/api/soil-analysis-results/normalize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: result.id }),
      },
    );
    expect(normalize.status).toBe(200);

    const validate = await fetch(
      `http://127.0.0.1:${port}/api/soil-analysis-results/validate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameterCode: 'SOIL_PH',
          rawValue: 'not-a-number',
          rawUnit: 'PH_UNIT',
        }),
      },
    );
    expect(validate.status).toBe(422);

    await fetch(`http://127.0.0.1:${port}/api/soil-parameters/${param.id}`, {
      method: 'DELETE',
    });
  });
});
