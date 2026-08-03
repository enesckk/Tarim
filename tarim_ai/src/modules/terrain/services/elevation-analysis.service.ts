import type { ElevationStats } from '../types/terrain.types.js';
import {
  filterValid,
  mean,
  median,
  percentile,
  populationStdDev,
  round1,
  round2,
} from '../utils/terrain-stats.utils.js';

export class ElevationAnalysisService {
  analyze(elevations: Array<number | null | undefined>): ElevationStats | null {
    const valid = filterValid(elevations);
    if (valid.length === 0) {
      return null;
    }
    const minimumMeters = Math.min(...valid);
    const maximumMeters = Math.max(...valid);
    return {
      minimumMeters: round1(minimumMeters),
      maximumMeters: round1(maximumMeters),
      meanMeters: round1(mean(valid)!),
      medianMeters: round1(median(valid)!),
      rangeMeters: round1(maximumMeters - minimumMeters),
      standardDeviationMeters: round2(populationStdDev(valid) ?? 0),
      validSampleCount: valid.length,
      validPixelCount: valid.length,
      p10Meters: round1(percentile(valid, 10)!),
      p90Meters: round1(percentile(valid, 90)!),
    };
  }
}
