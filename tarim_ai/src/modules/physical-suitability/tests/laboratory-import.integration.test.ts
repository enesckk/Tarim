import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('laboratory import engine HTTP integration (2.2E)', () => {
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

  it('upload → validate → preview → import → validations', async () => {
    const labRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/laboratories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HTTP Import Lab' }),
    });
    expect(labRes.status).toBe(201);
    const lab = (await labRes.json()) as { id: string };

    const mapRes = await fetch(`http://127.0.0.1:${port}/api/laboratory-imports/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        laboratoryId: lab.id,
        externalParameterName: 'EC',
        internalParameterCode: 'SOIL_EC',
        internalUnit: 'DS_PER_M',
      }),
    });
    expect(mapRes.status).toBe(201);

    const upload = await fetch(`http://127.0.0.1:${port}/api/laboratory-imports/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        laboratoryId: lab.id,
        importType: 'CSV',
        originalFileName: 'ec.csv',
        fileType: 'text/csv',
        delimiter: ',',
        declaredColumns: ['SampleCode', 'EC'],
      }),
    });
    expect(upload.status).toBe(201);
    const aggregate = (await upload.json()) as {
      sessionId: string;
      session: { importStatus: string };
    };
    expect(aggregate.session.importStatus).toBe('UPLOADED');

    const validate = await fetch(
      `http://127.0.0.1:${port}/api/laboratory-imports/${aggregate.sessionId}/validate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          declaredColumns: ['SampleCode', 'EC'],
          requiredColumns: ['SampleCode'],
          externalParameters: [{ name: 'EC', unit: 'DS_PER_M' }],
          sampleCodes: [{ row: 1, sampleCode: 'S-HTTP-1' }],
        }),
      },
    );
    expect(validate.status).toBe(200);

    const preview = await fetch(
      `http://127.0.0.1:${port}/api/laboratory-imports/${aggregate.sessionId}/preview`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    expect(preview.status).toBe(200);
    const previewBody = (await preview.json()) as { sampleRows: unknown[] };
    expect(previewBody.sampleRows).toEqual([]);

    const commit = await fetch(
      `http://127.0.0.1:${port}/api/laboratory-imports/${aggregate.sessionId}/import`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      },
    );
    expect(commit.status).toBe(200);
    const committed = (await commit.json()) as {
      session: { importStatus: string; successfulRows: number };
    };
    expect(committed.session.importStatus).toBe('COMPLETED');
    expect(committed.session.successfulRows).toBe(0);

    const validations = await fetch(
      `http://127.0.0.1:${port}/api/laboratory-imports/${aggregate.sessionId}/validations`,
    );
    expect(validations.status).toBe(200);
    const valBody = (await validations.json()) as { count: number };
    expect(valBody.count).toBeGreaterThan(0);

    const details = await fetch(
      `http://127.0.0.1:${port}/api/laboratory-imports/${aggregate.sessionId}`,
    );
    expect(details.status).toBe(200);

    const list = await fetch(`http://127.0.0.1:${port}/api/laboratory-imports`);
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { count: number };
    expect(listBody.count).toBeGreaterThanOrEqual(1);
  });

  it('validate missing sample code yields failed session', async () => {
    const labRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/laboratories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Fail Lab' }),
    });
    const lab = (await labRes.json()) as { id: string };

    const upload = await fetch(`http://127.0.0.1:${port}/api/laboratory-imports/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        laboratoryId: lab.id,
        importType: 'XML',
        originalFileName: 'x.xml',
        fileType: 'application/xml',
      }),
    });
    const aggregate = (await upload.json()) as { sessionId: string };

    const validate = await fetch(
      `http://127.0.0.1:${port}/api/laboratory-imports/${aggregate.sessionId}/validate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          declaredColumns: ['SampleCode'],
          requiredColumns: ['SampleCode'],
          sampleCodes: [{ row: 1, sampleCode: null }],
        }),
      },
    );
    expect(validate.status).toBe(200);
    const body = (await validate.json()) as { session: { importStatus: string } };
    expect(body.session.importStatus).toBe('FAILED');
  });
});
