import * as turf from '@turf/turf';
import type {
  GeoJsonInput,
  MultiPolygonGeometry,
  NormalizedGeometry,
  PolygonGeometry,
  Position,
} from '../types/geojson.types.js';
import type { ImageDimensions } from '../types/satellite.types.js';
import { ApiError } from './api-error.js';

const MAX_DIMENSION = 1024;
const MIN_DIMENSION = 256;
/** Sentinel-2 visual resolution ~10m; avoid upsampling beyond this. */
const SENTINEL2_RESOLUTION_METERS = 10;

/**
 * Extracts and validates a Polygon or MultiPolygon from Geometry, Feature,
 * or single-feature FeatureCollection input.
 */
export function normalizeGeoJsonGeometry(input: GeoJsonInput): NormalizedGeometry {
  if (input == null || typeof input !== 'object') {
    throw new ApiError(400, 'Geometry input is required');
  }

  const rawGeometry = extractGeometry(input);
  const geometry = assertPolygonOrMultiPolygon(rawGeometry);
  validateRingsAndCoordinates(geometry);
  validateWithTurf(geometry);

  return geometry;
}

function extractGeometry(input: GeoJsonInput): unknown {
  if (input.type === 'Feature') {
    if (input.geometry == null) {
      throw new ApiError(400, 'Feature geometry must not be null');
    }
    return input.geometry;
  }

  if (input.type === 'FeatureCollection') {
    if (!Array.isArray(input.features)) {
      throw new ApiError(400, 'FeatureCollection.features must be an array');
    }
    if (input.features.length !== 1) {
      throw new ApiError(
        400,
        `FeatureCollection must contain exactly 1 Feature, received ${input.features.length}`,
      );
    }
    const feature = input.features[0];
    if (!feature || feature.type !== 'Feature') {
      throw new ApiError(400, 'FeatureCollection must contain a valid Feature');
    }
    if (feature.geometry == null) {
      throw new ApiError(400, 'Feature geometry must not be null');
    }
    return feature.geometry;
  }

  return input;
}

function assertPolygonOrMultiPolygon(value: unknown): NormalizedGeometry {
  if (value == null || typeof value !== 'object') {
    throw new ApiError(400, 'Geometry is empty or invalid');
  }

  const geometry = value as { type?: unknown; coordinates?: unknown };

  if (geometry.type === 'Polygon') {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
      throw new ApiError(400, 'Polygon coordinates are required');
    }
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates as Position[][],
    };
  }

  if (geometry.type === 'MultiPolygon') {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
      throw new ApiError(400, 'MultiPolygon coordinates are required');
    }
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates as Position[][][],
    };
  }

  throw new ApiError(
    400,
    `Unsupported geometry type: ${String(geometry.type)}. Only Polygon and MultiPolygon are allowed`,
  );
}

function validateRingsAndCoordinates(geometry: NormalizedGeometry): void {
  const polygons: Position[][][] =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

  for (let p = 0; p < polygons.length; p++) {
    const rings = polygons[p];
    if (!rings || rings.length === 0) {
      throw new ApiError(400, `Polygon ${p} must have at least one ring`);
    }

    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      if (!ring || ring.length < 4) {
        throw new ApiError(400, `Ring ${r} must contain at least 4 coordinates`);
      }

      const first = ring[0];
      const last = ring[ring.length - 1];
      if (
        first == null ||
        last == null ||
        first.length < 2 ||
        last.length < 2 ||
        first[0] !== last[0] ||
        first[1] !== last[1]
      ) {
        throw new ApiError(
          400,
          `Ring ${r} must be closed (first and last coordinates must be equal)`,
        );
      }

      for (let c = 0; c < ring.length; c++) {
        const position = ring[c];
        if (!position || position.length < 2) {
          throw new ApiError(400, 'Coordinates must be [longitude, latitude]');
        }

        const lon = position[0];
        const lat = position[1];

        if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon) || !Number.isFinite(lat)) {
          throw new ApiError(400, 'Coordinates must be finite numbers [longitude, latitude]');
        }

        if (lon < -180 || lon > 180) {
          throw new ApiError(400, `Longitude ${lon} is out of range [-180, 180]`);
        }
        if (lat < -90 || lat > 90) {
          throw new ApiError(400, `Latitude ${lat} is out of range [-90, 90]`);
        }
      }
    }
  }
}

