/** Surface analysis calibration with safe defaults (v1.3+). */

export interface SurfaceCalibration {
  defaultMonths: number;
  minimumSuccessfulAcquisitions: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  minimumSeasonCoverageRatio: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  thresholds: {
    ndviBareMax: number;
    ndviVegetatedMin: number;
    bsiBareMin: number;
    ndmiDryMax: number;
    seasonalAmplitudeMin: number;
  };
  probableRock: {
    bareShareMin: number;
    highBsiShareMin: number;
    lowNdmiShareMin: number;
    weakCycleAmplitudeMax: number;
    mediumScoreMin: number;
    highScoreMin: number;
  };
  validationStatus: string;
  source: string;
}

export const DEFAULT_SURFACE_CALIBRATION: SurfaceCalibration = {
  defaultMonths: 12,
  minimumSuccessfulAcquisitions: {
    highConfidence: 10,
    mediumConfidence: 6,
    lowConfidence: 3,
  },
  minimumSeasonCoverageRatio: {
    highConfidence: 0.75,
    mediumConfidence: 0.5,
    lowConfidence: 0.25,
  },
  thresholds: {
    ndviBareMax: 0.25,
    ndviVegetatedMin: 0.4,
    bsiBareMin: 0.15,
    ndmiDryMax: 0.0,
    seasonalAmplitudeMin: 0.12,
  },
  probableRock: {
    bareShareMin: 0.55,
    highBsiShareMin: 0.45,
    lowNdmiShareMin: 0.5,
    weakCycleAmplitudeMax: 0.1,
    mediumScoreMin: 40,
    highScoreMin: 65,
  },
  validationStatus: 'unvalidated',
  source: 'initial-surface-calibration',
};

export function resolveSurfaceCalibration(
  surface?: Partial<SurfaceCalibration> | null,
): SurfaceCalibration {
  if (!surface) {
    return { ...DEFAULT_SURFACE_CALIBRATION };
  }
  return {
    defaultMonths: surface.defaultMonths ?? DEFAULT_SURFACE_CALIBRATION.defaultMonths,
    minimumSuccessfulAcquisitions: {
      ...DEFAULT_SURFACE_CALIBRATION.minimumSuccessfulAcquisitions,
      ...surface.minimumSuccessfulAcquisitions,
    },
    minimumSeasonCoverageRatio: {
      ...DEFAULT_SURFACE_CALIBRATION.minimumSeasonCoverageRatio,
      ...surface.minimumSeasonCoverageRatio,
    },
    thresholds: {
      ...DEFAULT_SURFACE_CALIBRATION.thresholds,
      ...surface.thresholds,
    },
    probableRock: {
      ...DEFAULT_SURFACE_CALIBRATION.probableRock,
      ...surface.probableRock,
    },
    validationStatus:
      surface.validationStatus ?? DEFAULT_SURFACE_CALIBRATION.validationStatus,
    source: surface.source ?? DEFAULT_SURFACE_CALIBRATION.source,
  };
}
