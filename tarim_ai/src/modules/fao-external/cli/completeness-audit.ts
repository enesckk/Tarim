#!/usr/bin/env npx tsx
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { buildCompletenessReport } from '../audit/completeness.js';
import { getSharedFaoExternalRepository } from '../repositories/fao-external.repository.js';
import { buildPilotDraftMappings } from '../mapping/pilot-crops.js';
import { syncGaezV4Catalog } from '../gaez/catalog-client.js';
import { readFile } from 'node:fs/promises';

async function ensureCatalogInRepo() {
  const repo = getSharedFaoExternalRepository();
  const existing = await repo.listGaezDatasets({ version: 'v4' });
  if (existing.length) return repo;

  try {
    const raw = await readFile(join(process.cwd(), 'storage', 'gaez', 'catalog-v4.json'), 'utf8');
    const parsed = JSON.parse(raw) as { datasets?: Parameters<typeof repo.replaceGaezDatasets>[0] };
    if (parsed.datasets?.length) {
      await repo.replaceGaezDatasets(parsed.datasets);
      return repo;
    }
  } catch {
    // fall through
  }

  // Lightweight sync of suitability layers only if nothing cached
  const { datasets } = await syncGaezV4Catalog({
    where: "variable LIKE 'Crop suitability index%' OR variable LIKE '%attainable yield%'",
    pageSize: 500,
    maxPages: 8,
  });
  if (datasets.length) await repo.replaceGaezDatasets(datasets);
  return repo;
}

async function main() {
  const repo = await ensureCatalogInRepo();
  await repo.upsertMappings(buildPilotDraftMappings());
  const report = await buildCompletenessReport(repo);

  const outDir = join(process.cwd(), 'storage', 'fao-external');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, 'completeness-audit.json');
  await writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`[fao:completeness] ok=${report.summary.ok} gap=${report.summary.gap} blocked=${report.summary.blocked}`);
  console.log(`[fao:completeness] wrote ${outPath}`);
  for (const item of report.items.filter((i) => i.status !== 'ok')) {
    console.log(`- [${item.status}] ${item.section}: ${item.detail}`);
  }
  if (report.summary.gap > 0) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('[fao:completeness] failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