function validateWithTurf(geometry: NormalizedGeometry): void {
  try {
    if (geometry.type === 'Polygon') {
      const feature = turf.polygon(geometry.coordinates as number[][][]);
      assertTurfValid(feature);
    } else {
      const feature = turf.multiPolygon(geometry.coordinates as number[][][][]);
      if (!turf.booleanValid(feature)) {
        throw new ApiError(400, 'Geometry failed Turf validation (booleanValid)');
      }

      for (const polygonCoords of geometry.coordinates) {
        const polygonFeature = turf.polygon(polygonCoords as number[][][]);
        assertTurfValid(polygonFeature);
      }

      const [minX, minY, maxX, maxY] = turf.bbox(feature);
      assertNonEmptyBbox(minX, minY, maxX, maxY);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(400, 'Invalid or empty geometry');
  }
}

function assertTurfValid(feature: ReturnType<typeof turf.polygon>): void {
  if (!turf.booleanValid(feature)) {
    throw new ApiError(400, 'Geometry failed Turf validation (booleanValid)');
  }

  if (turf.kinks(feature).features.length > 0) {
    throw new ApiError(400, 'Geometry is self-intersecting');
  }

  const [minX, minY, maxX, maxY] = turf.bbox(feature);
  assertNonEmptyBbox(minX, minY, maxX, maxY);
}

function assertNonEmptyBbox(minX: number, minY: number, maxX: number, maxY: number): void {
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    throw new ApiError(400, 'Unable to compute geometry bbox');
  }
  if (minX === maxX || minY === maxY) {
    throw new ApiError(400, 'Geometry bounding box has zero width or height');
  }
}

/**
 * Approximate meters-per-degree at a given latitude (WGS84).
 */
function metersPerDegree(latitude: number): { x: number; y: number } {
  const latRad = (latitude * Math.PI) / 180;
  const metersPerDegLat =
    111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerDegLon = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);
  return { x: metersPerDegLon, y: metersPerDegLat };
}

/**
 * Computes Process API image dimensions from a geometry bbox.
 * Caps at 1024 on the longest side, floors at 256, and avoids
 * exceeding native Sentinel-2 ~10 m resolution.
 */
export function computeImageDimensions(geometry: NormalizedGeometry): ImageDimensions {
  const [minX, minY, maxX, maxY] = getBbox(geometry);
  const widthDeg = maxX - minX;
  const heightDeg = maxY - minY;

  if (widthDeg <= 0 || heightDeg <= 0) {
    throw new ApiError(400, 'Geometry bounding box has zero width or height');
  }

  const centerLat = (minY + maxY) / 2;
  const { x: mPerDegX, y: mPerDegY } = metersPerDegree(centerLat);

  const widthMeters = widthDeg * mPerDegX;
  const heightMeters = heightDeg * mPerDegY;

  let width = Math.round(widthMeters / SENTINEL2_RESOLUTION_METERS);
  let height = Math.round(heightMeters / SENTINEL2_RESOLUTION_METERS);

  if (width < MIN_DIMENSION && height < MIN_DIMENSION) {
    const scale = MIN_DIMENSION / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  } else {
    width = Math.max(width, 1);
    height = Math.max(height, 1);
  }

  const longest = Math.max(width, height);
  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  return { width, height };
}

export function getPolygonAreaSqMeters(geometry: NormalizedGeometry): number {
  return turf.area(geometry);
}

/** @deprecated Prefer normalizeGeoJsonGeometry for full validation. */
export function validatePolygon(geometry: PolygonGeometry): void {
  normalizeGeoJsonGeometry(geometry);
}

export function getBbox(geometry: NormalizedGeometry): [number, number, number, number] {
  const result = turf.bbox(geometry);
  return [result[0], result[1], result[2], result[3]];
}

export type { MultiPolygonGeometry, NormalizedGeometry, PolygonGeometry };
