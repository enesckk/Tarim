import type { FieldSurveyCalibration } from '../constants/field-survey-calibration.js';
import { recommendedSampleCountForArea } from '../constants/field-survey-calibration.js';
import type {
  BedrockOutcropClass,
  DrainageObservationClass,
  FieldSurvey,
  MachineAccessClass,
  SurfaceStoninessClass,
  SurveyAggregation,
  SurveySample,
} from '../types/field-survey.types.js';
import { distanceBetweenSamplesMeters } from './survey-gps.service.js';

const STONINESS_RANK: Record<SurfaceStoninessClass, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
  unknown: -1,
};

const BEDROCK_RANK: Record<BedrockOutcropClass, number> = {
  not_observed: 0,
  isolated: 1,
  scattered: 2,
  frequent: 3,
  extensive: 4,
  unknown: -1,
};

const DRAINAGE_RANK: Record<DrainageObservationClass, number> = {
  adequate: 0,
  moderately_limited: 1,
  poor: 2,
  waterlogging_observed: 3,
  unknown: -1,
};

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function stdDev(values: number[], mean: number): number | null {
  if (values.length < 2) return null;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function validSamples(samples: SurveySample[]): SurveySample[] {
  return samples.filter((s) => s.acceptance !== 'invalid');
}

function isValidDepth(
  depth: number | null | undefined,
  calibration: FieldSurveyCalibration,
): depth is number {
  return (
    depth != null &&
    Number.isFinite(depth) &&
    depth >= calibration.depth.minimumValidCm &&
    depth <= calibration.depth.maximumValidCm
  );
}

function dominantOf<T extends string>(
  values: T[],
  fallback: T,
): T {
  if (values.length === 0) return fallback;
  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = values[0]!;
  let bestCount = 0;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

function worstOf<T extends string>(
  values: T[],
  rank: Record<T, number>,
  fallback: T,
): T {
  let worst: T | null = null;
  let worstRank = -Infinity;
  for (const v of values) {
    const r = rank[v] ?? -1;
    if (r > worstRank) {
      worst = v;
      worstRank = r;
    }
  }
  return worst ?? fallback;
}

export function aggregateSurvey(
  survey: FieldSurvey,
  areaSquareMeters: number | null | undefined,
  calibration: FieldSurveyCalibration,
): SurveyAggregation {
  const accepted = validSamples(survey.samples);
  const depths = accepted
    .map((s) => s.rootableSoilDepthCm)
    .filter((d): d is number => isValidDepth(d, calibration));
  const invalidDepthCount = accepted.filter(
    (s) =>
      s.rootableSoilDepthCm != null &&
      !isValidDepth(s.rootableSoilDepthCm, calibration),
  ).length;

  const sorted = [...depths].sort((a, b) => a - b);
  const mean =
    depths.length > 0
      ? depths.reduce((a, b) => a + b, 0) / depths.length
      : null;

  let depthConfidence = 'unknown';
  if (depths.length >= calibration.depthConfidence.highMinimumSamples) {
    depthConfidence = 'high';
  } else if (depths.length >= calibration.depthConfidence.mediumMinimumSamples) {
    depthConfidence = 'medium';
  } else if (depths.length >= calibration.depthConfidence.lowMinimumSamples) {
    depthConfidence = 'low';
  }

  const stoninessValues = accepted
    .map((s) => s.surfaceStoniness)
    .filter((v): v is SurfaceStoninessClass => v != null && v !== 'unknown');
  const stoninessDist: Record<string, number> = {};
  for (const v of stoninessValues) {
    stoninessDist[v] = (stoninessDist[v] ?? 0) + 1;
  }

  const bedrockValues: BedrockOutcropClass[] = [];
  for (const s of accepted) {
    if (s.bedrockOutcrop && s.bedrockOutcrop !== 'unknown') {
      bedrockValues.push(s.bedrockOutcrop);
    } else if (s.bedrockObserved === true) {
      bedrockValues.push('isolated');
    } else if (s.bedrockObserved === false) {
      bedrockValues.push('not_observed');
    }
  }
  if (
    survey.parcelObservations.bedrockOutcrop &&
    survey.parcelObservations.bedrockOutcrop !== 'unknown'
  ) {
    bedrockValues.push(survey.parcelObservations.bedrockOutcrop);
  }
  const bedrockDist: Record<string, number> = {};
  for (const v of bedrockValues) {
    bedrockDist[v] = (bedrockDist[v] ?? 0) + 1;
  }

  const drainageValues = accepted
    .map((s) => s.drainageObservation)
    .filter((v): v is DrainageObservationClass => v != null && v !== 'unknown');
  if (
    survey.parcelObservations.drainageObservation &&
    survey.parcelObservations.drainageObservation !== 'unknown'
  ) {
    drainageValues.push(survey.parcelObservations.drainageObservation);
  }

  const machineAccess =
    survey.parcelObservations.machineAccess ?? ('unknown' as MachineAccessClass);

  const recommended = recommendedSampleCountForArea(areaSquareMeters, calibration);
  const insideParcelCount = accepted.filter((s) => s.insideParcel).length;
  let separationWarnings = 0;
  for (let i = 0; i < accepted.length; i += 1) {
    for (let j = i + 1; j < accepted.length; j += 1) {
      const d = distanceBetweenSamplesMeters(
        accepted[i]!.location,
        accepted[j]!.location,
      );
      if (d < calibration.minimumSampleSeparationMeters) {
        separationWarnings += 1;
      }
    }
  }

  const adequate =
    accepted.length >= recommended &&
    insideParcelCount >= Math.min(recommended, accepted.length) &&
    separationWarnings === 0;

  let spatialConfidence = 'low';
  if (adequate && accepted.length >= calibration.depthConfidence.highMinimumSamples) {
    spatialConfidence = 'high';
  } else if (accepted.length >= recommended && insideParcelCount >= recommended - 1) {
    spatialConfidence = 'medium';
  } else if (accepted.length > 0) {
    spatialConfidence = 'low';
  } else {
    spatialConfidence = 'unknown';
  }

  return {
    rootableSoilDepth: {
      status: depths.length > 0 ? 'verified' : 'unknown',
      minimumCm: sorted.length ? sorted[0]! : null,
      maximumCm: sorted.length ? sorted[sorted.length - 1]! : null,
      meanCm: mean != null ? Number(mean.toFixed(2)) : null,
      medianCm: median(sorted),
      standardDeviationCm:
        mean != null ? Number((stdDev(depths, mean) ?? 0).toFixed(2)) : null,
      measurementCount: depths.length,
      invalidMeasurementCount: invalidDepthCount,
      confidence: depthConfidence,
      source: 'field_measurement',
    },
    surfaceStoniness: {
      dominant: dominantOf(stoninessValues, 'unknown'),
      worst: worstOf(stoninessValues, STONINESS_RANK, 'unknown'),
      distribution: stoninessDist,
      confidence: stoninessValues.length >= 3 ? 'medium' : stoninessValues.length > 0 ? 'low' : 'unknown',
    },
    bedrockOutcrop: {
      worst: worstOf(bedrockValues, BEDROCK_RANK, 'unknown'),
      distribution: bedrockDist,
      confidence: bedrockValues.length >= 3 ? 'medium' : bedrockValues.length > 0 ? 'low' : 'unknown',
    },
    drainage: {
      dominant: dominantOf(drainageValues, 'unknown'),
      worst: worstOf(drainageValues, DRAINAGE_RANK, 'unknown'),
    },
    machineAccess: {
      classification: machineAccess,
      confidence: machineAccess === 'unknown' ? 'unknown' : 'medium',
    },
    spatialCoverage: {
      recommendedSampleCount: recommended,
      validSampleCount: accepted.length,
      insideParcelCount,
      separationWarnings,
      adequate,
      confidence: spatialConfidence,
    },
  };
}
