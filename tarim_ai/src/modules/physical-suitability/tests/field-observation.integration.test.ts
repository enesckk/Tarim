import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('field observation HTTP integration (2.2H)', () => {
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

  it('survey lifecycle, points, results, evidence, device, review', async () => {
    const surveyRes = await fetch(`http://127.0.0.1:${port}/api/field-observation-surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surveyCode: `HTTP-FS-${port}`,
        parcelId: 'parcel-http',
        surveyType: 'INITIAL',
      }),
    });
    expect(surveyRes.status).toBe(201);
    const survey = (await surveyRes.json()) as { id: string };

    const listed = await fetch(
      `http://127.0.0.1:${port}/api/parcels/parcel-http/field-observation-surveys`,
    );
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as { count: number };
    expect(listedBody.count).toBeGreaterThanOrEqual(1);

    await fetch(`http://127.0.0.1:${port}/api/field-observation-surveys/${survey.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const pointRes = await fetch(
      `http://127.0.0.1:${port}/api/field-observation-surveys/${survey.id}/points`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointCode: 'P1',
          latitude: 37.1,
          longitude: 37.4,
          accuracyMeters: 3,
        }),
      },
    );
    expect(pointRes.status).toBe(201);
    const point = (await pointRes.json()) as { id: string };

    const paramsRes = await fetch(`http://127.0.0.1:${port}/api/field-parameters`);
    const params = (await paramsRes.json()) as { count: number };
    expect(params.count).toBe(51);

    const slope = (await (
      await fetch(`http://127.0.0.1:${port}/api/field-parameters/code/SLOPE_OBSERVATION`)
    ).json()) as { id: string };

    const resultRes = await fetch(`http://127.0.0.1:${port}/api/field-observation-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surveyId: survey.id,
        observationPointId: point.id,
        parameterId: slope.id,
        numericValue: 4.5,
        dataOrigin: 'OBSERVED',
      }),
    });
    expect(resultRes.status).toBe(201);
    const result = (await resultRes.json()) as { id: string };

    const evidenceRes = await fetch(`http://127.0.0.1:${port}/api/field-evidence/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surveyId: survey.id,
        observationResultId: result.id,
        evidenceType: 'PHOTO',
        fileName: 'slope.jpg',
        fileHash: 'hash-http-1',
        latitude: 37.1,
        longitude: 37.4,
      }),
    });
    expect(evidenceRes.status).toBe(201);
    const evidence = (await evidenceRes.json()) as {
      id: string;
      fileHash: string;
      isActive: boolean;
    };
    expect(evidence.fileHash).toBe('hash-http-1');

    const deviceRes = await fetch(`http://127.0.0.1:${port}/api/field-measurement-devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceCode: `DEV-${port}`,
        deviceName: 'GPS',
        deviceType: 'GPS',
      }),
    });
    expect(deviceRes.status).toBe(201);
    const device = (await deviceRes.json()) as { id: string };

    const measRes = await fetch(`http://127.0.0.1:${port}/api/field-device-measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        observationResultId: result.id,
        deviceId: device.id,
        measuredValue: 4.5,
        measuredAt: '2026-07-01T10:00:00.000Z',
      }),
    });
    expect(measRes.status).toBe(201);

    await fetch(`http://127.0.0.1:${port}/api/field-observation-surveys/${survey.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    await fetch(`http://127.0.0.1:${port}/api/field-observation-surveys/${survey.id}/submit-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const reviewRes = await fetch(
      `http://127.0.0.1:${port}/api/field-observation-surveys/${survey.id}/review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: 'expert', reviewerRole: 'lead' }),
      },
    );
    expect(reviewRes.status).toBe(201);

    const approveRes = await fetch(
      `http://127.0.0.1:${port}/api/field-observation-surveys/${survey.id}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: 'expert' }),
      },
    );
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as { surveyStatus: string };
    expect(approved.surveyStatus).toBe('APPROVED');

    const revisionRes = await fetch(
      `http://127.0.0.1:${port}/api/field-observation-surveys/${survey.id}/request-revision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: 'expert', reviewNotes: 'recheck' }),
      },
    );
    expect(revisionRes.status).toBe(200);
    const revised = (await revisionRes.json()) as { surveyStatus: string };
    expect(revised.surveyStatus).toBe('IN_PROGRESS');

    const delEvidence = await fetch(`http://127.0.0.1:${port}/api/field-evidence/${evidence.id}`, {
      method: 'DELETE',
    });
    expect(delEvidence.status).toBe(200);
    const deleted = (await delEvidence.json()) as { isActive: boolean };
    expect(deleted.isActive).toBe(false);

    const evidenceList = await fetch(
      `http://127.0.0.1:${port}/api/field-observation-surveys/${survey.id}/evidence`,
    );
    expect(evidenceList.status).toBe(200);

    const paramCreate = await fetch(`http://127.0.0.1:${port}/api/field-parameters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: `CUSTOM_FO_${port}`,
        canonicalName: 'Custom',
        turkishDisplayName: 'Özel',
        englishDisplayName: 'Custom',
        category: 'SURFACE',
        valueType: 'TEXT',
      }),
    });
    expect(paramCreate.status).toBe(201);
  });
});
