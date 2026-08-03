import { ABSOLUTE_BOUNDARY_SCORE } from '../rules/scoring-weights.js';
import type { NumericRange, PrecipitationRange, TemperatureRange } from '../types/crop.types.js';

export function assertFiniteNumber(value: number, label = 'value'): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

/**
 * Piecewise range score:
 * - inside optimal → 1
 * - between absolute and optimal → linear 0.25..1
 * - outside absolute → 0
 * - exactly at absolute boundary → 0.25
 */
export function scoreNumericRange(value: number, range: NumericRange): number {
  assertFiniteNumber(value);
  const { absoluteMin, optimalMin, optimalMax, absoluteMax } = range;

  if (value >= optimalMin && value <= optimalMax) {
    return 1;
  }
  if (value < absoluteMin || value > absoluteMax) {
    return 0;
  }
  if (value < optimalMin) {
    const span = optimalMin - absoluteMin;
    if (span <= 0) {
      return ABSOLUTE_BOUNDARY_SCORE;
    }
    const t = (value - absoluteMin) / span;
    return ABSOLUTE_BOUNDARY_SCORE + t * (1 - ABSOLUTE_BOUNDARY_SCORE);
  }

  const span = absoluteMax - optimalMax;
  if (span <= 0) {
    return ABSOLUTE_BOUNDARY_SCORE;
  }
  const t = (absoluteMax - value) / span;
  return ABSOLUTE_BOUNDARY_SCORE + t * (1 - ABSOLUTE_BOUNDARY_SCORE);
}

export function scoreTemperatureRange(value: number, range: TemperatureRange): number {
  return scoreNumericRange(value, {
    absoluteMin: range.absoluteMinC,
    optimalMin: range.optimalMinC,
    optimalMax: range.optimalMaxC,
    absoluteMax: range.absoluteMaxC,
  });
}

export function scorePrecipitationRange(value: number, range: PrecipitationRange): number {
  return scoreNumericRange(value, {
    absoluteMin: range.minimum,
    optimalMin: range.optimalMin,
    optimalMax: range.optimalMax,
    absoluteMax: range.maximum,
  });
}

export function clampScore(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function roundScore(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
