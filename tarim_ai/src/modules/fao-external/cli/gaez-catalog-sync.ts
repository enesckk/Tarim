#!/usr/bin/env npx tsx
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { syncGaezV4Catalog } from '../gaez/catalog-client.js';
import { datasetToLayer } from '../gaez/core.js';
import { getSharedFaoExternalRepository } from '../repositories/fao-external.repository.js';

async function main() {
  const outDir = join(process.cwd(), 'storage', 'gaez');
  await mkdir(outDir, { recursive: true });

  console.log('[gaez:catalog:sync] Fetching GAEZ v4 ImageServer catalog (res05)…');
  const { datasets, pages, errors } = await syncGaezV4Catalog({
    where:
      "variable LIKE 'Crop suitability index%' OR lower(variable) LIKE '%attainable yield%' OR lower(variable) LIKE '%potential%'",
    pageSize: 500,
    maxPages: 40,
  });

  const repo = getSharedFaoExternalRepository();
  await repo.replaceGaezDatasets(datasets);

  const layers = datasets.map(datasetToLayer);
  const payload = {
    syncedAt: new Date().toISOString(),
    gaezVersion: 'v4',
    serviceUrl: 'https://gaez-services.fao.org/server/rest/services/res05/ImageServer',
    pages,
    errors,
    datasetCount: datasets.length,
    datasets,
    layers,
    persistence: {
      repository: 'in-memory+json',
      note: 'PostgreSQL schema in migration 014_fao_ecocrop_gaez.sql; JSON mirror written for offline use',
    },
    note: 'GAEZ v5 is intentionally excluded from this ImageServer sync.',
  };

  const outPath = join(outDir, 'catalog-v4.json');
  await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[gaez:catalog:sync] Wrote ${datasets.length} datasets → ${outPath}`);
  if (errors.length) {
    console.warn('[gaez:catalog:sync] sanitized errors:', errors);
  }
}

main().catch((err) => {
  console.error('[gaez:catalog:sync] failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
