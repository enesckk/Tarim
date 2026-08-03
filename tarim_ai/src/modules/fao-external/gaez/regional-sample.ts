import type {
  GaezCropMapping,
  GaezRegionalSample,
  GaezSampleMethod,
  GaezVersion,
} from '../types/models.js';
import {
  buildCacheKey,
  buildRegionalSample,
  geometryHash,
  publicGaezError,
} from './core.js';
import { sampleGaezPoint, type GaezHttpGet } from './catalog-client.js';
import { suitabilityIndexToClass } from './layer-resolver.js';
import { assertMappingApprovedForSampling } from '../mapping/validation.js';

export type GaezSampleCache = {
  get(key: string): Promise<GaezRegionalSample | null>;
  set(key: string, sample: GaezRegionalSample): Promise<void>;
};

export type RegionalSampleRequest = {
  geometry: { type: string; coordinates: unknown };
  centroid: { lon: number; lat: number };
  mapping: GaezCropMapping;
  gaezVersion: GaezVersion;
  waterSupply: string;
  inputLevel: string;
  climateScenario: string;
  datasetId: string;
  layerName: string;
  attainableYieldLayerName?: string | null;
  potentialYieldLayerName?: string | null;
  unit?: string | null;
  areaSquareMeters?: number | null;
  sampleMethod?: GaezSampleMethod;
  polygonSamplePoints?: Array<{ lon: number; lat: number }>;
  /** When true, mapping.reviewStatus must be approved */
  requireApprovedMapping?: boolean;
};

async function samplePointsMean(
  layerName: string,
  points: Array<{ lon: number; lat: number }>,
  get?: GaezHttpGet,
): Promise<{ values: number[]; unavailable: boolean }> {
  const values: number[] = [];
  for (const point of points) {
    const result = await sampleGaezPoint({
      layerName,
      lon: point.lon,
      lat: point.lat,
      get,
    });
    if (result.rawStatus === 'unavailable') return { values: [], unavailable: true };
    if (result.value != null) values.push(result.value);
  }
  return { values, unavailable: false };
}

/**
 * Cache-first GAEZ regional sampler.
 * Live ImageServer is optional; analysis continues if unavailable.
 */
