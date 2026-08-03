import { createHash } from 'node:crypto';
import type {
  GaezAgreement,
  GaezCacheKeyParts,
  GaezComparisonResult,
  GaezCropMapping,
  GaezDataset,
  GaezLayerDefinition,
  GaezRegionalSample,
  GaezSampleMethod,
  GaezVersion,
  ReviewStatus,
} from '../types/models.js';
import { REGIONAL_RESOLUTION_LIMITATION } from '../types/models.js';

export { REGIONAL_RESOLUTION_LIMITATION };

export const GAEZ_V4_SERVICES_ROOT =
  'https://gaez-services.fao.org/server/rest/services';
export const GAEZ_V4_SEARCH_ROOT = 'https://gaez.fao.org/api/search/v1';
export const GAEZ_V4_DEFAULT_IMAGE_SERVER = `${GAEZ_V4_SERVICES_ROOT}/res05/ImageServer`;
/** ~5 arc-minutes in degrees */
export const GAEZ_V4_RESOLUTION_DEG = 0.08333333333333333;
export const GAEZ_V4_RESOLUTION_LABEL = '0.083333° (~5 arc-min, regional)';

export type GaezCatalogRow = {
  name: string;
  crop: string | null;
  water_supply: string | null;
  input_level: string | null;
  variable: string | null;
  units: string | null;
  year: string | number | null;
  model: string | null;
  rcp: string | null;
  filepath: string | null;
  download_url: string | null;
  file_id: string | number | null;
  file_description: string | null;
};

export function buildClimateScenario(row: GaezCatalogRow): string | null {
  const parts = [row.model, row.rcp, row.year != null ? String(row.year) : null].filter(Boolean);
  return parts.length ? parts.join('|') : 'historical_baseline';
}

export function catalogRowToDataset(
  row: GaezCatalogRow,
  gaezVersion: GaezVersion,
  serviceUrl: string,
  syncedAt: string,
): GaezDataset {
  const datasetId = String(row.file_id ?? row.name);
  return {
    provider: 'gaez',
    version: gaezVersion,
    datasetId,
    cropCode: row.crop,
    scientificName: null,
    waterSupply: row.water_supply,
    inputLevel: row.input_level,
    climateScenario: buildClimateScenario(row),
    resolution: GAEZ_V4_RESOLUTION_LABEL,
    unit: row.units,
    retrievedAt: syncedAt,
    sourceUrlOrId: row.download_url ?? `${serviceUrl}?name=${encodeURIComponent(row.name)}`,
    limitations: [
      'gaez_regional_grid_not_parcel_scale',
      gaezVersion === 'v4' ? 'gaez_v4_imageserver_catalog' : 'gaez_v5_separate_access_model',
    ],
    name: row.name,
    variable: row.variable,
    serviceUrl,
    filepath: row.filepath,
    downloadUrl: row.download_url,
    active: true,
    syncedAt,
  };
}

export function datasetToLayer(dataset: GaezDataset): GaezLayerDefinition {
  return {
    id: `${dataset.version}:${dataset.datasetId}`,
    gaezVersion: dataset.version as GaezVersion,
    datasetId: dataset.datasetId,
    layerName: dataset.name,
    variable: dataset.variable,
    cropCode: dataset.cropCode,
    waterSupply: dataset.waterSupply,
    inputLevel: dataset.inputLevel,
    climateScenario: dataset.climateScenario,
    unit: dataset.unit,
    resolution: dataset.resolution ?? GAEZ_V4_RESOLUTION_LABEL,
    serviceUrl: dataset.serviceUrl,
    active: dataset.active,
    syncedAt: dataset.syncedAt,
  };
}

export function geometryHash(geometry: unknown): string {
  return createHash('sha256').update(JSON.stringify(geometry)).digest('hex');
}

