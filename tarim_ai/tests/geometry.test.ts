import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  computeImageDimensions,
  getBbox,
  normalizeGeoJsonGeometry,
  validatePolygon,
} from '../src/utils/geometry.utils.js';
import { geoJsonInputSchema } from '../src/schemas/geojson.schema.js';
import type { PolygonGeometry } from '../src/types/geojson.types.js';
import { ApiError } from '../src/utils/api-error.js';
import {
  buildDatetimeRange,
  buildProcessDatetime,
  buildProcessTimeRange,
  formatFilenameTimestamp,
} from '../src/utils/date.utils.js';

/** Small parcel roughly the size of a field (~200m). */
const smallParcel: PolygonGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [36.85, 37.05],
      [36.852, 37.05],
      [36.852, 37.052],
      [36.85, 37.052],
      [36.85, 37.05],
    ],
  ],
};

/** Larger area that would exceed 1024 at native 10m. */
const largeParcel: PolygonGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [36.0, 37.0],
      [36.3, 37.0],
      [36.3, 37.2],
      [36.0, 37.2],
      [36.0, 37.0],
    ],
  ],
};

const multiPolygon = {
  type: 'MultiPolygon' as const,
  coordinates: [
    smallParcel.coordinates,
    [
      [
        [36.86, 37.06],
        [36.862, 37.06],
        [36.862, 37.062],
        [36.86, 37.062],
        [36.86, 37.06],
      ],
    ],
  ],
};

describe('normalizeGeoJsonGeometry', () => {
  it('accepts a bare Polygon geometry', () => {
    const result = normalizeGeoJsonGeometry(smallParcel);

    expect(result.type).toBe('Polygon');
    expect(result.coordinates).toEqual(smallParcel.coordinates);
  });

  it('accepts a bare MultiPolygon geometry', () => {
    const result = normalizeGeoJsonGeometry(multiPolygon);

    expect(result.type).toBe('MultiPolygon');
    expect(result.coordinates).toHaveLength(2);
  });

  it('extracts geometry from a Feature', () => {
    const result = normalizeGeoJsonGeometry({
      type: 'Feature',
      properties: { ada: '108' },
      geometry: smallParcel,
    });

    expect(result).toEqual(smallParcel);
  });

  it('extracts geometry from a single-feature FeatureCollection', () => {
    const result = normalizeGeoJsonGeometry({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: null,
          geometry: smallParcel,
        },
      ],
    });

    expect(result).toEqual(smallParcel);
  });

  it('rejects an unclosed ring', () => {
    expect(() =>
      normalizeGeoJsonGeometry({
        type: 'Polygon',
        coordinates: [
          [
            [36.85, 37.05],
            [36.852, 37.05],
            [36.852, 37.052],
            [36.85, 37.052],
          ],
        ],
      }),
    ).toThrow(/closed/i);
  });

  it('rejects a FeatureCollection with multiple features', () => {
    expect(() =>
      normalizeGeoJsonGeometry({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: smallParcel, properties: null },
          { type: 'Feature', geometry: largeParcel, properties: null },
        ],
      }),
    ).toThrow(/exactly 1 Feature/i);
  });

  it('rejects unsupported LineString geometry', () => {
    expect(() =>
      normalizeGeoJsonGeometry({
        type: 'LineString',
        coordinates: [
          [36.85, 37.05],
          [36.852, 37.05],
        ],
      } as never),
    ).toThrow(/Unsupported geometry type/i);
  });

  it('rejects self-intersecting polygons', () => {
    expect(() =>
      normalizeGeoJsonGeometry({
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 2],
            [0, 2],
            [2, 0],
            [0, 0],
          ],
        ],
      }),
    ).toThrow(/self-intersecting/i);
  });
});

describe('geoJsonInputSchema', () => {
  it('accepts Polygon, Feature, and FeatureCollection', () => {
    expect(geoJsonInputSchema.parse(smallParcel).type).toBe('Polygon');
    expect(
      geoJsonInputSchema.parse({
        type: 'Feature',
        geometry: smallParcel,
        properties: {},
      }).type,
    ).toBe('Feature');
    expect(
      geoJsonInputSchema.parse({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: smallParcel, properties: null }],
      }).type,
    ).toBe('FeatureCollection');
  });

  it('rejects FeatureCollection with more than one Feature', () => {
    expect(() =>
      geoJsonInputSchema.parse({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: smallParcel, properties: null },
          { type: 'Feature', geometry: largeParcel, properties: null },
        ],
      }),
    ).toThrow(ZodError);
  });

  it('rejects LineString geometry', () => {
    expect(() =>
      geoJsonInputSchema.parse({
        type: 'LineString',
        coordinates: [
          [36.85, 37.05],
          [36.852, 37.05],
        ],
      }),
    ).toThrow(ZodError);
  });
});

describe('computeImageDimensions', () => {
  it('enforces minimum dimension of 256 for tiny parcels', () => {
    const dims = computeImageDimensions(smallParcel);

    expect(Math.max(dims.width, dims.height)).toBeGreaterThanOrEqual(256);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  it('caps longest side at 1024 for large parcels', () => {
    const dims = computeImageDimensions(largeParcel);

    expect(Math.max(dims.width, dims.height)).toBeLessThanOrEqual(1024);
  });

  it('preserves geographic aspect ratio (meters) approximately', () => {
    const dims = computeImageDimensions(largeParcel);
    const [minX, minY, maxX, maxY] = getBbox(largeParcel);

    const centerLat = (minY + maxY) / 2;
    const latRad = (centerLat * Math.PI) / 180;
    const mPerDegLat = 111132.92 - 559.82 * Math.cos(2 * latRad);
    const mPerDegLon = 111412.84 * Math.cos(latRad);
    const meterAspect = ((maxX - minX) * mPerDegLon) / ((maxY - minY) * mPerDegLat);
    const imageAspect = dims.width / dims.height;

    expect(Math.abs(imageAspect - meterAspect) / meterAspect).toBeLessThan(0.05);
  });

  it('throws on invalid polygon', () => {
    expect(() =>
      validatePolygon({
        type: 'Polygon',
        coordinates: [[[0, 0]]],
      }),
    ).toThrow(ApiError);
  });
});

describe('date utils', () => {
  it('builds a datetime range for the last N days', () => {
    const now = new Date('2024-06-30T12:00:00.000Z');
    const range = buildDatetimeRange(30, now);

    expect(range).toBe('2024-05-31T12:00:00.000Z/2024-06-30T12:00:00.000Z');
  });

  it('builds process datetime as a pinned interval around catalog datetime', () => {
    const result = buildProcessDatetime('2024-06-15T10:30:45.000Z');
    expect(result).toBe('2024-06-15T10:29:45.000Z/2024-06-15T10:31:45.000Z');
  });

  it('anchors Process time range on catalog datetime, not product-id sensing time', () => {
    const range = buildProcessTimeRange(
      '2024-06-15T10:45:00.000Z',
      'S2B_MSIL2A_20240615T103045_N0512_R121_T37SCB_20240615T120000.SAFE',
    );
    expect(range.from).toBe('2024-06-15T10:44:00.000Z');
    expect(range.to).toBe('2024-06-15T10:46:00.000Z');
  });

  it('formats filesystem-safe timestamps', () => {
    expect(formatFilenameTimestamp('2024-06-15T10:30:45.000Z')).toBe('2024-06-15T10-30-45');
  });
});
