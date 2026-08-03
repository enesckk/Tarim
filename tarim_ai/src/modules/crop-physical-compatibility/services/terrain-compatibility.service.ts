import type { PhysicalRequirements } from '../schemas/physical-requirements.schema.js';
import {
  isAtMost,
  ruggednessClassOrder,
} from './crop-requirement-resolution.service.js';
import type {
  CompatibilityComponentResult,
  ParcelPhysicalEvidence,
} from '../types/crop-physical-compatibility.types.js';
import type { CropPhysicalCompatibilityCalibration } from '../constants/crop-physical-compatibility-calibration.js';

export class TerrainCompatibilityService {
  evaluateSlope(
    requirements: PhysicalRequirements,
    evidence: ParcelPhysicalEvidence,
    calibration: CropPhysicalCompatibilityCalibration,
  ): CompatibilityComponentResult {
    const req = requirements.slope;
    const terrain = evidence.terrain;

    if (evidence.terrainMock || !evidence.terrainReal || !terrain) {
      return {
        classification: 'unknown',
        importance: req.importance,
        observedValue: null,
        requirement: { ...req, unit: 'percent' },
        source: evidence.terrainMock ? 'mock' : 'unavailable',
        sourceType: evidence.terrainMock ? 'mock' : 'unknown',
        confidence: evidence.terrainMock
          ? 'unusable_for_real_decision'
          : 'unknown',
        matchedRule: 'REAL_TERRAIN_SLOPE_UNAVAILABLE',
        message: 'Gerçek DEM eğim profili yoktur; mock eğim kullanılmaz.',
      };
    }

    const mean = terrain.meanSlopePercent;
    const p90 = terrain.p90SlopePercent;
    if (mean == null || p90 == null) {
      return {
        classification: 'unknown',
        importance: req.importance,
        observedValue: { meanPercent: mean, p90Percent: p90 },
        requirement: { ...req, unit: 'percent' },
        source: terrain.provider,
        sourceType: 'real_dem',
        confidence: 'low',
        matchedRule: 'SLOPE_VALUES_MISSING',
        message: 'Eğim istatistikleri eksiktir.',
      };
    }

    const coverageOk =
      terrain.coverageStatus === 'complete' ||
      terrain.coverageStatus === 'adequate' ||
      terrain.coverageStatus === calibration.terrain.minimumCoverageStatus;
    const confOk =
      terrain.spatialConfidence === 'medium' ||
      terrain.spatialConfidence === 'high';

    const base: Omit<CompatibilityComponentResult, 'classification' | 'matchedRule' | 'message'> =
      {
        importance: req.importance,
        observedValue: {
          meanPercent: mean,
          p90Percent: p90,
          maximumPercent: terrain.maximumSlopePercent,
          unit: 'percent',
          coverageStatus: terrain.coverageStatus,
        },
        requirement: { ...req, unit: 'percent' },
        source: terrain.provider,
        sourceType: 'real_dem',
        confidence:
          terrain.spatialConfidence === 'high' ||
          terrain.spatialConfidence === 'medium'
            ? terrain.spatialConfidence
            : 'low',
      };

    // Max slope alone never drives strongly_limited
    if (
      mean > req.maximumMeanPercent &&
      coverageOk &&
      confOk &&
      terrain.spatialConfidence !== 'low'
    ) {
      return {
        ...base,
        classification: 'strongly_limited',
        matchedRule: 'MEAN_SLOPE_ABOVE_MAXIMUM_REAL_DEM',
        message: `Ortalama eğim (${mean}%) ürün maksimumunun (${req.maximumMeanPercent}%) üzerindedir.`,
      };
    }

    if (mean > req.maximumMeanPercent) {
      return {
        ...base,
        classification: 'limited',
        matchedRule: 'MEAN_SLOPE_ABOVE_MAXIMUM',
        message: `Ortalama eğim (${mean}%) maksimum eşiğin üzerindedir.`,
      };
    }

    if (
      mean <= req.acceptableMaximumMeanPercent &&
      p90 > req.maximumP90Percent
    ) {
      return {
        ...base,
        classification: 'caution',
        matchedRule: 'MEAN_ACCEPTABLE_BUT_P90_ABOVE_MAXIMUM',
        message:
          'Ortalama acceptable aralıkta ancak p90 yerel dik alanlara işaret eder.',
      };
    }

    if (mean <= req.preferredMaximumMeanPercent && p90 <= req.maximumP90Percent) {
      return {
        ...base,
        classification: 'preferred',
        matchedRule: 'MEAN_AND_P90_WITHIN_PREFERRED',
        message: 'Ortalama ve p90 eğim preferred aralıktadır.',
      };
    }

    if (mean <= req.acceptableMaximumMeanPercent) {
      return {
        ...base,
        classification: 'acceptable',
        matchedRule: 'MEAN_WITHIN_ACCEPTABLE',
        message: 'Ortalama eğim acceptable aralıktadır.',
      };
    }

    return {
      ...base,
      classification: 'limited',
      matchedRule: 'MEAN_ABOVE_ACCEPTABLE_BELOW_MAXIMUM',
      message: `Ortalama eğim (${mean}%) acceptable eşiğin üzerindedir.`,
    };
  }