export function buildCacheKey(parts: GaezCacheKeyParts): string {
  return [
    parts.gaezVersion,
    parts.datasetId,
    parts.cropCode,
    parts.geometryHash,
    parts.waterSupply,
    parts.inputLevel,
    parts.climateScenario,
  ].join('::');
}

export function parcelSmallerThanRasterCell(opts: {
  areaSquareMeters: number | null | undefined;
  resolutionDeg?: number;
}): boolean {
  const res = opts.resolutionDeg ?? GAEZ_V4_RESOLUTION_DEG;
  // Approximate cell area at mid-latitudes (~37°): degLon*111e3*cos(lat) * degLat*111e3
  const lat = 37;
  const cellM2 = res * 111_000 * Math.cos((lat * Math.PI) / 180) * (res * 111_000);
  if (opts.areaSquareMeters == null) return true; // unknown → warn
  return opts.areaSquareMeters < cellM2 * 0.25;
}

export type SampleStats = {
  values: number[];
  min: number | null;
  max: number | null;
  mean: number | null;
};

export function summarizeSamples(values: number[]): SampleStats {
  if (!values.length) return { values, min: null, max: null, mean: null };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { values, min, max, mean };
}

export function buildRegionalSample(input: {
  gaezVersion: GaezVersion;
  datasetId: string;
  cropCode: string;
  scientificName: string | null;
  waterSupply: string;
  inputLevel: string;
  climateScenario: string;
  geometryHash: string;
  sampleMethod: GaezSampleMethod;
  values: number[];
  suitabilityClass: string | null;
  attainableYield: number | null;
  potentialYield: number | null;
  unit: string | null;
  sourceUrlOrId: string | null;
  cacheHit: boolean;
  status: GaezRegionalSample['status'];
  areaSquareMeters?: number | null;
  extraLimitations?: string[];
}): GaezRegionalSample {
  const stats = summarizeSamples(input.values);
  const limitations = [
    'gaez_regional_validation_layer_only',
    'does_not_override_local_crop_compatibility_score',
    ...(input.extraLimitations ?? []),
  ];
  if (parcelSmallerThanRasterCell({ areaSquareMeters: input.areaSquareMeters })) {
    limitations.push(REGIONAL_RESOLUTION_LIMITATION);
  }

  return {
    provider: 'gaez',
    version: input.gaezVersion,
    datasetId: input.datasetId,
    cropCode: input.cropCode,
    scientificName: input.scientificName,
    waterSupply: input.waterSupply,
    inputLevel: input.inputLevel,
    climateScenario: input.climateScenario,
    resolution: GAEZ_V4_RESOLUTION_LABEL,
    unit: input.unit,
    retrievedAt: new Date().toISOString(),
    sourceUrlOrId: input.sourceUrlOrId,
    limitations,
    geometryHash: input.geometryHash,
    sampleMethod: input.sampleMethod,
    suitabilityIndex: stats.mean,
    suitabilityClass: input.suitabilityClass,
    attainableYield: input.attainableYield,
    potentialYield: input.potentialYield,
    dominantClass: input.suitabilityClass,
    min: stats.min,
    max: stats.max,
    mean: stats.mean,
    rasterResolution: GAEZ_V4_RESOLUTION_LABEL,
    cacheHit: input.cacheHit,
    status: input.status,
  };
}

/**
 * Compares local engine output with GAEZ regional sample.
 * Never mutates localScore — returns a parallel artifact only.
 */
