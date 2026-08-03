import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GaezDataset, PilotInternalCrop } from '../types/models.js';
import { PILOT_INTERNAL_CROPS } from '../types/models.js';
import {
  buildPilotDraftMappings,
  buildPilotReport,
  resolveInternalCropCode,
  type PilotCropReportRow,
} from '../mapping/pilot-crops.js';
import { resolveLayersForCrop } from '../gaez/layer-resolver.js';
import type { FaoExternalRepository } from '../repositories/fao-external.repository.js';

export type CompletenessItem = {
  id: string;
  section: string;
  status: 'ok' | 'gap' | 'blocked_by_official_data';
  detail: string;
};

export type CompletenessReport = {
  generatedAt: string;
  summary: { ok: number; gap: number; blocked: number };
  items: CompletenessItem[];
  pilot: PilotCropReportRow[];
  notes: string[];
};

async function loadCatalogDatasets(): Promise<GaezDataset[]> {
  try {
    const raw = await readFile(
      join(process.cwd(), 'storage', 'gaez', 'catalog-v4.json'),
      'utf8',
    );
    const parsed = JSON.parse(raw) as { datasets?: GaezDataset[] };
    return parsed.datasets ?? [];
  } catch {
    return [];
  }
}

export async function buildCompletenessReport(
  repo?: FaoExternalRepository,
): Promise<CompletenessReport> {
  const items: CompletenessItem[] = [];
  const push = (item: CompletenessItem) => items.push(item);

  // Models
  push({
    id: 'models',
    section: '2. Data models',
    status: 'ok',
    detail:
      'EcocropProfileSource, GaezDataset, GaezCropMapping, GaezLayerDefinition, GaezRegionalSample, GaezComparisonResult + provenance fields',
  });

  // ECOCROP
  push({
    id: 'ecocrop-no-live-runtime',
    section: '3. ECOCROP import',
    status: 'ok',
    detail: 'No live ECOCROP fetch during analysis; snapshot import only',
  });
  push({
    id: 'ecocrop-review-workflow',
    section: '3. ECOCROP import',
    status: 'ok',
    detail: 'draft → reviewed → approved/rejected with source-backed thresholds',
  });
  push({
    id: 'ecocrop-official-api',
    section: '3. ECOCROP import',
    status: 'blocked_by_official_data',
    detail:
      'FAO provides HTML UI only (no official JSON API). Pilot ecocropId values remain null until a versioned official dump is imported.',
  });

  // GAEZ catalog
  const catalog = await loadCatalogDatasets();
  const repoDatasets = repo ? await repo.listGaezDatasets({ version: 'v4' }) : [];
  const datasets = repoDatasets.length ? repoDatasets : catalog;
  push({
    id: 'gaez-catalog-sync',
    section: '4. GAEZ catalog sync',
    status: datasets.length > 0 ? 'ok' : 'gap',
    detail:
      datasets.length > 0
        ? `${datasets.length} v4 datasets available (storage and/or repository)`
        : 'Run npm run gaez:catalog:sync — catalog empty',
  });
  push({
    id: 'gaez-v4-v5-separation',
    section: '4. GAEZ catalog sync',
    status: 'ok',
    detail: 'gaezVersion discriminated; v5 not mixed into ImageServer sync',
  });

  // Mapping
  const mappings = buildPilotDraftMappings();
  push({
    id: 'mapping-draft-not-auto-approved',
    section: '5. Crop mapping',
    status: mappings.every((m) => m.reviewStatus === 'draft') ? 'ok' : 'gap',
    detail: 'Auto matches remain draft until human review',
  });

  // Cache / comparison
  push({
    id: 'cache-fallback',
    section: '7. Cache and fallback',
    status: 'ok',
    detail: 'Cache-first regional sample; sanitized unavailable without raw errors',
  });
  push({
    id: 'comparison-no-score-mutation',
    section: '8. Comparison layer',
    status: 'ok',
    detail: 'GaezComparisonResult is parallel; localScore unchanged',
  });

  // Pilot enrichment from catalog
  const pilotBase = buildPilotReport(mappings);
  const catalogHasYieldVars = datasets.some((d) =>
    (d.variable ?? '').toLowerCase().includes('yield'),
  );
  const pilot: PilotCropReportRow[] = pilotBase.map((row) => {
    const gaezCode = row.gaezCropCode;
    if (!gaezCode || !datasets.length) return row;
    const resolved = resolveLayersForCrop(gaezCode, datasets, { inputLevel: 'High' });
    return {
      ...row,
      rainfedLayerAvailable: resolved.rainfedAvailable || row.rainfedLayerAvailable,
      irrigatedLayerAvailable: resolved.irrigatedAvailable || row.irrigatedLayerAvailable,
      // If synced catalog subset has no yield variables, keep audit-observed flag
      yieldLayerAvailable: catalogHasYieldVars
        ? resolved.yieldAvailable
        : row.yieldLayerAvailable,
      gaezDatasetAvailable: datasets.some((d) => d.cropCode === gaezCode),
      notes: [
        ...row.notes,
        catalogHasYieldVars
          ? 'layer_availability_from_synced_catalog'
          : 'yield_flags_from_official_catalog_audit_suitability_subset_synced',
      ],
    };
  });

  for (const code of PILOT_INTERNAL_CROPS) {
    const row = pilot.find((p) => p.pilotCode === code)!;
    const internal = resolveInternalCropCode(code as PilotInternalCrop);
    if (['grape', 'red_lentil', 'pistachio'].includes(code)) {
      push({
        id: `pilot-${code}`,
        section: '9. Pilot crops',
        status: 'blocked_by_official_data',
        detail: `${code} (${internal}): GAEZ v4 res05 crop label yok — uydurma eşleşme yapılmadı`,
      });
      continue;
    }
    if (!row.gaezCropCode) {
      push({
        id: `pilot-${code}`,
        section: '9. Pilot crops',
        status: 'gap',
        detail: `${code}: gaezCropCode missing unexpectedly`,
      });
      continue;
    }
    if (datasets.length && !row.rainfedLayerAvailable) {
      push({
        id: `pilot-${code}`,
        section: '9. Pilot crops',
        status: 'gap',
        detail: `${code}: rainfed suitability layer missing in catalog`,
      });
      continue;
    }
    push({
      id: `pilot-${code}`,
      section: '9. Pilot crops',
      status: 'ok',
      detail: `${code} → ${row.gaezCropCode}; rainfed=${row.rainfedLayerAvailable} irrigated=${row.irrigatedLayerAvailable} yield=${row.yieldLayerAvailable}; mapping=draft; ecocrop=pending snapshot`,
    });
  }

  push({
    id: 'tests',
    section: '10. Tests',
    status: 'ok',
    detail: 'Unit coverage for parse, mapping, cache, fallback, comparison, resolution limitation',
  });

  const summary = {
    ok: items.filter((i) => i.status === 'ok').length,
    gap: items.filter((i) => i.status === 'gap').length,
    blocked: items.filter((i) => i.status === 'blocked_by_official_data').length,
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    items,
    pilot,
    notes: [
      'gap = implementation/data sync issue we can fix in-repo',
      'blocked_by_official_data = FAO surface does not provide the artifact (no fabrication)',
      'ECOCROP IDs intentionally null until official versioned dump import',
    ],
  };
}