  evaluateRuggedness(
    requirements: PhysicalRequirements,
    evidence: ParcelPhysicalEvidence,
  ): CompatibilityComponentResult {
    const req = requirements.ruggedness;
    if (evidence.terrainMock || !evidence.terrainReal || !evidence.terrain) {
      return {
        classification: 'unknown',
        importance: req.importance,
        observedValue: null,
        requirement: { ...req },
        source: evidence.terrainMock ? 'mock' : 'unavailable',
        sourceType: evidence.terrainMock ? 'mock' : 'unknown',
        confidence: evidence.terrainMock
          ? 'unusable_for_real_decision'
          : 'unknown',
        matchedRule: 'REAL_TERRAIN_RUGGEDNESS_UNAVAILABLE',
        message: 'Gerçek ruggedness yoktur; default low varsayılmaz.',
      };
    }

    const observed = evidence.terrain.ruggednessClass;
    if (
      observed == null ||
      observed === 'unknown' ||
      rankMissing(observed)
    ) {
      return {
        classification: 'unknown',
        importance: req.importance,
        observedValue: observed,
        requirement: { ...req },
        source: evidence.terrain.provider,
        sourceType: 'real_dem',
        confidence: 'low',
        matchedRule: 'RUGGEDNESS_UNKNOWN',
        message: 'Ruggedness sınıfı bilinmiyor.',
      };
    }

    const base = {
      importance: req.importance,
      observedValue: observed,
      requirement: { ...req },
      source: evidence.terrain.provider,
      sourceType: 'real_dem' as const,
      confidence: (evidence.terrain.spatialConfidence === 'high' ||
      evidence.terrain.spatialConfidence === 'medium'
        ? evidence.terrain.spatialConfidence
        : 'low') as CompatibilityComponentResult['confidence'],
    };

    if (isAtMost(ruggednessClassOrder, observed, req.preferredMaximumClass)) {
      return {
        ...base,
        classification: 'preferred',
        matchedRule: 'RUGGEDNESS_WITHIN_PREFERRED',
        message: `Ruggedness (${observed}) preferred maksimumun içinde.`,
      };
    }
    if (isAtMost(ruggednessClassOrder, observed, req.acceptableMaximumClass)) {
      return {
        ...base,
        classification: 'acceptable',
        matchedRule: 'RUGGEDNESS_WITHIN_ACCEPTABLE',
        message: `Ruggedness (${observed}) acceptable maksimumun içinde.`,
      };
    }
    return {
      ...base,
      classification: 'limited',
      matchedRule: 'RUGGEDNESS_ABOVE_ACCEPTABLE',
      message: `Ruggedness (${observed}) acceptable maksimumun üzerindedir.`,
    };
  }
}

function rankMissing(value: string): boolean {
  return ruggednessClassOrder.indexOf(value as never) < 0;
}
