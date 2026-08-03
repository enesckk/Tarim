import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app.js';

describe('scientific reference library HTTP integration', () => {
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

  it('POST library reference, link to wheat, reject duplicate link', async () => {
    const createRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/scientific-references`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'HTTP FAO shell',
          authors: ['FAO'],
          referenceType: 'FAO',
          organization: 'FAO',
        }),
      },
    );
    expect(createRes.status).toBe(201);
    const ref = (await createRes.json()) as { id: string; reliabilityScore: number | null };
    expect(ref.reliabilityScore).toBeNull();

    const listRes = await fetch(`http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge`);
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; cropCode: string }>;
    };
    const wheat = listBody.items.find((i) => i.cropCode === 'wheat')!;

    const linkRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/references/link`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificReferenceId: ref.id }),
      },
    );
    expect(linkRes.status).toBe(201);

    const aggRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/references`,
    );
    expect(aggRes.status).toBe(200);
    const agg = (await aggRes.json()) as { references: Array<{ id: string }> };
    expect(agg.references).toHaveLength(1);
    expect(agg.references[0]!.id).toBe(ref.id);

    const dupRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/crop-knowledge/${wheat.id}/references/link`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificReferenceId: ref.id }),
      },
    );
    expect(dupRes.status).toBe(422);
    const dupBody = (await dupRes.json()) as { error: { code: string } };
    expect(dupBody.error.code).toBe('REFERENCE_LINK_DUPLICATE');
  });

  it('PUT then DELETE scientific reference', async () => {
    const createRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/scientific-references`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Mutable journal',
          authors: ['Author'],
          referenceType: 'JOURNAL',
        }),
      },
    );
    const created = (await createRes.json()) as { id: string; version: number };

    const putRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/scientific-references/${created.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'HTTP update', publicationYear: 2019 }),
      },
    );
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as {
      id: string;
      notes: string;
      version: number;
      publicationYear: number;
    };
    expect(putBody.notes).toBe('HTTP update');
    expect(putBody.publicationYear).toBe(2019);
    expect(putBody.version).toBe(created.version + 1);

    const delRes = await fetch(
      `http://127.0.0.1:${port}/api/physical-suitability/scientific-references/${putBody.id}`,
      { method: 'DELETE' },
    );
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { isActive: boolean };
    expect(delBody.isActive).toBe(false);
  });
});
