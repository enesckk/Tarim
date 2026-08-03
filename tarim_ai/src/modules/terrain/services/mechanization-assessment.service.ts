import type {
  MechanizationAssessment,
  MechanizationLimitingFactor,
  MechanizationSuitability,
  RuggednessStats,
  SlopeStats,
} from '../types/terrain.types.js';
import type { TerrainCalibration } from '../config/terrain-calibration.js';
import type { RiskLevel } from '../../environment/shared/types/provider-metadata.types.js';

export class MechanizationAssessmentService {
  assess(input: {
    slope: SlopeStats;
    ruggedness: RuggednessStats;
    parcelAreaSquareMeters: number;
    spatialConfidence: RiskLevel | 'insufficient';
    calibration: TerrainCalibration;
  }): MechanizationAssessment {
    const { slope, ruggedness, parcelAreaSquareMeters, spatialConfidence, calibration } =
      input;
    const mech = calibration.mechanization;
    const limitingFactors: MechanizationLimitingFactor[] = [];

    const steepShare =
      slope.distribution.twentyToThirtyFivePercent +
      slope.distribution.aboveThirtyFivePercent;
    const verySteepShare = slope.distribution.aboveThirtyFivePercent;

    if (steepShare >= mech.steepAreaWarningPercent) {
      limitingFactors.push({
        code: 'STEEP_AREA_RATIO',
        severity: steepShare >= mech.steepAreaWarningPercent * 2 ? 'high' : 'medium',
        value: steepShare,
        unit: 'percent',
      });
    }
    if (verySteepShare >= mech.verySteepAreaWarningPercent) {
      limitingFactors.push({
        code: 'VERY_STEEP_AREA_RATIO',
        severity: 'high',
        value: verySteepShare,
        unit: 'percent',
      });
    }
    if (slope.meanPercent >= mech.strongLimitationMeanSlopePercent) {
      limitingFactors.push({
        code: 'HIGH_MEAN_SLOPE',
        severity: 'high',
        value: slope.meanPercent,
        unit: 'percent',
      });
    } else if (slope.p90Percent >= mech.strongLimitationMeanSlopePercent) {
      limitingFactors.push({
        code: 'HIGH_P90_SLOPE',
        severity: 'medium',
        value: slope.p90Percent,
        unit: 'percent',
      });
    }

    if (
      ruggedness.classification === 'high' ||
      ruggedness.classification === 'very_high'
    ) {
      limitingFactors.push({
        code: 'HIGH_RUGGEDNESS',
        severity: ruggedness.classification === 'very_high' ? 'high' : 'medium',
        value: ruggedness.meanIndex,
      });
    }

    if (parcelAreaSquareMeters > 0 && parcelAreaSquareMeters < 1000) {
      limitingFactors.push({
        code: 'SMALL_PARCEL_AREA',
        severity: 'low',
        value: parcelAreaSquareMeters,
        unit: 'squareMeters',
      });
    }

    const suitability = resolveSuitability(slope, ruggedness, limitingFactors, mech);
    const confidence: RiskLevel =
      spatialConfidence === 'insufficient'
        ? 'low'
        : spatialConfidence === 'high'
          ? 'medium'
          : spatialConfidence;

    return {
      terrainSuitability:
        spatialConfidence === 'insufficient' ? 'unknown' : suitability,
      confidence,
      limitingFactors,
      limitations: [
        'Parsel erişimi ve gerçek makine geçiş koşulları uzaktan doğrulanmamıştır.',
        'Değerlendirme yalnızca eğim ve engebelilik tabanlıdır; yol erişimi dahil değildir.',
      ],
    };
  }
}

function resolveSuitability(
  slope: SlopeStats,
  ruggedness: RuggednessStats,
  factors: MechanizationLimitingFactor[],
  mech: TerrainCalibration['mechanization'],
): MechanizationSuitability {
  const suitableMax = mech.suitableMaximumMeanSlopePercent ?? 8;
  const generallyMax = mech.generallySuitableMaximumMeanSlopePercent ?? 15;
  const limitedMax = mech.limitedMaximumMeanSlopePercent ?? 30;
  const highCount = factors.filter((f) => f.severity === 'high').length;

  if (
    slope.meanPercent >= mech.strongLimitationMeanSlopePercent ||
    slope.meanPercent > limitedMax ||
    slope.distribution.aboveThirtyFivePercent >= mech.verySteepAreaWarningPercent * 2 ||
    ruggedness.classification === 'very_high' ||
    highCount >= 2
  ) {
    return 'strongly_limited';
  }
  if (
    highCount >= 1 ||
    slope.meanPercent > generallyMax ||
    slope.classification === 'steep' ||
    slope.classification === 'very_steep' ||
    ruggedness.classification === 'high'
  ) {
    return 'limited';
  }
  if (
    factors.length > 0 ||
    slope.meanPercent > suitableMax ||
    slope.classification === 'moderate' ||
    ruggedness.classification === 'medium'
  ) {
    return 'partially_suitable';
  }
  return 'suitable';
}
