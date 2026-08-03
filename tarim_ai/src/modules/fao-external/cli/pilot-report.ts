#!/usr/bin/env npx tsx
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildPilotDraftMappings, buildPilotReport } from '../mapping/pilot-crops.js';
import { getSharedFaoExternalRepository } from '../repositories/fao-external.repository.js';
import { resolveLayersForCrop } from '../gaez/layer-resolver.js';
import type { GaezDataset } from '../types/models.js';

async function loadDatasets(): Promise<GaezDataset[]> {
  const repo = getSharedFaoExternalRepository();
  const fromRepo = await repo.listGaezDatasets({ version: 'v4' });
  if (fromRepo.length) return fromRepo;
  try {
    const raw = await readFile(join(process.cwd(), 'storage', 'gaez', 'catalog-v4.json'), 'utf8');
    const parsed = JSON.parse(raw) as { datasets?: GaezDataset[] };
    if (parsed.datasets?.length) {
      await repo.replaceGaezDatasets(parsed.datasets);
      return parsed.datasets;
    }
  } catch {
    /* empty */
  }
  return [];
}

async function main() {
  const mappings = buildPilotDraftMappings();
  const repo = getSharedFaoExternalRepository();
  await repo.upsertMappings(mappings);
  const datasets = await loadDatasets();

  let report = buildPilotReport(mappings);
  const catalogHasYieldVars = datasets.some((d) =>
    (d.variable ?? '').toLowerCase().includes('yield'),
  );
  if (datasets.length) {
    report = report.map((row) => {
      if (!row.gaezCropCode) return row;
      const resolved = resolveLayersForCrop(row.gaezCropCode, datasets, { inputLevel: 'High' });
      return {
        ...row,
        gaezDatasetAvailable: datasets.some((d) => d.cropCode === row.gaezCropCode),
        rainfedLayerAvailable: resolved.rainfedAvailable || row.rainfedLayerAvailable,
        irrigatedLayerAvailable: resolved.irrigatedAvailable || row.irrigatedLayerAvailable,
        yieldLayerAvailable: catalogHasYieldVars
          ? resolved.yieldAvailable
          : row.yieldLayerAvailable,
        notes: [
          ...row.notes,
          catalogHasYieldVars
            ? 'layer_availability_from_synced_catalog'
            : 'yield_flags_from_official_catalog_audit_when_sync_subset_lacks_yield_vars',
        ],
      };
    });
  }

  const outDir = join(process.cwd(), 'storage', 'fao-external');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, 'pilot-crops-report.json');
  await writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        policy: {
          autoMappingsApproved: false,
          fabricatedGaezCodes: false,
          fabricatedEcocropIds: false,
          gaezAffectsLocalScore: false,
        },
        catalogDatasetCount: datasets.length,
        mappings,
        report,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`[fao:pilot:report] ${report.length} crops → ${outPath}`);
  for (const row of report) {
    console.log(
      `- ${row.pilotCode}: gaez=${row.gaezCropCode ?? 'NONE'} rainfed=${row.rainfedLayerAvailable} irrig=${row.irrigatedLayerAvailable} yield=${row.yieldLayerAvailable} ecocrop=${row.ecocropId ?? 'NONE'} map=${row.mappingReviewStatus}`,
    );
  }
}

main().catch((err) => {
  console.error('[fao:pilot:report] failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
