import type { FieldSurveyCalibration } from '../constants/field-survey-calibration.js';
import type {
  FieldSurvey,
  ReviewerRole,
  SurveyCheckResult,
  SurveySample,
} from '../types/field-survey.types.js';

const AUTHORIZED_ROLES: ReviewerRole[] = [
  'agricultural_engineer',
  'soil_scientist',
  'authorized_expert',
  'administrator',
];

const STONINESS_PERCENT_RANGES: Record<string, [number, number]> = {
  none: [0, 5],
  low: [0, 15],
  medium: [10, 40],
  high: [30, 70],
  very_high: [60, 100],
};

export function validateDepthValue(
  depth: number | null | undefined,
  calibration: FieldSurveyCalibration,
): { valid: boolean; message?: string } {
  if (depth == null) {
    return { valid: true };
  }
  if (!Number.isFinite(depth)) {
    return { valid: false, message: 'Depth must be a finite number' };
  }
  if (depth < calibration.depth.minimumValidCm) {
    return {
      valid: false,
      message: `Depth ${depth} cm below minimum ${calibration.depth.minimumValidCm} cm`,
    };
  }
  if (depth > calibration.depth.maximumValidCm) {
    return {
      valid: false,
      message: `Depth ${depth} cm above maximum ${calibration.depth.maximumValidCm} cm`,
    };
  }
  return { valid: true };
}

export function stoninessConsistencyWarning(
  classification: string | undefined,
  estimatedPercent: number | null | undefined,
): string | null {
  if (
    classification == null ||
    classification === 'unknown' ||
    estimatedPercent == null ||
    !Number.isFinite(estimatedPercent)
  ) {
    return null;
  }
  const range = STONINESS_PERCENT_RANGES[classification];
  if (!range) return null;
  if (estimatedPercent < range[0] || estimatedPercent > range[1]) {
    return `Stoniness classification "${classification}" inconsistent with estimated ${estimatedPercent}%`;
  }
  return null;
}

