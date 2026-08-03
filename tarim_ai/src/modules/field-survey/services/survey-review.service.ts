import type { FieldSurveyCalibration } from '../constants/field-survey-calibration.js';
import type {
  FieldSurvey,
  ReviewerRole,
  SurveyReview,
} from '../types/field-survey.types.js';
import { ApiError } from '../../../utils/api-error.js';
import { aggregateSurvey } from './survey-aggregation.service.js';
import {
  buildSurveyValidationChecks,
  hasCriticalValidationFailures,
  isAuthorizedReviewerRole,
} from './survey-validation.service.js';

export interface ReviewerInput {
  id: string;
  name: string;
  role: ReviewerRole;
}

export class SurveyReviewService {
  assertCanApprove(
    survey: FieldSurvey,
    reviewer: ReviewerInput,
    areaSquareMeters: number | null | undefined,
    calibration: FieldSurveyCalibration,
  ): SurveyReview {
    if (survey.status !== 'submitted' && survey.status !== 'under_review') {
      throw new ApiError(
        409,
        `Cannot approve survey in status ${survey.status}`,
        { code: 'FIELD_SURVEY_STATUS_VALID' },
      );
    }

    if (!isAuthorizedReviewerRole(reviewer.role)) {
      throw new ApiError(403, 'Reviewer role not authorized', {
        code: 'FIELD_SURVEY_REVIEWER_AUTHORIZED',
      });
    }

    const validSamples = survey.samples.filter((s) => s.acceptance !== 'invalid');
    if (validSamples.length < 1) {
      throw new ApiError(400, 'Approval requires at least one valid sample', {
        code: 'FIELD_SURVEY_MINIMUM_SAMPLE_COUNT',
      });
    }

    if (!survey.parcelId) {
      throw new ApiError(400, 'Approval requires parcel match', {
        code: 'FIELD_SURVEY_PARCEL_MATCH',
      });
    }

    const aggregation = aggregateSurvey(survey, areaSquareMeters, calibration);
    const qualityChecks = buildSurveyValidationChecks(
      survey,
      aggregation,
      calibration,
      { forApproval: true },
    ).map((c) => ({
      code: c.code,
      status: c.status,
      message: c.message,
    }));

    const draftReview: SurveyReview = {
      reviewer,
      decision: 'approved',
      reviewedAt: new Date().toISOString(),
      qualityChecks,
    };

    const surveyWithReview = { ...survey, review: draftReview };
    const checks = buildSurveyValidationChecks(
      surveyWithReview,
      aggregation,
      calibration,
      { forApproval: true },
    );
    if (hasCriticalValidationFailures(checks)) {
      throw new ApiError(400, 'Critical validation failures prevent approval', {
        code: 'FIELD_SURVEY_APPROVED',
        checks,
      });
    }

    return {
      ...draftReview,
      qualityChecks: checks.map((c) => ({
        code: c.code,
        status: c.status,
        message: c.message,
      })),
    };
  }

  assertCanReject(
    survey: FieldSurvey,
    reviewer: ReviewerInput,
  ): SurveyReview {
    if (survey.status !== 'submitted' && survey.status !== 'under_review') {
      throw new ApiError(
        409,
        `Cannot reject survey in status ${survey.status}`,
        { code: 'FIELD_SURVEY_STATUS_VALID' },
      );
    }
    if (!isAuthorizedReviewerRole(reviewer.role)) {
      throw new ApiError(403, 'Reviewer role not authorized', {
        code: 'FIELD_SURVEY_REVIEWER_AUTHORIZED',
      });
    }
    return {
      reviewer,
      decision: 'rejected',
      reviewedAt: new Date().toISOString(),
      qualityChecks: [],
    };
  }
}
