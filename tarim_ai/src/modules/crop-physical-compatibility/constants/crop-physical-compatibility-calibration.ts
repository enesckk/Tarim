/** Crop physical compatibility calibration (v1.7+). */

export interface CropPhysicalCompatibilityCalibration {
  classification: {
    stronglyLimitedMinimumHighComponents: number;
    physicallyLimitedMinimumMediumComponents: number;
    criticalUnknownProducesCaution: boolean;
  };
  confidence: {
    highRequiresVerifiedFieldDepth: boolean;
    highRequiresRealTerrain: boolean;
    highRequiresCompleteCriticalRequirements: boolean;
    mediumMinimumReliableComponents: number;
    lowMinimumReliableComponents: number;
  };
  depth: {
    minimumSpatialCoverage: string;
    minimumMeasurementCountForMedium: number;
  };
  terrain: {
    minimumCoverageStatus: string;
    minimumConfidenceForLimitation: string;
  };
  validationStatus: string;
  source: string;
}

export const DEFAULT_CROP_PHYSICAL_COMPATIBILITY_CALIBRATION: CropPhysicalCompatibilityCalibration =
  {
    classification: {
      stronglyLimitedMinimumHighComponents: 1,
      physicallyLimitedMinimumMediumComponents: 2,
      criticalUnknownProducesCaution: true,
    },
    confidence: {
      highRequiresVerifiedFieldDepth: true,
      highRequiresRealTerrain: true,
      highRequiresCompleteCriticalRequirements: true,
      mediumMinimumReliableComponents: 4,
      lowMinimumReliableComponents: 2,
    },
    depth: {
      minimumSpatialCoverage: 'adequate',
      minimumMeasurementCountForMedium: 5,
    },
    terrain: {
      minimumCoverageStatus: 'adequate',
      minimumConfidenceForLimitation: 'medium',
    },
    validationStatus: 'unvalidated',
    source: 'initial-system-calibration',
  };

export function resolveCropPhysicalCompatibilityCalibration(
  block?: Partial<CropPhysicalCompatibilityCalibration> | null,
): CropPhysicalCompatibilityCalibration {
  if (!block) {
    return structuredClone(DEFAULT_CROP_PHYSICAL_COMPATIBILITY_CALIBRATION);
  }
  return {
    classification: {
      ...DEFAULT_CROP_PHYSICAL_COMPATIBILITY_CALIBRATION.classification,
      ...block.classification,
    },
    confidence: {
      ...DEFAULT_CROP_PHYSICAL_COMPATIBILITY_CALIBRATION.confidence,
      ...block.confidence,
    },
    depth: {
      ...DEFAULT_CROP_PHYSICAL_COMPATIBILITY_CALIBRATION.depth,
      ...block.depth,
    },
    terrain: {
      ...DEFAULT_CROP_PHYSICAL_COMPATIBILITY_CALIBRATION.terrain,
      ...block.terrain,
    },
    validationStatus:
      block.validationStatus ??
      DEFAULT_CROP_PHYSICAL_COMPATIBILITY_CALIBRATION.validationStatus,
    source: block.source ?? DEFAULT_CROP_PHYSICAL_COMPATIBILITY_CALIBRATION.source,
  };
}
