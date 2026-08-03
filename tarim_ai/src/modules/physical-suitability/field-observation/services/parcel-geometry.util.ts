import type { GeometryValidationStatus } from '../types/field-observation.types.js';

export type GeometryCheckOutcome = {
  status: GeometryValidationStatus;
  message: string | null;
};

/**
 * Minimal GeoJSON Polygon / MultiPolygon point-in-polygon check.
 * On parse failure → REQUIRES_REVIEW (data must not be discarded).
 */
export function checkPointAgainstParcelGeometry(
  latitude: number,
  longitude: number,
  parcelGeometryJson: string | null | undefined,
): GeometryCheckOutcome {
  if (parcelGeometryJson == null || parcelGeometryJson.trim() === '') {
    return {
      status: 'NOT_CHECKED',
      message: 'Parcel geometry not available; boundary check skipped',
    };
  }

  let geo: unknown;
  try {
    geo = JSON.parse(parcelGeometryJson);
  } catch {
    return {
      status: 'REQUIRES_REVIEW',
      message: 'Parcel geometry parse failed; observation retained for review',
    };
  }

  if (!geo || typeof geo !== 'object') {
    return {
      status: 'REQUIRES_REVIEW',
      message: 'Parcel geometry invalid; observation retained for review',
    };
  }

  const g = geo as { type?: string; coordinates?: unknown };
  try {
    const inside = pointInGeoJson(longitude, latitude, g);
    if (inside == null) {
      return {
        status: 'REQUIRES_REVIEW',
        message: `Unsupported geometry type ${g.type ?? 'unknown'}; observation retained`,
      };
    }
    if (!inside) {
      return {
        status: 'OUTSIDE_PARCEL',
        message: 'Observation point is outside registered parcel boundary',
      };
    }
    return { status: 'OK', message: null };
  } catch {
    return {
      status: 'REQUIRES_REVIEW',
      message: 'Geometry validation failed; observation retained for review',
    };
  }
}

function pointInGeoJson(
  lon: number,
  lat: number,
  geo: { type?: string; coordinates?: unknown },
): boolean | null {
  if (geo.type === 'Polygon') {
    return pointInPolygon(lon, lat, geo.coordinates as number[][][]);
  }
  if (geo.type === 'MultiPolygon') {
    const polys = geo.coordinates as number[][][][];
    return polys.some((p) => pointInPolygon(lon, lat, p));
  }
  if (geo.type === 'Feature') {
    const f = geo as { geometry?: { type?: string; coordinates?: unknown } };
    if (!f.geometry) return null;
    return pointInGeoJson(lon, lat, f.geometry);
  }
  if (geo.type === 'FeatureCollection') {
    const fc = geo as { features?: { geometry?: { type?: string; coordinates?: unknown } }[] };
    if (!fc.features?.length) return null;
    return fc.features.some((f) => f.geometry && pointInGeoJson(lon, lat, f.geometry) === true);
  }
  return null;
}

/** Ray-casting; ring[0] = outer, subsequent = holes. */
function pointInPolygon(lon: number, lat: number, rings: number[][][]): boolean {
  if (!rings?.length) return false;
  if (!pointInRing(lon, lat, rings[0]!)) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lon, lat, rings[i]!)) return false;
  }
  return true;
}

function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
