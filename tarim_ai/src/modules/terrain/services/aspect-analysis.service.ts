import type { AspectDirection, AspectStats, DemSampleGrid } from '../types/terrain.types.js';
import { hornSlopeAspect } from '../utils/horn-slope.utils.js';
import { round1, round2 } from '../utils/terrain-stats.utils.js';

export class AspectAnalysisService {
  analyze(grid: DemSampleGrid): AspectStats {
    const buckets: Record<Exclude<AspectDirection, 'mixed' | 'unknown'>, number> = {
      north: 0,
      northeast: 0,
      east: 0,
      southeast: 0,
      south: 0,
      southwest: 0,
      west: 0,
      northwest: 0,
      flat: 0,
    };

    let total = 0;
    let sinSum = 0;
    let cosSum = 0;
    let orientedCount = 0;

    for (let row = 1; row < grid.height - 1; row += 1) {
      for (let col = 1; col < grid.width - 1; col += 1) {
        const result = hornSlopeAspect(grid, col, row);
        if (!result) continue;
        total += 1;
        if (result.aspectDegrees == null) {
          buckets.flat += 1;
        } else {
          const deg = result.aspectDegrees;
          buckets[aspectFromDegrees(deg)] += 1;
          const rad = (deg * Math.PI) / 180;
          sinSum += Math.sin(rad);
          cosSum += Math.cos(rad);
          orientedCount += 1;
        }
      }
    }

    if (total === 0) {
      return {
        dominantDirection: 'unknown',
        dominantPercent: 0,
        northFacingPercent: 0,
        southFacingPercent: 0,
        eastFacingPercent: 0,
        westFacingPercent: 0,
        flatPercent: 0,
        circularMeanDegrees: null,
        aspectConcentration: null,
        dominantDegrees: null,
      };
    }

    const pct = (n: number) => round1((n / total) * 100);
    let dominantDirection: AspectDirection = 'flat';
    let dominantCount = -1;
    for (const [key, count] of Object.entries(buckets) as Array<[AspectDirection, number]>) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantDirection = key;
      }
    }

    const dominantPercent = pct(dominantCount);
    if (dominantPercent < 35 && buckets.flat / total < 0.5) {
      dominantDirection = 'mixed';
    }

    let circularMeanDegrees: number | null = null;
    let aspectConcentration: number | null = null;
    if (orientedCount > 0) {
      const meanSin = sinSum / orientedCount;
      const meanCos = cosSum / orientedCount;
      aspectConcentration = round2(Math.sqrt(meanSin * meanSin + meanCos * meanCos));
      let deg = (Math.atan2(meanSin, meanCos) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      circularMeanDegrees = round1(deg);
    }

    return {
      dominantDirection,
      dominantPercent,
      northFacingPercent: pct(buckets.north + buckets.northeast + buckets.northwest),
      southFacingPercent: pct(buckets.south + buckets.southeast + buckets.southwest),
      eastFacingPercent: pct(buckets.east + buckets.northeast + buckets.southeast),
      westFacingPercent: pct(buckets.west + buckets.northwest + buckets.southwest),
      flatPercent: pct(buckets.flat),
      circularMeanDegrees,
      aspectConcentration,
      dominantDegrees: circularMeanDegrees,
    };
  }
}

export function aspectFromDegrees(degrees: number): Exclude<
  AspectDirection,
  'flat' | 'mixed' | 'unknown'
> {
  const d = ((degrees % 360) + 360) % 360;
  if (d >= 337.5 || d < 22.5) return 'north';
  if (d < 67.5) return 'northeast';
  if (d < 112.5) return 'east';
  if (d < 157.5) return 'southeast';
  if (d < 202.5) return 'south';
  if (d < 247.5) return 'southwest';
  if (d < 292.5) return 'west';
  return 'northwest';
}
