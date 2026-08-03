import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('agroclimate HTTP integration (2.3A)', () => {
  let server: http.Server;
  let port: number;
  const base = () => `http://127.0.0.1:${port}/api`;

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

  async function json(path: string, init?: RequestInit): Promise<{
    res: Response;
    body: any;
  }> {
    const res = await fetch(`${base()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => null);
    return { res, body };
  }

  it('catalog, config CRUD, lifecycle, frost/gdd/heat/precip/et0, comparison, recalculation', async () => {
    const catalog = await json('/agroclimate/indicators');
    expect(catalog.res.status).toBe(200);
    expect(catalog.body.count).toBe(58);

    const byCode = await json('/agroclimate/indicators/code/FROST_DAY_COUNT');
    expect(byCode.res.status).toBe(200);
    expect(byCode.body.code).toBe('FROST_DAY_COUNT');

    const src1 = await json('/agroclimate/data-sources', {
      method: 'POST',
      body: JSON.stringify({
        code: `NASA-${port}`,
        name: 'NASA POWER',
        provider: 'NASA',
        sourceType: 'NASA_POWER',
      }),
    });
    expect(src1.res.status).toBe(201);
    const sourceId = src1.body.id as string;

    const src2 = await json('/agroclimate/data-sources', {
      method: 'POST',
      body: JSON.stringify({
        code: `ERA5-${port}`,
        name: 'ERA5',
        provider: 'ECMWF',
        sourceType: 'ERA5_LAND',
      }),
    });
    expect(src2.res.status).toBe(201);
    const source2Id = src2.body.id as string;

    const frostIndId = byCode.body.id as string;
    const cfg = await json('/agroclimate/configurations', {
      method: 'POST',
      body: JSON.stringify({
        indicatorId: frostIndId,
        regionId: 'TR-27',
        frostThreshold: 0,
        severeFrostThreshold: -5,
        baseTemperature: 10,
        extremeHeatThreshold: 35,
        heatwaveMinimumDuration: 2,
        rainyDayThreshold: 1,
        heavyRainThreshold: 20,
        dryDayThreshold: 1,
      }),
    });
    expect(cfg.res.status).toBe(201);

    const upd = await json(`/agroclimate/configurations/${cfg.body.id}`, {
      method: 'PUT',
      body: JSON.stringify({ frostThreshold: -0.5 }),
    });
    expect(upd.res.status).toBe(200);
    expect(upd.body.frostThreshold).toBe(-0.5);

    const parcelId = `parcel-ac-${port}`;
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];
    for (const d of dates) {
      for (const [param, val] of [
        ['T2M_MIN', -2],
        ['T2M_MAX', 12],
        ['PRECIPITATION', 0],
        ['REFERENCE_ET', 3],
      ] as const) {
        const obs = await json('/agroclimate/observations', {
          method: 'POST',
          body: JSON.stringify({
            parcelId,
            dataSourceId: sourceId,
            observationDate: d,
            parameterCode: param,
            rawValue: val,
            normalizedValue: val,
            qualityFlag: 'RAW',
          }),
        });
        expect(obs.res.status).toBe(201);
      }
      await json('/agroclimate/observations', {
        method: 'POST',
        body: JSON.stringify({
          parcelId,
          dataSourceId: source2Id,
          observationDate: d,
          parameterCode: 'T2M_MIN',
          rawValue: -1.5,
          normalizedValue: -1.5,
        }),
      });
    }
    // Missing precip day must not be posted as 0 — leave a gap day without precip for dry-spell logic
    // (all days have precip 0 above intentionally for known dry days)

    const analysis = await json('/agroclimate/analyses', {
      method: 'POST',
      body: JSON.stringify({
        parcelId,
        analysisCode: `AC-${port}`,
        analysisPeriodStart: '2024-01-01',
        analysisPeriodEnd: '2024-01-05',
        primaryDataSourceId: sourceId,
        secondaryDataSourceId: source2Id,
        minimumCoverageRequirement: 40,
      }),
    });
    expect(analysis.res.status).toBe(201);
    const analysisId = analysis.body.id as string;

    const listed = await json(`/parcels/${parcelId}/agroclimate-analyses`);
    expect(listed.res.status).toBe(200);
    expect(listed.body.count).toBeGreaterThanOrEqual(1);

    const validated = await json(`/agroclimate/analyses/${analysisId}/validate`, { method: 'POST' });
    expect(validated.res.status).toBe(200);

    const calculated = await json(`/agroclimate/analyses/${analysisId}/calculate`, { method: 'POST' });
    expect(calculated.res.status).toBe(200);
    expect(['COMPLETED', 'PARTIALLY_COMPLETED']).toContain(calculated.body.run.status);

    const results = await json(`/agroclimate/analyses/${analysisId}/results`);
    expect(results.res.status).toBe(200);
    expect(results.body.count).toBeGreaterThan(0);

    const frost = (results.body.items as Array<{ indicatorId: string; calculatedValue: number | null; version: number }>).find(
      (r) => r.indicatorId === frostIndId,
    );
    expect(frost?.calculatedValue).toBe(5);

    const parcelIndicators = await json(`/parcels/${parcelId}/agroclimate-indicators`);
    expect(parcelIndicators.res.status).toBe(200);

    const byInd = await json(`/parcels/${parcelId}/agroclimate-indicators/FROST_DAY_COUNT`);
    expect(byInd.res.status).toBe(200);

    const cmp = await json('/agroclimate/source-comparisons', {
      method: 'POST',
      body: JSON.stringify({
        parcelId,
        parameterCode: 'T2M_MIN',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-05',
        primarySourceId: sourceId,
        secondarySourceId: source2Id,
      }),
    });
    expect(cmp.res.status).toBe(201);
    expect(cmp.body.comparisonStatus).toBe('REQUIRES_REVIEW');

    const cmpList = await json(`/parcels/${parcelId}/climate-source-comparisons`);
    expect(cmpList.res.status).toBe(200);
    expect(cmpList.body.count).toBeGreaterThanOrEqual(1);

    const recalc = await json(`/agroclimate/analyses/${analysisId}/recalculate`, { method: 'POST' });
    expect(recalc.res.status).toBe(200);
    const frost2 = (recalc.body.results as Array<{ indicatorId: string; version: number }>).find(
      (r) => r.indicatorId === frostIndId,
    );
    expect(frost2?.version).toBeGreaterThanOrEqual(2);

    const del = await json(`/agroclimate/configurations/${cfg.body.id}`, { method: 'DELETE' });
    expect(del.res.status).toBe(200);
  });

  it('partial data analysis does not invent zeros', async () => {
    const src = await json('/agroclimate/data-sources', {
      method: 'POST',
      body: JSON.stringify({
        code: `PARTIAL-${port}`,
        name: 'Partial',
        provider: 'x',
        sourceType: 'MANUAL_IMPORT',
      }),
    });
    const sourceId = src.body.id as string;
    const parcelId = `parcel-partial-${port}`;
    await json('/agroclimate/observations', {
      method: 'POST',
      body: JSON.stringify({
        parcelId,
        dataSourceId: sourceId,
        observationDate: '2024-06-01',
        parameterCode: 'T2M_MIN',
        normalizedValue: 8,
        rawValue: 8,
      }),
    });
    await json('/agroclimate/observations', {
      method: 'POST',
      body: JSON.stringify({
        parcelId,
        dataSourceId: sourceId,
        observationDate: '2024-06-01',
        parameterCode: 'T2M_MAX',
        normalizedValue: 18,
        rawValue: 18,
      }),
    });
    // gap day with explicit MISSING — not stored as 0
    await json('/agroclimate/observations', {
      method: 'POST',
      body: JSON.stringify({
        parcelId,
        dataSourceId: sourceId,
        observationDate: '2024-06-02',
        parameterCode: 'PRECIPITATION',
        rawValue: null,
        normalizedValue: null,
        missingReason: 'sensor offline',
        qualityFlag: 'MISSING',
      }),
    });

    const analysis = await json('/agroclimate/analyses', {
      method: 'POST',
      body: JSON.stringify({
        parcelId,
        analysisCode: `AC-PARTIAL-${port}`,
        analysisPeriodStart: '2024-06-01',
        analysisPeriodEnd: '2024-06-03',
        primaryDataSourceId: sourceId,
      }),
    });
    const calc = await json(`/agroclimate/analyses/${analysis.body.id}/calculate`, { method: 'POST' });
    expect(calc.res.status).toBe(200);
    expect(calc.body.run.actualCoveragePercent).not.toBe(100);
  });
});
