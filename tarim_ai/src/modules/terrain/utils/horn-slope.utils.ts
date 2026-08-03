import type { DemSampleGrid } from '../types/terrain.types.js';
import { cellSizeMeters, indexOf } from './dem-grid.utils.js';
import { isValidElevation } from './terrain-stats.utils.js';

/**
 * Horn (1981) slope in percent and aspect in degrees clockwise from north.
 * Returns null slope/aspect when neighborhood is incomplete or flat aspect undefined.
 */
export function hornSlopeAspect(
  grid: DemSampleGrid,
  col: number,
  row: number,
): { slopePercent: number; aspectDegrees: number | null } | null {
  if (col <= 0 || row <= 0 || col >= grid.width - 1 || row >= grid.height - 1) {
    return null;
  }

  const z = (c: number, r: number): number | null => {
    const value = grid.elevations[indexOf(grid.width, c, r)];
    return isValidElevation(value) ? value : null;
  };

  const z1 = z(col - 1, row + 1);
  const z2 = z(col, row + 1);
  const z3 = z(col + 1, row + 1);
  const z4 = z(col - 1, row);
  const z6 = z(col + 1, row);
  const z7 = z(col - 1, row - 1);
  const z8 = z(col, row - 1);
  const z9 = z(col + 1, row - 1);

  if (
    z1 == null ||
    z2 == null ||
    z3 == null ||
    z4 == null ||
    z6 == null ||
    z7 == null ||
    z8 == null ||
    z9 == null
  ) {
    return null;
  }

  const { dx, dy } = cellSizeMeters(grid, row);
  if (dx <= 0 || dy <= 0) {
    return null;
  }

  // dz/dx and dz/dy (Horn)
  const dzdx = ((z3 + 2 * z6 + z9) - (z1 + 2 * z4 + z7)) / (8 * dx);
  const dzdy = ((z1 + 2 * z2 + z3) - (z7 + 2 * z8 + z9)) / (8 * dy);

  const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
  const slopePercent = Math.tan(slopeRad) * 100;

  const flatThreshold = 0.01; // percent
  if (slopePercent < flatThreshold) {
    return { slopePercent: 0, aspectDegrees: null };
  }

  let aspect = (Math.atan2(dzdy, -dzdx) * 180) / Math.PI;
  if (aspect < 0) {
    aspect += 360;
  }

  return { slopePercent, aspectDegrees: aspect };
}

/**
 * Riley et al. TRI: sqrt(mean squared difference to 8 neighbors).
 */
export function terrainRuggednessIndex(
  grid: DemSampleGrid,
  col: number,
  row: number,
): number | null {
  if (col <= 0 || row <= 0 || col >= grid.width - 1 || row >= grid.height - 1) {
    return null;
  }
  const center = grid.elevations[indexOf(grid.width, col, row)];
  if (!isValidElevation(center)) {
    return null;
  }

  let sumSq = 0;
  let count = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const neighbor = grid.elevations[indexOf(grid.width, col + dc, row + dr)];
      if (!isValidElevation(neighbor)) continue;
      const diff = neighbor - center;
      sumSq += diff * diff;
      count += 1;
    }
  }
  if (count === 0) return null;
  return Math.sqrt(sumSq / count);
}
