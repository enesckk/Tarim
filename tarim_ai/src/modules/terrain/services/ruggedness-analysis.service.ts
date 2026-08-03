import type { DemSampleGrid, RuggednessClass, RuggednessStats } from '../types/terrain.types.js';
import { terrainRuggednessIndex } from '../utils/horn-slope.utils.js';
import {
  mean,
  median,
  percentile,
  round2,
} from '../utils/terrain-stats.utils.js';
import type { TerrainCalibration } from '../config/terrain-calibration.js';

export class RuggednessAnalysisService {
  analyze(grid: DemSampleGrid, calibration: TerrainCalibration): RuggednessStats {
    const values: number[] = [];
    for (let row = 1; row < grid.height - 1; row += 1) {
      for (let col = 1; col < grid.width - 1; col += 1) {
        const tri = terrainRuggednessIndex(grid, col, row);
        if (tri != null && Number.isFinite(tri)) {
          values.push(tri);
        }
      }
    }

    if (values.length === 0) {
      return {
        meanIndex: 0,
        medianIndex: 0,
        p90Index: 0,
        maximumIndex: 0,
        classification: 'unknown',
        method: 'terrain_ruggedness_index',
        validPixelCount: 0,
        index: 0,
      };
    }

    const meanIndex = mean(values)!;
    return {
      meanIndex: round2(meanIndex),
      medianIndex: round2(median(values)!),
      p90Index: round2(percentile(values, 90)!),
      maximumIndex: round2(Math.max(...values)),
      classification: classifyRuggedness(meanIndex, calibration),
      method: 'terrain_ruggedness_index',
      validPixelCount: values.length,
      index: round2(meanIndex),
    };
  }
}

export function classifyRuggedness(
  meanIndex: number,
  calibration: TerrainCalibration,
): RuggednessClass {
  const t = calibration.ruggednessThresholds;
  if (t.veryLowMax != null && meanIndex <= t.veryLowMax) return 'very_low';
  if (meanIndex <= t.lowMax) return 'low';
  if (meanIndex <= t.mediumMax) return 'medium';
  if (meanIndex <= t.highMax) return 'high';
  return 'very_high';
}
