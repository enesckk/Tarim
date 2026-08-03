import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('soil laboratory HTTP integration', () => {
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

  it('lab + sample + result + aggregate flow', async () => {
    const labRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/laboratories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HTTP Lab', country: 'TR', city: 'Gaziantep' }),
    });
    expect(labRes.status).toBe(201);
    const lab = (await labRes.json()) as { id: string };

    const sampleRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/soil-samples`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: 'parcel-http-1',
          sampleCode: 'HTTP-S-1',
          laboratoryId: lab.id,
        }),
      },
    );
    expect(sampleRes.status).toBe(201);
    const sample = (await sampleRes.json()) as { id: string; sampleCode: string };
    expect(sample.sampleCode).toBe('HTTP-S-1');

    const resultRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/soil-samples/${sample.id}/results`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameterCode: 'SOIL_PH',
          parameterName: 'Soil pH',
          unit: 'PH_UNIT',
          measuredValue: null,
          rawValue: null,
          rawUnit: 'PH_UNIT',
        }),
      },
    );
    expect(resultRes.status).toBe(201);
    const result = (await resultRes.json()) as {
      measuredValue: number | null;
      rawValue: string | null;
      normalizationStatus: string;
    };
    expect(result.measuredValue).toBeNull();
    expect(result.rawValue).toBeNull();
    expect(result.normalizationStatus).toBe('NOT_REQUIRED');

    const aggRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/soil-analyses/${sample.id}`,
    );
    expect(aggRes.status).toBe(200);
    const agg = (await aggRes.json()) as {
      results: unknown[];
      laboratory: { id: string } | null;
    };
    expect(agg.results).toHaveLength(1);
    expect(agg.laboratory?.id).toBe(lab.id);
  });

  it('rejects duplicate sample code with 422', async () => {
    await fetch(`http://127.0.0.1:${port}/api/physical-suitability/soil-samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parcelId: 'p', sampleCode: 'DUP-1' }),
    });
    const dup = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/soil-samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parcelId: 'p', sampleCode: 'DUP-1' }),
    });
    expect(dup.status).toBe(422);
    const body = (await dup.json()) as { error: { code: string } };
    expect(body.error.code).toBe('SAMPLE_CODE_DUPLICATE');
  });
});