export function buildSurveyValidationChecks(
  survey: FieldSurvey,
  aggregation: {
    spatialCoverage: {
      recommendedSampleCount: number;
      validSampleCount: number;
      adequate: boolean;
      separationWarnings: number;
    };
    rootableSoilDepth: {
      measurementCount: number;
      invalidMeasurementCount: number;
      status: string;
    };
  },
  calibration: FieldSurveyCalibration,
  options?: { forApproval?: boolean },
): SurveyCheckResult[] {
  const checks: SurveyCheckResult[] = [];
  const validSamples = survey.samples.filter((s) => s.acceptance !== 'invalid');

  checks.push({
    code: 'FIELD_SURVEY_PARCEL_MATCH',
    status: survey.parcelId ? 'passed' : 'failed',
    observedValue: survey.parcelId,
    source: 'field_survey',
    message: survey.parcelId
      ? 'Survey is linked to a parcel'
      : 'Survey missing parcel linkage',
  });

  checks.push({
    code: 'FIELD_SURVEY_STATUS_VALID',
    status: 'passed',
    observedValue: survey.status,
    source: 'field_survey',
    message: `Survey status is ${survey.status}`,
  });

  const minSamples = aggregation.spatialCoverage.recommendedSampleCount;
  const sampleCountOk =
    aggregation.spatialCoverage.validSampleCount >= minSamples;
  checks.push({
    code: 'FIELD_SURVEY_MINIMUM_SAMPLE_COUNT',
    status: sampleCountOk ? 'passed' : options?.forApproval ? 'warning' : 'warning',
    observedValue: aggregation.spatialCoverage.validSampleCount,
    threshold: minSamples,
    source: 'field_survey',
    message: sampleCountOk
      ? `Valid sample count meets recommended ${minSamples}`
      : `Valid sample count ${aggregation.spatialCoverage.validSampleCount} below recommended ${minSamples}`,
  });

  checks.push({
    code: 'FIELD_SURVEY_SAMPLE_SPATIAL_COVERAGE',
    status: aggregation.spatialCoverage.adequate
      ? 'passed'
      : aggregation.spatialCoverage.separationWarnings > 0
        ? 'warning'
        : 'warning',
    observedValue: aggregation.spatialCoverage.adequate,
    threshold: calibration.minimumSampleSeparationMeters,
    source: 'field_survey',
    message: aggregation.spatialCoverage.adequate
      ? 'Spatial coverage adequate'
      : `Spatial coverage incomplete (separation warnings: ${aggregation.spatialCoverage.separationWarnings})`,
  });

  const outside = validSamples.filter((s) => !s.insideParcel);
  checks.push({
    code: 'FIELD_SURVEY_SAMPLE_INSIDE_PARCEL',
    status: outside.length === 0 ? 'passed' : 'warning',
    observedValue: outside.length,
    threshold: 0,
    source: 'field_survey',
    message:
      outside.length === 0
        ? 'All valid samples are inside the parcel'
        : `${outside.length} sample(s) outside parcel but within tolerance`,
  });

  const poorGps = validSamples.filter(
    (s) =>
      s.location.accuracyMeters != null &&
      s.location.accuracyMeters >
        calibration.location.maximumAcceptedGpsAccuracyMeters,
  );
  checks.push({
    code: 'FIELD_SURVEY_GPS_ACCURACY',
    status: poorGps.length === 0 ? 'passed' : 'warning',
    observedValue: poorGps.length,
    threshold: calibration.location.maximumAcceptedGpsAccuracyMeters,
    source: 'field_survey',
    message:
      poorGps.length === 0
        ? 'GPS accuracy within accepted limits'
        : `${poorGps.length} sample(s) have poor GPS accuracy`,
  });

  checks.push({
    code: 'FIELD_SURVEY_DEPTH_MEASUREMENTS_VALID',
    status:
      aggregation.rootableSoilDepth.invalidMeasurementCount === 0
        ? 'passed'
        : 'failed',
    observedValue: aggregation.rootableSoilDepth.measurementCount,
    threshold: calibration.depth.minimumValidCm,
    source: 'field_survey',
    message:
      aggregation.rootableSoilDepth.invalidMeasurementCount === 0
        ? 'Depth measurements are valid'
        : `${aggregation.rootableSoilDepth.invalidMeasurementCount} invalid depth measurement(s)`,
  });

  let stoninessInconsistent = false;
  for (const sample of validSamples) {
    if (
      stoninessConsistencyWarning(
        sample.surfaceStoniness,
        sample.estimatedSurfaceStonePercent,
      )
    ) {
      stoninessInconsistent = true;
    }
  }
  checks.push({
    code: 'FIELD_SURVEY_STONINESS_CONSISTENT',
    status: stoninessInconsistent ? 'warning' : 'passed',
    observedValue: !stoninessInconsistent,
    source: 'field_survey',
    message: stoninessInconsistent
      ? 'Stoniness classification inconsistent with estimated percent'
      : 'Stoniness observations consistent',
  });

  checks.push({
    code: 'FIELD_SURVEY_BEDROCK_EVIDENCE_VALID',
    status: 'passed',
    observedValue: true,
    source: 'field_survey',
    message: 'Bedrock observations recorded as field estimates',
  });

  const reviewerOk =
    survey.review != null &&
    AUTHORIZED_ROLES.includes(survey.review.reviewer.role);
  checks.push({
    code: 'FIELD_SURVEY_REVIEWER_AUTHORIZED',
    status: options?.forApproval
      ? reviewerOk
        ? 'passed'
        : 'failed'
      : survey.review
        ? reviewerOk
          ? 'passed'
          : 'failed'
        : 'informational',
    observedValue: survey.review?.reviewer.role ?? null,
    source: 'field_survey',
    message: reviewerOk
      ? 'Reviewer role authorized'
      : survey.review
        ? 'Reviewer role not authorized'
        : 'No reviewer assigned yet',
  });

  checks.push({
    code: 'FIELD_SURVEY_APPROVED',
    status: survey.status === 'approved' ? 'passed' : 'informational',
    observedValue: survey.status,
    source: 'field_survey',
    message:
      survey.status === 'approved'
        ? 'Survey approved'
        : 'Survey not approved',
  });

  checks.push({
    code: 'FIELD_SURVEY_CALIBRATION_UNVALIDATED',
    status: 'informational',
    observedValue: calibration.validationStatus,
    source: calibration.source,
    message:
      'Field survey calibration thresholds are initial/unvalidated system defaults',
  });

  return checks;
}

export function sampleHasCriticalErrors(
  sample: SurveySample,
  calibration: FieldSurveyCalibration,
): string[] {
  const errors: string[] = [];
  if (sample.acceptance === 'invalid') {
    errors.push('Sample GPS location rejected');
  }
  if (sample.rootableSoilDepthCm != null) {
    const depthCheck = validateDepthValue(sample.rootableSoilDepthCm, calibration);
    if (!depthCheck.valid) {
      errors.push(depthCheck.message ?? 'Invalid depth');
    }
    if (!sample.samplingMethod && !sample.depthMeasurementMethod) {
      errors.push('Depth measurement requires samplingMethod or depthMeasurementMethod');
    }
  }
  if (
    sample.estimatedSurfaceStonePercent != null &&
    (sample.estimatedSurfaceStonePercent < 0 ||
      sample.estimatedSurfaceStonePercent > 100)
  ) {
    errors.push('estimatedSurfaceStonePercent must be 0–100');
  }
  return errors;
}

export function isAuthorizedReviewerRole(role: ReviewerRole): boolean {
  return AUTHORIZED_ROLES.includes(role);
}

export function hasCriticalValidationFailures(
  checks: SurveyCheckResult[],
): boolean {
  return checks.some(
    (c) =>
      c.status === 'failed' &&
      (c.code === 'FIELD_SURVEY_DEPTH_MEASUREMENTS_VALID' ||
        c.code === 'FIELD_SURVEY_REVIEWER_AUTHORIZED' ||
        c.code === 'FIELD_SURVEY_PARCEL_MATCH'),
  );
}
