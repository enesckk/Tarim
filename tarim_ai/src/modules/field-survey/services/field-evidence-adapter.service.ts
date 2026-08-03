import type { FieldEvidenceInput } from '../../land-usability/types/land-usability.types.js';
import { aggregateSurvey } from './survey-aggregation.service.js';
import type { FieldSurveyCalibration } from '../constants/field-survey-calibration.js';
import type {
  BedrockOutcropClass,
  FieldSurvey,
  MachineAccessClass,
  NormalizedFieldEvidence,
  SurfaceStoninessClass,
} from '../types/field-survey.types.js';

function mapStoninessForLu(
  value: SurfaceStoninessClass | 'unknown',
): FieldEvidenceInput['surfaceStoniness'] {
  if (value === 'very_high') return 'high';
  if (value === 'unknown') return 'unknown';
  return value;
}

function mapBedrockForLu(
  value: BedrockOutcropClass | 'unknown',
): FieldEvidenceInput['bedrockOutcrop'] {
  if (value === 'extensive') return 'extensive';
  if (value === 'not_observed') return 'not_observed';
  if (value === 'unknown') return 'unknown';
  // isolated / scattered / frequent → sparse for LU hard-constraint model
  return 'sparse';
}

function mapMachineAccessForLu(
  value: MachineAccessClass | 'unknown',
): FieldEvidenceInput['machineAccess'] {
  if (value === 'impossible') return 'impossible';
  if (value === 'verified_accessible') return 'verified';
  if (value === 'unknown') return 'unknown';
  return 'limited';
}

export type FieldEvidenceDisposition =
  | { disposition: 'usable'; evidence: NormalizedFieldEvidence; fieldEvidence: FieldEvidenceInput }
  | {
      disposition: 'pending' | 'ignored';
      reason: string;
      surveyId: string;
      status: string;
    };

export class FieldEvidenceAdapterService {
  toNormalized(
    survey: FieldSurvey,
    areaSquareMeters: number | null | undefined,
    calibration: FieldSurveyCalibration,
  ): NormalizedFieldEvidence | null {
    if (survey.status !== 'approved') {
      return null;
    }
    const agg = aggregateSurvey(survey, areaSquareMeters, calibration);
    const measurements = survey.samples
      .filter((s) => s.acceptance !== 'invalid')
      .map((s) => s.rootableSoilDepthCm)
      .filter(
        (d): d is number =>
          d != null &&
          Number.isFinite(d) &&
          d >= calibration.depth.minimumValidCm &&
          d <= calibration.depth.maximumValidCm,
      );

    return {
      surveyId: survey.id,
      approved: true,
      surveyDate: survey.surveyDate,
      approvedAt: survey.approvedAt ?? survey.updatedAt,
      rootableSoilDepth: {
        verified: agg.rootableSoilDepth.status === 'verified',
        minimumCm: agg.rootableSoilDepth.minimumCm,
        maximumCm: agg.rootableSoilDepth.maximumCm,
        meanCm: agg.rootableSoilDepth.meanCm,
        medianCm: agg.rootableSoilDepth.medianCm,
        measurementCount: agg.rootableSoilDepth.measurementCount,
        confidence: agg.rootableSoilDepth.confidence,
        measurementsCm: measurements,
      },
      surfaceStoniness: {
        classification:
          (agg.surfaceStoniness.dominant as SurfaceStoninessClass) || 'unknown',
        confidence: agg.surfaceStoniness.confidence,
      },
      bedrockOutcrop: {
        classification:
          (agg.bedrockOutcrop.worst as BedrockOutcropClass) || 'unknown',
        confidence: agg.bedrockOutcrop.confidence,
      },
      machineAccess: {
        classification: agg.machineAccess.classification as MachineAccessClass,
        confidence: agg.machineAccess.confidence,
      },
      drainage: {
        classification: agg.drainage.dominant,
        confidence: 'medium',
      },
    };
  }

  toFieldEvidenceInput(
    normalized: NormalizedFieldEvidence,
  ): FieldEvidenceInput {
    return {
      rootableSoilDepthMeasurementsCm: normalized.rootableSoilDepth.measurementsCm,
      surfaceStoniness: mapStoninessForLu(normalized.surfaceStoniness.classification),
      bedrockOutcrop: mapBedrockForLu(normalized.bedrockOutcrop.classification),
      machineAccess: mapMachineAccessForLu(normalized.machineAccess.classification),
      drainageObservation:
        normalized.drainage.classification === 'unknown'
          ? 'unknown'
          : normalized.drainage.classification,
      sourceDate: normalized.surveyDate,
      surveyId: normalized.surveyId,
    };
  }

  resolveDisposition(
    survey: FieldSurvey | null,
    areaSquareMeters: number | null | undefined,
    calibration: FieldSurveyCalibration,
  ): FieldEvidenceDisposition {
    if (!survey) {
      return {
        disposition: 'ignored',
        reason: 'No field survey provided',
        surveyId: '',
        status: 'none',
      };
    }
    if (survey.status === 'approved') {
      const evidence = this.toNormalized(survey, areaSquareMeters, calibration)!;
      return {
        disposition: 'usable',
        evidence,
        fieldEvidence: this.toFieldEvidenceInput(evidence),
      };
    }
    if (survey.status === 'submitted' || survey.status === 'under_review') {
      return {
        disposition: 'pending',
        reason: `Survey status ${survey.status} is not approved`,
        surveyId: survey.id,
        status: survey.status,
      };
    }
    if (survey.status === 'rejected') {
      return {
        disposition: 'ignored',
        reason: survey.rejectionReason ?? 'Survey rejected',
        surveyId: survey.id,
        status: survey.status,
      };
    }
    if (survey.status === 'archived') {
      return {
        disposition: 'ignored',
        reason: 'Archived survey is not used for new analysis by default',
        surveyId: survey.id,
        status: survey.status,
      };
    }
    return {
      disposition: 'ignored',
      reason: `Survey status ${survey.status} ignored for land usability`,
      surveyId: survey.id,
      status: survey.status,
    };
  }
}
