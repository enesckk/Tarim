import * as turf from '@turf/turf';
import type { NormalizedGeometry } from '../../../types/geojson.types.js';
import type { DemSampleGrid } from '../types/terrain.types.js';
import { metersPerDegreeLat, metersPerDegreeLon } from './terrain-stats.utils.js';

export interface GridBounds {
  west: number;
  east: number;
  south: number;
  north: number;
}

export function geometryBounds(geometry: NormalizedGeometry): GridBounds {
  const bbox = turf.bbox(geometry);
  return {
    west: bbox[0],
    south: bbox[1],
    east: bbox[2],
    north: bbox[3],
  };
}

export function pointInGeometry(
  lon: number,
  lat: number,
  geometry: NormalizedGeometry,
): boolean {
  return turf.booleanPointInPolygon(turf.point([lon, lat]), geometry as never);
}

/**
 * Builds an empty DEM grid covering the geometry bbox at approximately resolutionMeters.
 */
export function createEmptyGrid(
  geometry: NormalizedGeometry,
  resolutionMeters: number,
  maxCells = 80,
): Omit<DemSampleGrid, 'elevations' | 'provider' | 'isMock' | 'isEstimated' | 'fallbackUsed' | 'limitations' | 'metadata'> & {
  elevations: Array<number | null>;
} {
  const bounds = geometryBounds(geometry);
  const midLat = (bounds.south + bounds.north) / 2;
  const mLat = metersPerDegreeLat(midLat);
  const mLon = metersPerDegreeLon(midLat);

  const widthMeters = Math.max(1, (bounds.east - bounds.west) * mLon);
  const heightMeters = Math.max(1, (bounds.north - bounds.south) * mLat);

  let width = Math.max(3, Math.ceil(widthMeters / resolutionMeters) + 1);
  let height = Math.max(3, Math.ceil(heightMeters / resolutionMeters) + 1);

  if (width * height > maxCells * maxCells) {
    const scale = Math.sqrt((maxCells * maxCells) / (width * height));
    width = Math.max(3, Math.floor(width * scale));
    height = Math.max(3, Math.floor(height * scale));
  }

  const cellSizeDegreesX = (bounds.east - bounds.west) / Math.max(1, width - 1);
  const cellSizeDegreesY = (bounds.north - bounds.south) / Math.max(1, height - 1);

  return {
    width,
    height,
    west: bounds.west,
    south: bounds.south,
    cellSizeDegreesX: cellSizeDegreesX || 0.0001,
    cellSizeDegreesY: cellSizeDegreesY || 0.0001,
    resolutionMeters,
    elevations: Array.from({ length: width * height }, () => null),
  };
}

export function cellCenter(
  grid: Pick<
    DemSampleGrid,
    'west' | 'south' | 'cellSizeDegreesX' | 'cellSizeDegreesY' | 'width' | 'height'
  >,
  col: number,
  row: number,
): { lon: number; lat: number } {
  return {
    lon: grid.west + col * grid.cellSizeDegreesX,
    lat: grid.south + row * grid.cellSizeDegreesY,
  };
}

export function indexOf(width: number, col: number, row: number): number {
  return row * width + col;
}

/**
 * Approximate local cell size in meters for Horn operator (dx, dy).
 */
export function cellSizeMeters(
  grid: Pick<DemSampleGrid, 'cellSizeDegreesX' | 'cellSizeDegreesY' | 'south' | 'height'>,
  row: number,
): { dx: number; dy: number } {
  const lat = grid.south + row * grid.cellSizeDegreesY;
  return {
    dx: Math.abs(grid.cellSizeDegreesX * metersPerDegreeLon(lat)),
    dy: Math.abs(grid.cellSizeDegreesY * metersPerDegreeLat(lat)),
  };
}
