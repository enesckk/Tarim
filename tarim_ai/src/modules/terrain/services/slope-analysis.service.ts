import type {
  DemSampleGrid,
  SlopeClass,
  SlopeDistribution,
  SlopeStats,
} from '../types/terrain.types.js';
import { hornSlopeAspect } from '../utils/horn-slope.utils.js';
import {
  mean,
  median,
  percentile,
  populationStdDev,
  round1,
  round2,
} from '../utils/terrain-stats.utils.js';
import type { TerrainCalibration } from '../config/terrain-calibration.js';

function percentToDegrees(slopePercent: number): number {
  return (Math.atan(slopePercent / 100) * 180) / Math.PI;
}

export class SlopeAnalysisService {
  analyze(grid: DemSampleGrid, calibration: TerrainCalibration): SlopeStats {
    const slopes: number[] = [];
    for (let row = 1; row < grid.height - 1; row += 1) {
      for (let col = 1; col < grid.width - 1; col += 1) {
        const result = hornSlopeAspect(grid, col, row);
        if (result && Number.isFinite(result.slopePercent) && result.slopePercent >= 0) {
          slopes.push(result.slopePercent);
        }
      }
    }

    if (slopes.length === 0) {
      return {
        unit: 'percent',
        meanPercent: 0,
        medianPercent: 0,
        maximumPercent: 0,
        minimumPercent: 0,
        p10Percent: 0,
        p50Percent: 0,
        p90Percent: 0,
        p95Percent: 0,
        standardDeviationPercent: 0,
        classification: 'unknown',
        distribution: emptyDistribution(),
        validPixelCount: 0,
        meanDegrees: 0,
        medianDegrees: 0,
        maximumDegrees: 0,
      };
    }

    const distribution = buildDistribution(slopes, calibration);
    const meanPercent = mean(slopes)!;
    const medianPercent = median(slopes)!;
    const p90Percent = percentile(slopes, 90)!;
    const maximumPercent = Math.max(...slopes);
    const classification = classifySlope(meanPercent, p90Percent, distribution, calibration);

    return {
      unit: 'percent',
      meanPercent: round1(meanPercent),
      medianPercent: round1(medianPercent),
      maximumPercent: round1(maximumPercent),
      minimumPercent: round1(Math.min(...slopes)),
      p10Percent: round1(percentile(slopes, 10)!),
      p50Percent: round1(medianPercent),
      p90Percent: round1(p90Percent),
      p95Percent: round1(percentile(slopes, 95)!),
      standardDeviationPercent: round2(populationStdDev(slopes) ?? 0),
      classification,
      distribution,
      validPixelCount: slopes.length,
      meanDegrees: round1(percentToDegrees(meanPercent)),
      medianDegrees: round1(percentToDegrees(medianPercent)),
      maximumDegrees: round1(percentToDegrees(maximumPercent)),
    };
  }
}

export function classifySlopePercent(
  value: number,
  calibration: TerrainCalibration,
): SlopeClass {
  const c = calibration.slopeClassesPercent;
  if (value <= c.flatMax) return 'flat';
  if (value <= c.gentleMax) return 'gentle';
  if (value <= c.moderateMax) return 'moderate';
  if (value <= c.steepMax) return 'steep';
  return 'very_steep';
}

function classifySlope(
  meanPercent: number,
  p90Percent: number,
  distribution: SlopeDistribution,
  calibration: TerrainCalibration,
): SlopeClass {
  // Prefer p90 + distribution; do not let a single maximum dominate.
  const weighted =
    meanPercent * 0.45 +
    p90Percent * 0.35 +
    (distribution.twentyToThirtyFivePercent + distribution.aboveThirtyFivePercent) *
      0.2 *
      0.01 *
      calibration.slopeClassesPercent.steepMax;
  return classifySlopePercent(weighted, calibration);
}

function buildDistribution(
  slopes: number[],
  calibration: TerrainCalibration,
): SlopeDistribution {
  const c = calibration.slopeClassesPercent;
  const counts = {
    zeroToFivePercent: 0,
    fiveToTwelvePercent: 0,
    twelveToTwentyPercent: 0,
    twentyToThirtyFivePercent: 0,
    aboveThirtyFivePercent: 0,
  };

  for (const slope of slopes) {
    if (slope <= c.flatMax) counts.zeroToFivePercent += 1;
    else if (slope <= c.gentleMax) counts.fiveToTwelvePercent += 1;
    else if (slope <= c.moderateMax) counts.twelveToTwentyPercent += 1;
    else if (slope <= c.steepMax) counts.twentyToThirtyFivePercent += 1;
    else counts.aboveThirtyFivePercent += 1;
  }

  const total = slopes.length;
  const toPct = (n: number) => round1((n / total) * 100);
  const distribution: SlopeDistribution = {
    zeroToFivePercent: toPct(counts.zeroToFivePercent),
    fiveToTwelvePercent: toPct(counts.fiveToTwelvePercent),
    twelveToTwentyPercent: toPct(counts.twelveToTwentyPercent),
    twentyToThirtyFivePercent: toPct(counts.twentyToThirtyFivePercent),
    aboveThirtyFivePercent: toPct(counts.aboveThirtyFivePercent),
  };

  const sum =
    distribution.zeroToFivePercent +
    distribution.fiveToTwelvePercent +
    distribution.twelveToTwentyPercent +
    distribution.twentyToThirtyFivePercent +
    distribution.aboveThirtyFivePercent;
  const drift = round1(100 - sum);
  if (Math.abs(drift) >= 0.1) {
    distribution.zeroToFivePercent = round1(distribution.zeroToFivePercent + drift);
  }
  return distribution;
}

function emptyDistribution(): SlopeDistribution {
  return {
    zeroToFivePercent: 0,
    fiveToTwelvePercent: 0,
    twelveToTwentyPercent: 0,
    twentyToThirtyFivePercent: 0,
    aboveThirtyFivePercent: 0,
  };
}