export async function getGaezRegionalSample(
  req: RegionalSampleRequest,
  deps: {
    cache: GaezSampleCache;
    get?: GaezHttpGet;
    now?: () => string;
  },
): Promise<GaezRegionalSample> {
  if (req.requireApprovedMapping) {
    try {
      assertMappingApprovedForSampling(req.mapping);
    } catch {
      return buildRegionalSample({
        gaezVersion: req.gaezVersion,
        datasetId: req.datasetId,
        cropCode: req.mapping.gaezCropCode ?? req.mapping.internalCropCode,
        scientificName: req.mapping.scientificName,
        waterSupply: req.waterSupply,
        inputLevel: req.inputLevel,
        climateScenario: req.climateScenario,
        geometryHash: geometryHash(req.geometry),
        sampleMethod: req.sampleMethod ?? 'centroid',
        values: [],
        suitabilityClass: null,
        attainableYield: null,
        potentialYield: null,
        unit: req.unit ?? null,
        sourceUrlOrId: null,
        cacheHit: false,
        status: 'unavailable',
        areaSquareMeters: req.areaSquareMeters,
        extraLimitations: ['gaez_mapping_not_approved'],
      });
    }
  }

  if (req.gaezVersion === 'v5') {
    return buildRegionalSample({
      gaezVersion: 'v5',
      datasetId: req.datasetId,
      cropCode: req.mapping.gaezCropCode ?? req.mapping.internalCropCode,
      scientificName: req.mapping.scientificName,
      waterSupply: req.waterSupply,
      inputLevel: req.inputLevel,
      climateScenario: req.climateScenario,
      geometryHash: geometryHash(req.geometry),
      sampleMethod: req.sampleMethod ?? 'centroid',
      values: [],
      suitabilityClass: null,
      attainableYield: null,
      potentialYield: null,
      unit: req.unit ?? null,
      sourceUrlOrId: 'gaez-v5-not-wired-to-imageserver',
      cacheHit: false,
      status: 'unavailable',
      areaSquareMeters: req.areaSquareMeters,
      extraLimitations: ['gaez_v5_requires_separate_gcs_stac_provider'],
    });
  }

  if (!req.mapping.gaezCropCode) {
    return buildRegionalSample({
      gaezVersion: 'v4',
      datasetId: req.datasetId,
      cropCode: req.mapping.internalCropCode,
      scientificName: req.mapping.scientificName,
      waterSupply: req.waterSupply,
      inputLevel: req.inputLevel,
      climateScenario: req.climateScenario,
      geometryHash: geometryHash(req.geometry),
      sampleMethod: req.sampleMethod ?? 'centroid',
      values: [],
      suitabilityClass: null,
      attainableYield: null,
      potentialYield: null,
      unit: req.unit ?? null,
      sourceUrlOrId: null,
      cacheHit: false,
      status: 'unavailable',
      areaSquareMeters: req.areaSquareMeters,
      extraLimitations: ['gaez_crop_mapping_missing_or_unapproved_code'],
    });
  }

  const gHash = geometryHash(req.geometry);
  const cacheKey = buildCacheKey({
    gaezVersion: req.gaezVersion,
    datasetId: req.datasetId,
    cropCode: req.mapping.gaezCropCode,
    geometryHash: gHash,
    waterSupply: req.waterSupply,
    inputLevel: req.inputLevel,
    climateScenario: req.climateScenario,
  });

  const cached = await deps.cache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      cacheHit: true,
      status: cached.status === 'unavailable' ? 'unavailable' : 'ok',
    };
  }

  const method: GaezSampleMethod = req.sampleMethod ?? 'centroid';
  const points =
    method === 'polygon' && req.polygonSamplePoints?.length
      ? req.polygonSamplePoints
      : [{ lon: req.centroid.lon, lat: req.centroid.lat }];

  const suitability = await samplePointsMean(req.layerName, points, deps.get);
  if (suitability.unavailable) {
    return buildRegionalSample({
      gaezVersion: 'v4',
      datasetId: req.datasetId,
      cropCode: req.mapping.gaezCropCode,
      scientificName: req.mapping.scientificName,
      waterSupply: req.waterSupply,
      inputLevel: req.inputLevel,
      climateScenario: req.climateScenario,
      geometryHash: gHash,
      sampleMethod: method,
      values: [],
      suitabilityClass: null,
      attainableYield: null,
      potentialYield: null,
      unit: req.unit ?? null,
      sourceUrlOrId: publicGaezError(new Error('upstream')).code,
      cacheHit: false,
      status: 'unavailable',
      areaSquareMeters: req.areaSquareMeters,
      extraLimitations: ['gaez_provider_unavailable_no_cache'],
    });
  }

  let attainableYield: number | null = null;
  let potentialYield: number | null = null;
  if (req.attainableYieldLayerName) {
    const y = await samplePointsMean(req.attainableYieldLayerName, points, deps.get);
    if (!y.unavailable && y.values.length) {
      attainableYield = y.values.reduce((a, b) => a + b, 0) / y.values.length;
    }
  }
  if (req.potentialYieldLayerName) {
    const y = await samplePointsMean(req.potentialYieldLayerName, points, deps.get);
    if (!y.unavailable && y.values.length) {
      potentialYield = y.values.reduce((a, b) => a + b, 0) / y.values.length;
    }
  }

  const mean =
    suitability.values.length > 0
      ? suitability.values.reduce((a, b) => a + b, 0) / suitability.values.length
      : null;

  const sample = buildRegionalSample({
    gaezVersion: 'v4',
    datasetId: req.datasetId,
    cropCode: req.mapping.gaezCropCode,
    scientificName: req.mapping.scientificName,
    waterSupply: req.waterSupply,
    inputLevel: req.inputLevel,
    climateScenario: req.climateScenario,
    geometryHash: gHash,
    sampleMethod: method,
    values: suitability.values,
    suitabilityClass: suitabilityIndexToClass(mean),
    attainableYield,
    potentialYield,
    unit: req.unit ?? 'Class',
    sourceUrlOrId: `imageserver:res05:${req.layerName}`,
    cacheHit: false,
    status: 'ok',
    areaSquareMeters: req.areaSquareMeters,
  });

  await deps.cache.set(cacheKey, sample);
  return sample;
}

export class InMemoryGaezSampleCache implements GaezSampleCache {
  private readonly store = new Map<string, GaezRegionalSample>();

  async get(key: string): Promise<GaezRegionalSample | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, sample: GaezRegionalSample): Promise<void> {
    this.store.set(key, sample);
  }
}

/** Adapter: repository sample cache → GaezSampleCache */
export function repositorySampleCache(repo: {
  getSampleCache(key: string): Promise<GaezRegionalSample | null>;
  setSampleCache(key: string, sample: GaezRegionalSample): Promise<void>;
}): GaezSampleCache {
  return {
    get: (key) => repo.getSampleCache(key),
    set: (key, sample) => repo.setSampleCache(key, sample),
  };
}
