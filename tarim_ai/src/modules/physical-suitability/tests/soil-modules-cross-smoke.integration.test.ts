import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

describe('soil modules HTTP cross-smoke (2.2A–F)', () => {
  let server: http.Server;
  let port: number;
  let base: string;

  beforeEach(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
    base = `http://127.0.0.1:${port}/api`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('end-to-end smoke across catalog, lab, report, import, sampling', async () => {
    // Catalog
    const params = await fetch(`${base}/soil-parameters`);
    expect(params.status).toBe(200);
    const paramBody = (await json(params)) as { count: number };
    expect(paramBody.count).toBeGreaterThan(40);

    const convert = await fetch(`${base}/soil-units/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1.5, fromUnit: 'MS_PER_CM', toUnit: 'DS_PER_M' }),
    });
    expect(convert.status).toBe(200);
    const converted = (await json(convert)) as { ok: boolean; value: number };
    expect(converted.ok).toBe(true);
    expect(converted.value).toBe(1.5);

    // Laboratory
    const labRes = await fetch(`${base}/physical-suitability/laboratories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Lab', country: 'TR' }),
    });
    expect(labRes.status).toBe(201);
    const lab = (await json(labRes)) as { id: string };

    const sampleRes = await fetch(`${base}/physical-suitability/soil-samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcelId: 'smoke-parcel',
        sampleCode: 'SMOKE-LAB-1',
        laboratoryId: lab.id,
      }),
    });
    expect(sampleRes.status).toBe(201);
    const labSample = (await json(sampleRes)) as { id: string };

    const resultRes = await fetch(
      `${base}/physical-suitability/soil-samples/${labSample.id}/results`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameterCode: 'SOIL_PH',
          parameterName: 'pH',
          unit: 'pH',
          rawValue: 7.1,
          rawUnit: 'pH',
        }),
      },
    );
    expect(resultRes.status).toBe(201);

    // Report
    const reportRes = await fetch(`${base}/laboratory-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportNumber: 'SMOKE-R-1',
        laboratoryId: lab.id,
      }),
    });
    expect(reportRes.status).toBe(201);
    const report = (await json(reportRes)) as { id: string };

    const uploadReport = await fetch(`${base}/laboratory-reports/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId: report.id,
        reportNumber: 'SMOKE-R-1',
        laboratoryId: lab.id,
        fileName: 'smoke.pdf',
        fileType: 'application/pdf',
        fileCategory: 'PDF',
        dataBase64: Buffer.from('smoke-report').toString('base64'),
      }),
    });
    expect(uploadReport.status).toBe(201);

    // Import
    const mapRes = await fetch(`${base}/laboratory-imports/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        laboratoryId: lab.id,
        externalParameterName: 'pH',
        internalParameterCode: 'SOIL_PH',
        internalUnit: 'PH_UNIT',
      }),
    });
    expect(mapRes.status).toBe(201);

    const importUpload = await fetch(`${base}/laboratory-imports/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        laboratoryId: lab.id,
        importType: 'CSV',
        originalFileName: 'smoke.csv',
        fileType: 'text/csv',
        declaredColumns: ['SampleCode', 'pH'],
      }),
    });
    expect(importUpload.status).toBe(201);
    const imp = (await json(importUpload)) as { sessionId: string };

    const validate = await fetch(`${base}/laboratory-imports/${imp.sessionId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        declaredColumns: ['SampleCode', 'pH'],
        requiredColumns: ['SampleCode'],
        externalParameters: [{ name: 'pH', unit: 'PH_UNIT' }],
        sampleCodes: [{ row: 1, sampleCode: 'OK' }],
      }),
    });
    expect(validate.status).toBe(200);

    const preview = await fetch(`${base}/laboratory-imports/${imp.sessionId}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(preview.status).toBe(200);

    const commit = await fetch(`${base}/laboratory-imports/${imp.sessionId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    expect(commit.status).toBe(200);
    const committed = (await json(commit)) as {
      session: { importStatus: string; successfulRows: number };
    };
    expect(committed.session.importStatus).toBe('COMPLETED');
    expect(committed.session.successfulRows).toBe(0);

    // Sampling
    const camp = await fetch(`${base}/sampling-campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignCode: 'SMOKE-CMP',
        campaignName: 'Smoke Campaign',
        status: 'ONGOING',
      }),
    });
    expect(camp.status).toBe(201);
    const campaign = (await json(camp)) as { id: string };

    const point = await fetch(`${base}/sampling-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        pointCode: 'SP-1',
        latitude: 37.066,
        longitude: 37.383,
        samplingDepthFrom: 0,
        samplingDepthTo: 30,
      }),
    });
    expect(point.status).toBe(201);
    const samplingPoint = (await json(point)) as { id: string };

    // Missing GPS rejected by zod/controller
    const badPoint = await fetch(`${base}/sampling-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        pointCode: 'SP-BAD',
      }),
    });
    expect(badPoint.status).toBe(400);

    const fieldSample = await fetch(`${base}/sampling-samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samplingPointId: samplingPoint.id,
        sampleCode: 'SMOKE-FIELD-1',
        sampleType: 'COMPOSITE',
        collectionDate: '2026-07-20T09:00:00.000Z',
        collectedBy: 'FieldTech',
      }),
    });
    expect(fieldSample.status).toBe(201);
    const fs = (await json(fieldSample)) as { id: string };

    const obs = await fetch(`${base}/sampling-observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samplingPointId: samplingPoint.id,
        observationType: 'MOISTURE',
        observationValue: 'moist',
      }),
    });
    expect(obs.status).toBe(201);

    const custody = await fetch(`${base}/sampling-chain-of-custody`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: fs.id,
        action: 'TRANSPORTED',
        performedDate: '2026-07-20T12:00:00.000Z',
      }),
    });
    expect(custody.status).toBe(201);

    const aggregate = await fetch(`${base}/sampling-campaigns/${campaign.id}`);
    expect(aggregate.status).toBe(200);
    const agg = (await json(aggregate)) as {
      samples: unknown[];
      points: unknown[];
      observations: unknown[];
      chainOfCustody: unknown[];
    };
    expect(agg.points).toHaveLength(1);
    expect(agg.samples).toHaveLength(1);
    expect(agg.observations).toHaveLength(1);
    expect(agg.chainOfCustody.length).toBeGreaterThanOrEqual(2);

    // Negative paths
    const dupSample = await fetch(`${base}/sampling-samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samplingPointId: samplingPoint.id,
        sampleCode: 'SMOKE-FIELD-1',
        sampleType: 'SINGLE_POINT',
      }),
    });
    expect(dupSample.status).toBe(422);

    const badCustody = await fetch(`${base}/sampling-chain-of-custody`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: fs.id,
        action: 'RECEIVED',
        performedDate: '2026-07-19T08:00:00.000Z',
      }),
    });
    expect(badCustody.status).toBe(422);
  });
});
