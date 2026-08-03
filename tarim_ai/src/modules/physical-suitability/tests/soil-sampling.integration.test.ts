import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('soil sampling HTTP integration (2.2F)', () => {
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

  it('campaign/point/sample/observation/custody full CRUD', async () => {
    const campRes = await fetch(`http://127.0.0.1:${port}/api/sampling-campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignCode: 'HTTP-CMP',
        campaignName: 'HTTP Campaign',
        status: 'ONGOING',
      }),
    });
    expect(campRes.status).toBe(201);
    const campaign = (await campRes.json()) as { id: string };

    const pointRes = await fetch(`http://127.0.0.1:${port}/api/sampling-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        pointCode: 'HP-1',
        latitude: 37.05,
        longitude: 37.38,
        samplingDepthFrom: 0,
        samplingDepthTo: 20,
      }),
    });
    expect(pointRes.status).toBe(201);
    const point = (await pointRes.json()) as { id: string };

    const sampleRes = await fetch(`http://127.0.0.1:${port}/api/sampling-samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samplingPointId: point.id,
        sampleCode: 'HTTP-S-1',
        sampleType: 'COMPOSITE',
        collectionDate: '2026-07-10T08:00:00.000Z',
        collectedBy: 'Tech',
      }),
    });
    expect(sampleRes.status).toBe(201);
    const sample = (await sampleRes.json()) as { id: string; currentStatus: string };
    expect(sample.currentStatus).toBe('COLLECTED');

    const obsRes = await fetch(`http://127.0.0.1:${port}/api/sampling-observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samplingPointId: point.id,
        observationType: 'DRAINAGE',
        observationValue: 'good',
      }),
    });
    expect(obsRes.status).toBe(201);
    const obs = (await obsRes.json()) as { id: string };

    const obsPut = await fetch(
      `http://127.0.0.1:${port}/api/sampling-observations/${obs.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observationValue: 'moderate' }),
      },
    );
    expect(obsPut.status).toBe(200);

    const custodyRes = await fetch(`http://127.0.0.1:${port}/api/sampling-chain-of-custody`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: sample.id,
        action: 'TRANSPORTED',
        performedDate: '2026-07-10T12:00:00.000Z',
        performedBy: 'Driver',
      }),
    });
    expect(custodyRes.status).toBe(201);
    const custody = (await custodyRes.json()) as { id: string };

    const custodyPut = await fetch(
      `http://127.0.0.1:${port}/api/sampling-chain-of-custody/${custody.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'lab-gate' }),
      },
    );
    expect(custodyPut.status).toBe(200);

    const listCustody = await fetch(
      `http://127.0.0.1:${port}/api/sampling-samples/${sample.id}/chain-of-custody`,
    );
    expect(listCustody.status).toBe(200);
    const custodyBody = (await listCustody.json()) as { count: number };
    expect(custodyBody.count).toBeGreaterThanOrEqual(2);

    const aggregate = await fetch(
      `http://127.0.0.1:${port}/api/sampling-campaigns/${campaign.id}`,
    );
    expect(aggregate.status).toBe(200);
    const agg = (await aggregate.json()) as {
      samples: unknown[];
      points: unknown[];
      observations: unknown[];
    };
    expect(agg.points).toHaveLength(1);
    expect(agg.samples).toHaveLength(1);
    expect(agg.observations).toHaveLength(1);

    const campPut = await fetch(
      `http://127.0.0.1:${port}/api/sampling-campaigns/${campaign.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      },
    );
    expect(campPut.status).toBe(200);

    const pointPut = await fetch(`http://127.0.0.1:${port}/api/sampling-points/${point.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'http-updated' }),
    });
    expect(pointPut.status).toBe(200);

    const samplePut = await fetch(
      `http://127.0.0.1:${port}/api/sampling-samples/${sample.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStatus: 'RECEIVED' }),
      },
    );
    expect(samplePut.status).toBe(200);

    const dup = await fetch(`http://127.0.0.1:${port}/api/sampling-samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samplingPointId: point.id,
        sampleCode: 'HTTP-S-1',
        sampleType: 'SINGLE_POINT',
      }),
    });
    expect(dup.status).toBe(422);

    const custodyDel = await fetch(
      `http://127.0.0.1:${port}/api/sampling-chain-of-custody/${custody.id}`,
      { method: 'DELETE' },
    );
    expect(custodyDel.status).toBe(200);

    const obsDel = await fetch(
      `http://127.0.0.1:${port}/api/sampling-observations/${obs.id}`,
      { method: 'DELETE' },
    );
    expect(obsDel.status).toBe(200);

    const sampleDel = await fetch(
      `http://127.0.0.1:${port}/api/sampling-samples/${sample.id}`,
      { method: 'DELETE' },
    );
    expect(sampleDel.status).toBe(200);
    const discarded = (await sampleDel.json()) as { currentStatus: string };
    expect(discarded.currentStatus).toBe('DISCARDED');

    const campDel = await fetch(
      `http://127.0.0.1:${port}/api/sampling-campaigns/${campaign.id}`,
      { method: 'DELETE' },
    );
    expect(campDel.status).toBe(200);
    const cancelled = (await campDel.json()) as { status: string };
    expect(cancelled.status).toBe('CANCELLED');
  });
});
