import { computeMean, roundTo4 } from './statistics.utils.js';

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export interface TrendStats {
  first: number;
  last: number;
  min: number;
  max: number;
  mean: number;
  change: number;
  direction: TrendDirection;
}

export const TREND_CHANGE_THRESHOLD = 0.1;

export function resolveTrendDirection(change: number): TrendDirection {
  if (change >= TREND_CHANGE_THRESHOLD) {
    return 'increasing';
  }
  if (change <= -TREND_CHANGE_THRESHOLD) {
    return 'decreasing';
  }
  return 'stable';
}

/**
 * Builds trend stats from chronological values (oldest → newest).
 * Returns a zeroed stable trend when fewer than 1 values exist.
 */
export function computeTrend(values: number[]): TrendStats {
  if (values.length === 0) {
    return {
      first: 0,
      last: 0,
      min: 0,
      max: 0,
      mean: 0,
      change: 0,
      direction: 'stable',
    };
  }

  const first = values[0];
  const last = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = computeMean(values);
  const change = last - first;

  return {
    first: roundTo4(first),
    last: roundTo4(last),
    min: roundTo4(min),
    max: roundTo4(max),
    mean: roundTo4(mean),
    change: roundTo4(change),
    direction: resolveTrendDirection(change),
  };
}

export function interpretVegetationTrend(direction: TrendDirection): string {
  if (direction === 'increasing') {
    return 'Bitki örtüsü sinyalinde artış eğilimi görülmektedir.';
  }
  if (direction === 'decreasing') {
    return 'Bitki örtüsü sinyalinde azalış eğilimi görülmektedir.';
  }
  return 'Bitki örtüsü sinyalinde belirgin bir değişim eğilimi görülmemektedir.';
}

export function interpretMoistureTrend(direction: TrendDirection): string {
  if (direction === 'increasing') {
    return 'Nem sinyalinde artış eğilimi görülmektedir.';
  }
  if (direction === 'decreasing') {
    return 'Nem sinyalinde azalış eğilimi görülmektedir.';
  }
  return 'Nem sinyalinde belirgin bir değişim eğilimi görülmemektedir.';
}

export function interpretSoilSurfaceTrend(direction: TrendDirection): string {
  if (direction === 'increasing') {
    return 'Çıplak toprak sinyalinde artış eğilimi görülmektedir.';
  }
  if (direction === 'decreasing') {
    return 'Çıplak toprak sinyalinde azalış eğilimi görülmektedir.';
  }
  return 'Çıplak toprak sinyalinde belirgin bir değişim eğilimi görülmemektedir.';
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export function resolveTimeSeriesConfidence(
  successfulAcquisitionCount: number,
  averageValidPixelRatio: number,
): ConfidenceLevel {
  if (successfulAcquisitionCount >= 8 && averageValidPixelRatio >= 0.4) {
    return 'high';
  }
  if (successfulAcquisitionCount >= 4 && averageValidPixelRatio >= 0.25) {
    return 'medium';
  }
  return 'low';
}
