/** Field survey calibration (v1.5+) with safe defaults. */

export interface FieldSurveySampleCountRule {
  maximumAreaSquareMeters: number | null;
  recommendedSamples: number;
}

export interface FieldSurveyCalibration {
  location: {
    highConfidenceMaxDistanceMeters: number;
    mediumConfidenceMaxDistanceMeters: number;
    lowConfidenceMaxDistanceMeters: number;
    maximumAcceptedGpsAccuracyMeters: number;
  };
  depth: {
    minimumValidCm: number;
    maximumValidCm: number;
  };
  sampleCountByArea: FieldSurveySampleCountRule[];
  minimumSampleSeparationMeters: number;
  depthConfidence: {
    highMinimumSamples: number;
    mediumMinimumSamples: number;
    lowMinimumSamples: number;
  };
  hardConstraints: {
    veryShallowMeanDepthCm: number;
    bedrockOutcropClass: string;
    machineAccessClass: string;
  };
  validationStatus: string;
  source: string;
}

export const DEFAULT_FIELD_SURVEY_CALIBRATION: FieldSurveyCalibration = {
  location: {
    highConfidenceMaxDistanceMeters: 10,
    mediumConfidenceMaxDistanceMeters: 30,
    lowConfidenceMaxDistanceMeters: 50,
    maximumAcceptedGpsAccuracyMeters: 30,
  },
  depth: {
    minimumValidCm: 1,
    maximumValidCm: 500,
  },
  sampleCountByArea: [
    { maximumAreaSquareMeters: 10_000, recommendedSamples: 3 },
    { maximumAreaSquareMeters: 50_000, recommendedSamples: 5 },
    { maximumAreaSquareMeters: 100_000, recommendedSamples: 8 },
    { maximumAreaSquareMeters: null, recommendedSamples: 10 },
  ],
  minimumSampleSeparationMeters: 20,
  depthConfidence: {
    highMinimumSamples: 8,
    mediumMinimumSamples: 5,
    lowMinimumSamples: 1,
  },
  hardConstraints: {
    veryShallowMeanDepthCm: 20,
    bedrockOutcropClass: 'extensive',
    machineAccessClass: 'impossible',
  },
  validationStatus: 'unvalidated',
  source: 'initial-system-calibration',
};

export function resolveFieldSurveyCalibration(
  fieldSurvey?: Partial<FieldSurveyCalibration> | null,
): FieldSurveyCalibration {
  if (!fieldSurvey) {
    return structuredClone(DEFAULT_FIELD_SURVEY_CALIBRATION);
  }
  return {
    location: {
      ...DEFAULT_FIELD_SURVEY_CALIBRATION.location,
      ...fieldSurvey.location,
    },
    depth: {
      ...DEFAULT_FIELD_SURVEY_CALIBRATION.depth,
      ...fieldSurvey.depth,
    },
    sampleCountByArea:
      fieldSurvey.sampleCountByArea ??
      DEFAULT_FIELD_SURVEY_CALIBRATION.sampleCountByArea,
    minimumSampleSeparationMeters:
      fieldSurvey.minimumSampleSeparationMeters ??
      DEFAULT_FIELD_SURVEY_CALIBRATION.minimumSampleSeparationMeters,
    depthConfidence: {
      ...DEFAULT_FIELD_SURVEY_CALIBRATION.depthConfidence,
      ...fieldSurvey.depthConfidence,
    },
    hardConstraints: {
      ...DEFAULT_FIELD_SURVEY_CALIBRATION.hardConstraints,
      ...fieldSurvey.hardConstraints,
    },
    validationStatus:
      fieldSurvey.validationStatus ??
      DEFAULT_FIELD_SURVEY_CALIBRATION.validationStatus,
    source: fieldSurvey.source ?? DEFAULT_FIELD_SURVEY_CALIBRATION.source,
  };
}

export function recommendedSampleCountForArea(
  areaSquareMeters: number | null | undefined,
  calibration: FieldSurveyCalibration,
): number {
  const area = areaSquareMeters ?? 0;
  for (const rule of calibration.sampleCountByArea) {
    if (rule.maximumAreaSquareMeters == null || area <= rule.maximumAreaSquareMeters) {
      return rule.recommendedSamples;
    }
  }
  return 10;
}