export function compareLocalWithGaez(input: {
  localScore: number | null;
  localClass: string | null;
  sample: GaezRegionalSample | null;
}): GaezComparisonResult {
  const retrievedAt = new Date().toISOString();
  if (!input.sample || input.sample.status === 'unavailable') {
    return {
      provider: 'gaez',
      version: input.sample?.version ?? 'v4',
      datasetId: input.sample?.datasetId ?? null,
      cropCode: input.sample?.cropCode ?? null,
      scientificName: input.sample?.scientificName ?? null,
      waterSupply: input.sample?.waterSupply ?? null,
      inputLevel: input.sample?.inputLevel ?? null,
      climateScenario: input.sample?.climateScenario ?? null,
      resolution: input.sample?.resolution ?? null,
      unit: input.sample?.unit ?? null,
      retrievedAt,
      sourceUrlOrId: input.sample?.sourceUrlOrId ?? null,
      limitations: ['gaez_comparison_unavailable', 'local_score_unchanged'],
      localScore: input.localScore,
      localClass: input.localClass,
      gaezSuitability: null,
      agreement: 'unavailable',
      interpretation: 'GAEZ bölgesel örneği yok veya erişilemez; yerel skor değişmedi.',
      resolutionWarning: false,
      sourceVersion: (input.sample?.version as GaezVersion) ?? null,
    };
  }

  const gaez = input.sample.suitabilityIndex;
  const local = input.localScore;
  let agreement: GaezAgreement = 'unavailable';
  let interpretation = 'Karşılaştırma için yeterli sayısal değer yok.';

  if (local != null && gaez != null) {
    const localNorm = local <= 1 ? local * 100 : local;
    const gaezNorm = gaez <= 10 ? gaez * 10 : gaez; // class codes sometimes 1-9
    const delta = Math.abs(localNorm - Math.min(100, gaezNorm));
    if (delta <= 15) {
      agreement = 'consistent';
      interpretation = 'Yerel skor ile GAEZ bölgesel uygunluk aynı yönde.';
    } else if (delta <= 35) {
      agreement = 'partially_consistent';
      interpretation = 'Kısmi uyum; ölçek ve yöntem farkı beklenen.';
    } else {
      agreement = 'conflicting';
      interpretation = 'Çelişki sinyali; GAEZ bölgeseldir, yerel skoru değiştirmez.';
    }
  }

  const resolutionWarning = input.sample.limitations.includes(REGIONAL_RESOLUTION_LIMITATION);

  return {
    provider: 'gaez',
    version: input.sample.version,
    datasetId: input.sample.datasetId,
    cropCode: input.sample.cropCode,
    scientificName: input.sample.scientificName,
    waterSupply: input.sample.waterSupply,
    inputLevel: input.sample.inputLevel,
    climateScenario: input.sample.climateScenario,
    resolution: input.sample.resolution,
    unit: input.sample.unit,
    retrievedAt,
    sourceUrlOrId: input.sample.sourceUrlOrId,
    limitations: [
      'gaez_is_regional_validation_only',
      'local_score_unchanged',
      ...(resolutionWarning ? [REGIONAL_RESOLUTION_LIMITATION] : []),
    ],
    localScore: input.localScore,
    localClass: input.localClass,
    gaezSuitability: gaez,
    agreement,
    interpretation,
    resolutionWarning,
    sourceVersion: input.sample.version as GaezVersion,
  };
}

export function createDraftMapping(input: {
  internalCropCode: string;
  scientificName: string;
  ecocropId?: string | null;
  gaezCropCode?: string | null;
  gaezVersion?: GaezVersion | null;
  productionSystem?: string | null;
  notes?: string[];
}): GaezCropMapping {
  return {
    id: `map:${input.internalCropCode}`,
    internalCropCode: input.internalCropCode,
    scientificName: input.scientificName,
    ecocropId: input.ecocropId ?? null,
    gaezCropCode: input.gaezCropCode ?? null,
    gaezVersion: input.gaezVersion ?? null,
    productionSystem: input.productionSystem ?? null,
    confidence: null,
    reviewStatus: 'draft' as ReviewStatus,
    reviewedBy: null,
    reviewedAt: null,
    notes: input.notes ?? ['auto_match_not_approved'],
  };
}

/** Sanitize provider errors — never leak raw upstream payloads to clients. */
export function publicGaezError(err: unknown): { code: string; message: string } {
  void err;
  return {
    code: 'GAEZ_UNAVAILABLE',
    message: 'GAEZ regional service unavailable',
  };
}
