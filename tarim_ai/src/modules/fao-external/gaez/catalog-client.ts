import type { GaezDataset, GaezVersion } from '../types/models.js';
import {
  GAEZ_V4_DEFAULT_IMAGE_SERVER,
  catalogRowToDataset,
  type GaezCatalogRow,
  publicGaezError,
} from './core.js';

export type GaezHttpGet = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const defaultGet: GaezHttpGet = async (url) => {
  const res = await fetch(url);
  return {
    ok: res.ok,
    status: res.status,
    json: () => res.json() as Promise<unknown>,
  };
};

function asRow(attrs: Record<string, unknown>): GaezCatalogRow {
  return {
    name: String(attrs.name ?? attrs.Name ?? ''),
    crop: (attrs.crop as string) ?? null,
    water_supply: (attrs.water_supply as string) ?? null,
    input_level: (attrs.input_level as string) ?? null,
    variable: (attrs.variable as string) ?? null,
    units: (attrs.units as string) ?? null,
    year: (attrs.year as string | number) ?? null,
    model: (attrs.model as string) ?? null,
    rcp: (attrs.rcp as string) ?? null,
    filepath: (attrs.filepath as string) ?? null,
    download_url: (attrs.download_url as string) ?? null,
    file_id: (attrs.file_id as string | number) ?? null,
    file_description: (attrs.file_description as string) ?? null,
  };
}

/**
 * Syncs GAEZ v4 ImageServer catalog pages into dataset records.
 * GAEZ v5 uses a separate GCS/STAC model and is not mixed here.
 */
export async function syncGaezV4Catalog(options?: {
  serviceUrl?: string;
  where?: string;
  pageSize?: number;
  maxPages?: number;
  get?: GaezHttpGet;
  gaezVersion?: GaezVersion;
}): Promise<{ datasets: GaezDataset[]; pages: number; errors: string[] }> {
  const version = options?.gaezVersion ?? 'v4';
  if (version !== 'v4') {
    return {
      datasets: [],
      pages: 0,
      errors: ['gaez_v5_catalog_uses_separate_gcs_stac_access_not_imageserver'],
    };
  }

  const serviceUrl = options?.serviceUrl ?? GAEZ_V4_DEFAULT_IMAGE_SERVER;
  const pageSize = options?.pageSize ?? 500;
  const maxPages = options?.maxPages ?? 40;
  const where = options?.where ?? '1=1';
  const get = options?.get ?? defaultGet;
  const syncedAt = new Date().toISOString();
  const datasets: GaezDataset[] = [];
  const errors: string[] = [];
  let pages = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      where,
      outFields:
        'name,crop,water_supply,input_level,variable,units,year,model,rcp,filepath,download_url,file_id,file_description',
      returnGeometry: 'false',
      resultRecordCount: String(pageSize),
      resultOffset: String(page * pageSize),
      f: 'pjson',
    });
    const url = `${serviceUrl}/query?${params.toString()}`;
    let payload: unknown;
    try {
      const res = await get(url);
      if (!res.ok) {
        errors.push(publicGaezError(new Error(`HTTP ${res.status}`)).code);
        break;
      }
      payload = await res.json();
    } catch (err) {
      errors.push(publicGaezError(err).code);
      break;
    }

    const record = payload as {
      features?: Array<{ attributes?: Record<string, unknown> }>;
      exceededTransferLimit?: boolean;
    };
    const features = record.features ?? [];
    pages += 1;
    for (const feature of features) {
      const row = asRow(feature.attributes ?? {});
      if (!row.name) continue;
      datasets.push(catalogRowToDataset(row, 'v4', serviceUrl, syncedAt));
    }
    if (!features.length || features.length < pageSize || !record.exceededTransferLimit) {
      if (!record.exceededTransferLimit && features.length < pageSize) break;
      if (!record.exceededTransferLimit) break;
    }
  }

  return { datasets, pages, errors };
}

export async function sampleGaezPoint(options: {
  serviceUrl?: string;
  layerName: string;
  lon: number;
  lat: number;
  get?: GaezHttpGet;
}): Promise<{ value: number | null; rawStatus: 'ok' | 'unavailable' }> {
  const serviceUrl = options.serviceUrl ?? GAEZ_V4_DEFAULT_IMAGE_SERVER;
  const get = options.get ?? defaultGet;
  const mosaicRule = JSON.stringify({
    mosaicMethod: 'esriMosaicAttribute',
    where: `Name='${options.layerName.replace(/'/g, "''")}'`,
    ascending: true,
    mosaicOperation: 'MT_FIRST',
  });
  const params = new URLSearchParams({
    geometry: JSON.stringify({
      x: options.lon,
      y: options.lat,
      spatialReference: { wkid: 4326 },
    }),
    geometryType: 'esriGeometryPoint',
    returnFirstValueOnly: 'true',
    mosaicRule,
    f: 'pjson',
  });

  try {
    const res = await get(`${serviceUrl}/getSamples?${params.toString()}`);
    if (!res.ok) return { value: null, rawStatus: 'unavailable' };
    const json = (await res.json()) as {
      samples?: Array<{ value?: string | number }>;
      error?: unknown;
    };
    if (json.error) return { value: null, rawStatus: 'unavailable' };
    const raw = json.samples?.[0]?.value;
    if (raw == null || raw === 'NoData') return { value: null, rawStatus: 'ok' };
    const num = typeof raw === 'number' ? raw : Number(raw);
    return { value: Number.isFinite(num) ? num : null, rawStatus: 'ok' };
  } catch {
    return { value: null, rawStatus: 'unavailable' };
  }
}
