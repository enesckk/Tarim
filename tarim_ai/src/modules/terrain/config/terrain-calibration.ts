/** Terrain calibration slice with safe defaults when profile omits terrain. */

export interface TerrainCalibration {
  demResolutionMeters: number;
  slopeClassesPercent: {
    flatMax: number;
    gentleMax: number;
    moderateMax: number;
    steepMax: number;
  };
  minimumDemPixels: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  minimumCoverageRatio: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  /** Additive v1.6 coverage thresholds (optional; fallback derived). */
  dem?: {
    preferredDataset?: string;
    requestedResolutionMeters?: number;
    minimumRasterWidth?: number;
    minimumRasterHeight?: number;
    minimumValidPixelRatio?: number;
    adequateValidPixelRatio?: number;
    completeValidPixelRatio?: number;
  };
  ruggednessThresholds: {
    veryLowMax?: number;
    lowMax: number;
    mediumMax: number;
    highMax: number;
  };
  mechanization: {
    steepAreaWarningPercent: number;
    verySteepAreaWarningPercent: number;
    strongLimitationMeanSlopePercent: number;
    suitableMaximumMeanSlopePercent?: number;
    generallySuitableMaximumMeanSlopePercent?: number;
    limitedMaximumMeanSlopePercent?: number;
  };
  cache?: {
    ttlSeconds?: number;
  };
  validationStatus: string;
  source: string;
}

export const DEFAULT_TERRAIN_CALIBRATION: TerrainCalibration = {
  demResolutionMeters: 30,
  slopeClassesPercent: {
    flatMax: 5,
    gentleMax: 12,
    moderateMax: 20,
    steepMax: 35,
  },
  minimumDemPixels: {
    highConfidence: 20,
    mediumConfidence: 8,
    lowConfidence: 3,
  },
  minimumCoverageRatio: {
    highConfidence: 0.8,
    mediumConfidence: 0.5,
    lowConfidence: 0.25,
  },
  dem: {
    preferredDataset: 'COPERNICUS_30',
    requestedResolutionMeters: 30,
    minimumRasterWidth: 3,
    minimumRasterHeight: 3,
    minimumValidPixelRatio: 0.7,
    adequateValidPixelRatio: 0.85,
    completeValidPixelRatio: 0.95,
  },
  ruggednessThresholds: {
    veryLowMax: 1.5,
    lowMax: 3,
    mediumMax: 7,
    highMax: 14,
  },
  mechanization: {
    steepAreaWarningPercent: 15,
    verySteepAreaWarningPercent: 5,
    strongLimitationMeanSlopePercent: 35,
    suitableMaximumMeanSlopePercent: 8,
    generallySuitableMaximumMeanSlopePercent: 15,
    limitedMaximumMeanSlopePercent: 30,
  },
  cache: {
    ttlSeconds: 86_400,
  },
  validationStatus: 'unvalidated',
  source: 'initial-system-calibration',
};

export function resolveTerrainCalibration(
  terrain?: Partial<TerrainCalibration> | null,
): TerrainCalibration {
  if (!terrain) {
    return structuredClone(DEFAULT_TERRAIN_CALIBRATION);
  }
  return {
    demResolutionMeters:
      terrain.demResolutionMeters ?? DEFAULT_TERRAIN_CALIBRATION.demResolutionMeters,
    slopeClassesPercent: {
      ...DEFAULT_TERRAIN_CALIBRATION.slopeClassesPercent,
      ...terrain.slopeClassesPercent,
    },
    minimumDemPixels: {
      ...DEFAULT_TERRAIN_CALIBRATION.minimumDemPixels,
      ...terrain.minimumDemPixels,
    },
    minimumCoverageRatio: {
      ...DEFAULT_TERRAIN_CALIBRATION.minimumCoverageRatio,
      ...terrain.minimumCoverageRatio,
    },
    dem: {
      ...DEFAULT_TERRAIN_CALIBRATION.dem,
      ...terrain.dem,
    },
    ruggednessThresholds: {
      ...DEFAULT_TERRAIN_CALIBRATION.ruggednessThresholds,
      ...terrain.ruggednessThresholds,
    },
    mechanization: {
      ...DEFAULT_TERRAIN_CALIBRATION.mechanization,
      ...terrain.mechanization,
    },
    cache: {
      ...DEFAULT_TERRAIN_CALIBRATION.cache,
      ...terrain.cache,
    },
    validationStatus:
      terrain.validationStatus ?? DEFAULT_TERRAIN_CALIBRATION.validationStatus,
    source: terrain.source ?? DEFAULT_TERRAIN_CALIBRATION.source,
  };
}
