import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('laboratory report HTTP integration (2.2D)', () => {
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

  it('CRUD + upload + attachments + soft delete', async () => {
    const labRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/laboratories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HTTP Lab', country: 'TR' }),
    });
    expect(labRes.status).toBe(201);
    const lab = (await labRes.json()) as { id: string };

    const created = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportNumber: 'HTTP-R-1',
        laboratoryId: lab.id,
        customerName: 'Customer',
      }),
    });
    expect(created.status).toBe(201);
    const report = (await created.json()) as { id: string; status: string };
    expect(report.status).toBe('PENDING');

    const listed = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports`);
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as { count: number };
    expect(listBody.count).toBeGreaterThanOrEqual(1);

    const uploaded = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId: report.id,
        reportNumber: 'HTTP-R-1',
        laboratoryId: lab.id,
        fileName: 'scan.pdf',
        fileType: 'application/pdf',
        fileCategory: 'PDF',
        dataBase64: Buffer.from('http-lab-bytes').toString('base64'),
        uploadedBy: 'integration',
      }),
    });
    expect(uploaded.status).toBe(201);
    const aggregate = (await uploaded.json()) as {
      reportId: string;
      attachments: unknown[];
      importHistory: Array<{ importType: string; importedParameterCount: number }>;
    };
    expect(aggregate.attachments.length).toBeGreaterThanOrEqual(1);
    expect(aggregate.importHistory[0]?.importType).toBe('MANUAL');
    expect(aggregate.importHistory[0]?.importedParameterCount).toBe(0);

    const attachments = await fetch(
      `http://127.0.0.1:${port}/api/laboratory-reports/${report.id}/attachments`,
    );
    expect(attachments.status).toBe(200);
    const attBody = (await attachments.json()) as { count: number };
    expect(attBody.count).toBeGreaterThanOrEqual(1);

    const got = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports/${report.id}`);
    expect(got.status).toBe(200);

    const updated = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports/${report.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'reviewed' }),
    });
    expect(updated.status).toBe(200);

    const deleted = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports/${report.id}`, {
      method: 'DELETE',
    });
    expect(deleted.status).toBe(200);
    const soft = (await deleted.json()) as { isActive: boolean };
    expect(soft.isActive).toBe(false);

    const missing = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports/${report.id}`);
    expect(missing.status).toBe(404);
  });

  it('rejects duplicate report number with 422', async () => {
    const labRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/laboratories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dup Lab' }),
    });
    const lab = (await labRes.json()) as { id: string };

    const first = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportNumber: 'DUP-1', laboratoryId: lab.id }),
    });
    expect(first.status).toBe(201);

    const second = await fetch(`http://127.0.0.1:${port}/api/laboratory-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportNumber: 'DUP-1', laboratoryId: lab.id }),
    });
    expect(second.status).toBe(422);
    const body = (await second.json()) as { error: { code: string } };
    expect(body.error.code).toBe('LABORATORY_REPORT_INVALID');
  });
});
