/** Land usability calibration (v1.4+) with safe defaults. */

export interface LandUsabilityCalibration {
  minimumRealEvidenceCount: number;
  fieldDepth: {
    minimumValidCm: number;
    maximumValidCm: number;
    recommendedSampleCount: number;
    highConfidenceSampleCount: number;
    mediumConfidenceSampleCount: number;
    lowConfidenceSampleCount: number;
  };
  hardConstraints: {
    veryShallowMeanDepthCm: number;
    strongSlopeMeanPercent: number;
    strongSlopeP90Percent: number;
  };
  rockSignal: {
    fieldVerificationMinimumClass: string;
    routineCheckMaximumClass: string;
  };
  confidence: {
    highRequiresRealTerrain: boolean;
    highRequiresVerifiedDepth: boolean;
    mediumMinimumRealSources: number;
    lowMinimumRealSources: number;
  };
  validationStatus: string;
  source: string;
}

export const DEFAULT_LAND_USABILITY_CALIBRATION: LandUsabilityCalibration = {
  minimumRealEvidenceCount: 1,
  fieldDepth: {
    minimumValidCm: 1,
    maximumValidCm: 500,
    recommendedSampleCount: 5,
    highConfidenceSampleCount: 8,
    mediumConfidenceSampleCount: 5,
    lowConfidenceSampleCount: 1,
  },
  hardConstraints: {
    veryShallowMeanDepthCm: 20,
    strongSlopeMeanPercent: 35,
    strongSlopeP90Percent: 45,
  },
  rockSignal: {
    fieldVerificationMinimumClass: 'medium_high',
    routineCheckMaximumClass: 'medium',
  },
  confidence: {
    highRequiresRealTerrain: true,
    highRequiresVerifiedDepth: true,
    mediumMinimumRealSources: 2,
    lowMinimumRealSources: 1,
  },
  validationStatus: 'unvalidated',
  source: 'initial-system-calibration',
};

export function resolveLandUsabilityCalibration(
  landUsability?: Partial<LandUsabilityCalibration> | null,
): LandUsabilityCalibration {
  if (!landUsability) {
    return { ...DEFAULT_LAND_USABILITY_CALIBRATION };
  }
  return {
    minimumRealEvidenceCount:
      landUsability.minimumRealEvidenceCount ??
      DEFAULT_LAND_USABILITY_CALIBRATION.minimumRealEvidenceCount,
    fieldDepth: {
      ...DEFAULT_LAND_USABILITY_CALIBRATION.fieldDepth,
      ...landUsability.fieldDepth,
    },
    hardConstraints: {
      ...DEFAULT_LAND_USABILITY_CALIBRATION.hardConstraints,
      ...landUsability.hardConstraints,
    },
    rockSignal: {
      ...DEFAULT_LAND_USABILITY_CALIBRATION.rockSignal,
      ...landUsability.rockSignal,
    },
    confidence: {
      ...DEFAULT_LAND_USABILITY_CALIBRATION.confidence,
      ...landUsability.confidence,
    },
    validationStatus:
      landUsability.validationStatus ??
      DEFAULT_LAND_USABILITY_CALIBRATION.validationStatus,
    source: landUsability.source ?? DEFAULT_LAND_USABILITY_CALIBRATION.source,
  };
}
