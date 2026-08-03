import type { LandUsabilityCalibration } from '../constants/land-usability-calibration.js';
import type {
  FieldEvidenceInput,
  RootableSoilDepthResult,
} from '../types/land-usability.types.js';
import { ApiError } from '../../../utils/api-error.js';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function resolveRootableSoilDepth(
  fieldEvidence: FieldEvidenceInput | undefined,
  calibration: LandUsabilityCalibration,
): RootableSoilDepthResult {
  const raw = fieldEvidence?.rootableSoilDepthMeasurementsCm;
  if (!raw || raw.length === 0) {
    return {
      status: 'unknown',
      minimumCm: null,
      maximumCm: null,
      meanCm: null,
      medianCm: null,
      standardDeviationCm: null,
      measurementCount: 0,
      source: 'unknown',
      confidence: 'unknown',
      requiresFieldVerification: true,
    };
  }

  const { minimumValidCm, maximumValidCm } = calibration.fieldDepth;
  const valid: number[] = [];
  for (const value of raw) {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value < minimumValidCm ||
      value > maximumValidCm
    ) {
      throw new ApiError(400, 'Invalid rootable soil depth measurement', {
        value,
        minimumValidCm,
        maximumValidCm,
      });
    }
    valid.push(value);
  }

  const count = valid.length;
  let confidence: string = 'low';
  if (count >= calibration.fieldDepth.highConfidenceSampleCount) {
    confidence = 'high';
  } else if (count >= 3) {
    // Spec: 3–4 and 5–7 → medium
    confidence = 'medium';
  } else if (count >= calibration.fieldDepth.lowConfidenceSampleCount) {
    confidence = 'low';
  }

  const mean = valid.reduce((a, b) => a + b, 0) / count;
  const sd = stdDev(valid, mean);
  // High dispersion relative to mean → drop one confidence level
  if (mean > 0 && sd / mean > 0.45) {
    if (confidence === 'high') confidence = 'medium';
    else if (confidence === 'medium') confidence = 'low';
  }

  return {
    status: 'field_measured',
    minimumCm: round1(Math.min(...valid)),
    maximumCm: round1(Math.max(...valid)),
    meanCm: round1(mean),
    medianCm: round1(median(valid)),
    standardDeviationCm: round1(sd),
    measurementCount: count,
    source: 'field_measurement',
    confidence,
    requiresFieldVerification: false,
  };
}
