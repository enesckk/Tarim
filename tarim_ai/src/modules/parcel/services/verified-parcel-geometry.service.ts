import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as turf from '@turf/turf';
import { ApiError } from '../../../utils/api-error.js';
import {
  getBbox,
  getPolygonAreaSqMeters,
  normalizeGeoJsonGeometry,
} from '../../../utils/geometry.utils.js';
import type { GeoJsonFeature, GeoJsonInput, NormalizedGeometry } from '../../../types/geojson.types.js';
import type { ParcelQuery, ResolvedParcel } from '../types/parcel.types.js';
import { buildParcelCacheKey, ParcelNormalizationService } from './parcel-normalization.service.js';

export interface VerifiedParcelManifest {
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  source: string;
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  geometryFile: string;
  checksum: string;
}

export interface VerifiedParcelDocument {
  manifest: VerifiedParcelManifest;
  geometry: NormalizedGeometry;
  areaSquareMeters: number;
  centroid: {
    latitude: number;
    longitude: number;
  };
  bbox: [number, number, number, number];
}

const VERIFIED_DIR = path.resolve(process.cwd(), 'fixtures/parcels/verified');

export function getVerifiedParcelDir(): string {
  return VERIFIED_DIR;
}

export function buildVerifiedParcelSlug(query: ParcelQuery): string {
  return [
    query.neighborhood,
    query.block,
    query.parcel,
  ]
    .join('-')
    .replace(/\s+/g, '-')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u');
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function extractSingleFeature(input: GeoJsonInput): GeoJsonFeature {
  if ((input as { type?: string }).type === 'Feature') {
    return input as GeoJsonFeature;
  }
  if ((input as { type?: string }).type === 'FeatureCollection') {
    const features = (input as { features?: GeoJsonFeature[] }).features ?? [];
    if (features.length !== 1) {
      throw new ApiError(422, 'Verified parcel GeoJSON must contain exactly one Feature.', {
        code: 'VERIFIED_PARCEL_GEOJSON_INVALID',
      });
    }
    return features[0]!;
  }
  return {
    type: 'Feature',
    geometry: input as NormalizedGeometry,
    properties: null,
  };
}

export function validateParcelIdentity(
  query: ParcelQuery,
  manifest: VerifiedParcelManifest,
  normalization = new ParcelNormalizationService(),
): void {
  const checks: Array<[string, string]> = [
    [manifest.province, query.province],
    [manifest.district, query.district],
    [manifest.neighborhood, query.neighborhood],
    [manifest.block, query.block],
    [manifest.parcel, query.parcel],
  ];
  if (!checks.every(([left, right]) => normalization.matchesName(String(left), String(right)))) {
    throw new ApiError(422, 'Verified parcel manifest identity does not match requested parcel.', {
      code: 'VERIFIED_PARCEL_IDENTITY_MISMATCH',
    });
  }
}

export async function loadVerifiedParcelDocument(
  query: ParcelQuery,
  files?: { manifestPath?: string },
): Promise<VerifiedParcelDocument> {
  const slug = buildVerifiedParcelSlug(query);
  const manifestPath = files?.manifestPath ?? path.join(VERIFIED_DIR, `${slug}.manifest.json`);

  let manifest: VerifiedParcelManifest;
  try {
    manifest = await readJsonFile<VerifiedParcelManifest>(manifestPath);
  } catch {
    throw new ApiError(404, 'Verified parcel fixture not found.', {
      code: 'VERIFIED_PARCEL_MISSING',
    });
  }

  if (!manifest.verified) {
    throw new ApiError(422, 'Verified parcel fixture is not marked as verified.', {
      code: 'VERIFIED_PARCEL_NOT_VERIFIED',
    });
  }

  validateParcelIdentity(query, manifest);

  const geometryPath = path.join(path.dirname(manifestPath), manifest.geometryFile);
  let rawGeometry: string;
  try {
    rawGeometry = await fs.readFile(geometryPath, 'utf8');
  } catch {
    throw new ApiError(404, 'Verified parcel geometry file is missing.', {
      code: 'VERIFIED_PARCEL_GEOMETRY_MISSING',
    });
  }

  const checksum = sha256Hex(rawGeometry);
  if (checksum !== manifest.checksum) {
    throw new ApiError(422, 'Verified parcel geometry checksum mismatch.', {
      code: 'VERIFIED_PARCEL_CHECKSUM_MISMATCH',
    });
  }

  let parsed: GeoJsonInput;
  try {
    parsed = JSON.parse(rawGeometry) as GeoJsonInput;
  } catch {
    throw new ApiError(422, 'Verified parcel geometry file is not valid JSON.', {
      code: 'VERIFIED_PARCEL_JSON_INVALID',
    });
  }

  const feature = extractSingleFeature(parsed);
  const crsName =
    (feature.properties?.koordinat_sistemi as string | undefined) ??
    ((parsed as { crs?: { properties?: { name?: string } } }).crs?.properties?.name ?? 'EPSG:4326');
  if (!/4326|WGS84|CRS84/i.test(crsName)) {
    throw new ApiError(422, 'Verified parcel geometry must be WGS84 / EPSG:4326.', {
      code: 'VERIFIED_PARCEL_CRS_UNSUPPORTED',
    });
  }

  const geometry = normalizeGeoJsonGeometry(feature);
  const areaSquareMeters = getPolygonAreaSqMeters(geometry);
  if (!(areaSquareMeters > 0)) {
    throw new ApiError(422, 'Verified parcel geometry area must be positive.', {
      code: 'VERIFIED_PARCEL_AREA_INVALID',
    });
  }

  const center = turf.centroid(geometry);
  const [longitude, latitude] = center.geometry.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(422, 'Verified parcel centroid is invalid.', {
      code: 'VERIFIED_PARCEL_CENTROID_INVALID',
    });
  }

  return {
    manifest,
    geometry,
    areaSquareMeters,
    centroid: { latitude, longitude },
    bbox: getBbox(geometry),
  };
}

export function toResolvedVerifiedParcel(
  query: ParcelQuery,
  document: VerifiedParcelDocument,
  fallback?: { used: boolean; reason: string | null },
): ResolvedParcel {
  return {
    title: `${document.manifest.province} / ${document.manifest.district} / ${document.manifest.neighborhood} / ${document.manifest.block} / ${document.manifest.parcel}`,
    province: document.manifest.province,
    district: document.manifest.district,
    neighborhood: document.manifest.neighborhood,
    block: document.manifest.block,
    parcel: document.manifest.parcel,
    landType: 'Tarla',
    areaSquareMeters: document.areaSquareMeters,
    sheet: null,
    geometry: document.geometry,
    bbox: document.bbox,
    centroid: document.centroid,
    provider: 'verified_geojson',
    sourceType: 'manually_verified_real_geometry',
    verified: true,
    fallbackUsed: fallback?.used ?? false,
    fallbackReason: fallback?.reason ?? null,
    sourceMetadata: {
      source: document.manifest.source,
      verifiedAt: document.manifest.verifiedAt,
      verifiedBy: document.manifest.verifiedBy,
      geometryChecksum: document.manifest.checksum,
      parcelKey: buildParcelCacheKey(query),
    },
  };
}
