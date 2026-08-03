import type { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import type { ParcelQuery } from '../../parcel/types/parcel.types.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import { ApiError } from '../../../utils/api-error.js';
import { currentPersistenceMeta } from '../../database/persistence-factory.js';
import {
  resolveFieldSurveyCalibration,
  type FieldSurveyCalibration,
} from '../constants/field-survey-calibration.js';
import type { FieldSurveyRepository } from '../repositories/field-survey.repository.js';
import type {
  FieldSurvey,
  ParcelObservations,
  ParcelReference,
  PhotoCategory,
  SurveyStatus,
  SurveyorInfo,
} from '../types/field-survey.types.js';
import { SURVEY_TRANSITIONS } from '../types/field-survey.types.js';
import { createId } from '../utils/id.utils.js';
import { FieldSurveyAuditService } from './field-survey-audit.service.js';
import { FieldEvidenceAdapterService } from './field-evidence-adapter.service.js';
import { aggregateSurvey } from './survey-aggregation.service.js';
import {
  SurveySampleService,
  type AddSampleInput,
} from './survey-sample.service.js';
import {
  SurveyReviewService,
  type ReviewerInput,
} from './survey-review.service.js';
import { buildSurveyValidationChecks } from './survey-validation.service.js';

export function buildParcelId(ref: ParcelReference): string {
  return [
    ref.province,
    ref.district,
    ref.neighborhood,
    ref.block,
    ref.parcel,
  ]
    .map((s) => s.toLocaleLowerCase('tr-TR').trim())
    .join('|');
}

export interface CreateSurveyInput {
  parcelQuery: ParcelQuery;
  surveyDate: string;
  surveyor: SurveyorInfo;
  weatherConditions?: FieldSurvey['weatherConditions'];
  notes?: string[];
  parcelObservations?: ParcelObservations;
  previousSurveyId?: string | null;
  actorId?: string;
}

export interface PatchSurveyInput {
  weatherConditions?: FieldSurvey['weatherConditions'];
  notes?: string[];
  parcelObservations?: ParcelObservations;
  surveyDate?: string;
  photos?: Array<{
    fileReference: string;
    sampleId?: string | null;
    caption?: string;
    takenAt?: string;
    location?: { latitude: number; longitude: number };
    category: PhotoCategory;
  }>;
  actorId?: string;
}

export class FieldSurveyService {
  private readonly sampleService = new SurveySampleService();
  private readonly reviewService = new SurveyReviewService();
  private readonly auditService = new FieldSurveyAuditService();
  readonly evidenceAdapter = new FieldEvidenceAdapterService();

  constructor(
    private readonly repository: FieldSurveyRepository,
    private readonly parcelQueryService: ParcelQueryService,
    private readonly calibrationService = new ScoreCalibrationService(),
  ) {}

  getCalibration(): FieldSurveyCalibration {
    return resolveFieldSurveyCalibration(
      this.calibrationService.getProfile().fieldSurvey,
    );
  }

  async create(input: CreateSurveyInput): Promise<FieldSurvey> {
    const resolved = await this.parcelQueryService.resolve(input.parcelQuery);
    const parcelReference: ParcelReference = {
      province: resolved.parcel.province,
      district: resolved.parcel.district,
      neighborhood: resolved.parcel.neighborhood,
      block: resolved.parcel.block,
      parcel: resolved.parcel.parcel,
    };
    const now = new Date().toISOString();
    let revisionNumber = 1;
    if (input.previousSurveyId) {
      const prev = await this.repository.findById(input.previousSurveyId);
      if (prev) {
        revisionNumber = prev.revisionNumber + 1;
      }
    }

    let survey: FieldSurvey = {
      id: createId(),
      parcelId: buildParcelId(parcelReference),
      parcelReference,
      status: 'draft',
      surveyDate: input.surveyDate,
      surveyor: input.surveyor,
      weatherConditions: input.weatherConditions,
      samples: [],
      parcelObservations: input.parcelObservations ?? {},
      photos: [],
      notes: input.notes ?? [],
      review: null,
      revisionNumber,
      previousSurveyId: input.previousSurveyId ?? null,
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      rejectionReason: null,
      audit: { events: [] },
    };

    survey = this.auditService.created(survey, input.actorId);
    return this.repository.create(survey);
  }

  async getById(id: string): Promise<FieldSurvey> {
    const survey = await this.repository.findById(id);
    if (!survey) {
      throw new ApiError(404, `Field survey not found: ${id}`);
    }
    return survey;
  }

  async listByParcelQuery(query: ParcelQuery): Promise<FieldSurvey[]> {
    const parcelId = buildParcelId(query);
    return this.repository.listByParcelId(parcelId);
  }

  async patch(id: string, input: PatchSurveyInput): Promise<FieldSurvey> {
    let survey = await this.getById(id);
    this.assertEditable(survey);

    if (input.weatherConditions !== undefined) {
      survey.weatherConditions = input.weatherConditions;
    }
    if (input.notes !== undefined) {
      survey.notes = input.notes;
    }
    if (input.parcelObservations !== undefined) {
      survey.parcelObservations = {
        ...survey.parcelObservations,
        ...input.parcelObservations,
      };
    }
    if (input.surveyDate !== undefined) {
      survey.surveyDate = input.surveyDate;
    }
    if (input.photos !== undefined) {
      survey.photos = input.photos.map((p) => ({
        id: createId(),
        sampleId: p.sampleId ?? null,
        fileReference: p.fileReference,
        caption: p.caption,
        takenAt: p.takenAt,
        location: p.location,
        category: p.category,
      }));
    }

    survey.updatedAt = new Date().toISOString();
    survey = this.auditService.updated(survey, input.actorId);
    return this.repository.update(survey);
  }

  async addSample(id: string, input: AddSampleInput): Promise<FieldSurvey> {
    let survey = await this.getById(id);
    this.assertEditable(survey);

    const resolved = await this.parcelQueryService.resolve(survey.parcelReference);
    const sample = this.sampleService.createSample(
      input,
      survey.samples.length + 1,
      resolved.parcel.geometry,
      this.getCalibration(),
    );

    survey = {
      ...survey,
      samples: [...survey.samples, sample],
      updatedAt: new Date().toISOString(),
    };
    survey = this.auditService.sampleAdded(survey, sample.id);
    return this.repository.update(survey);
  }

  async submit(id: string, actorId?: string): Promise<FieldSurvey> {
    return this.transition(id, 'submitted', (survey) =>
      this.auditService.submitted(survey, actorId),
    );
  }

  async startReview(id: string, actorId?: string): Promise<FieldSurvey> {
    return this.transition(id, 'under_review', (survey) =>
      this.auditService.reviewStarted(survey, actorId),
    );
  }

  async approve(
    id: string,
    reviewer: ReviewerInput,
    comments?: string,
  ): Promise<FieldSurvey> {
    let survey = await this.getById(id);
    const resolved = await this.parcelQueryService.resolve(survey.parcelReference);
    const review = this.reviewService.assertCanApprove(
      survey,
      reviewer,
      resolved.parcel.areaSquareMeters,
      this.getCalibration(),
    );
    if (comments) {
      review.comments = comments;
    }

    // Ensure under_review if coming from submitted
    if (survey.status === 'submitted') {
      this.assertTransition(survey.status, 'under_review');
      survey = { ...survey, status: 'under_review' };
    }
    this.assertTransition(survey.status, 'approved');

    const now = new Date().toISOString();
    survey = {
      ...survey,
      status: 'approved',
      review,
      approvedAt: now,
      updatedAt: now,
      rejectionReason: null,
    };
    survey = this.auditService.approved(survey, reviewer.id);
    return this.repository.update(survey);
  }

  async reject(
    id: string,
    reviewer: ReviewerInput,
    reason: string,
  ): Promise<FieldSurvey> {
    let survey = await this.getById(id);
    const review = this.reviewService.assertCanReject(survey, reviewer);
    review.comments = reason;

    if (survey.status === 'submitted') {
      this.assertTransition(survey.status, 'under_review');
      survey = { ...survey, status: 'under_review' };
    }
    this.assertTransition(survey.status, 'rejected');

    survey = {
      ...survey,
      status: 'rejected',
      review,
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };
    survey = this.auditService.rejected(survey, reviewer.id);
    return this.repository.update(survey);
  }

  async archive(id: string, actorId?: string): Promise<FieldSurvey> {
    return this.transition(id, 'archived', (survey) =>
      this.auditService.archived(survey, actorId),
    );
  }

  async getSummary(id: string) {
    const survey = await this.getById(id);
    const resolved = await this.parcelQueryService.resolve(survey.parcelReference);
    const calibration = this.getCalibration();
    const aggregation = aggregateSurvey(
      survey,
      resolved.parcel.areaSquareMeters,
      calibration,
    );
    const validation = buildSurveyValidationChecks(
      survey,
      aggregation,
      calibration,
    );
    const disposition = this.evidenceAdapter.resolveDisposition(
      survey,
      resolved.parcel.areaSquareMeters,
      calibration,
    );

    return {
      survey,
      aggregation,
      validation,
      fieldEvidenceDisposition: disposition,
      repositoryType: currentPersistenceMeta().repositoryType,
      persistence: currentPersistenceMeta().type,
      persistenceMeta: currentPersistenceMeta(),
    };
  }

  async resolveForLandUsability(options: {
    parcelQuery: ParcelQuery;
    fieldSurveyId?: string;
    useLatestApprovedFieldSurvey?: boolean;
  }) {
    const parcelId = buildParcelId(options.parcelQuery);
    const calibration = this.getCalibration();
    const resolved = await this.parcelQueryService.resolve(options.parcelQuery);

    let survey: FieldSurvey | null = null;
    if (options.fieldSurveyId) {
      survey = await this.repository.findById(options.fieldSurveyId);
      if (!survey) {
        throw new ApiError(404, `Field survey not found: ${options.fieldSurveyId}`);
      }
      if (survey.parcelId !== parcelId) {
        throw new ApiError(400, 'Field survey does not match parcel', {
          code: 'FIELD_SURVEY_PARCEL_MATCH',
          surveyParcelId: survey.parcelId,
          requestedParcelId: parcelId,
        });
      }
      if (survey.status === 'archived' || survey.status === 'rejected') {
        throw new ApiError(
          400,
          `Field survey status ${survey.status} cannot be used for land usability analysis`,
          {
            code: 'FIELD_SURVEY_STATUS_VALID',
            status: survey.status,
            surveyId: survey.id,
          },
        );
      }
    } else if (options.useLatestApprovedFieldSurvey) {
      survey = await this.repository.findLatestApprovedByParcelId(parcelId);
    }

    const disposition = this.evidenceAdapter.resolveDisposition(
      survey,
      resolved.parcel.areaSquareMeters,
      calibration,
    );

    return {
      survey,
      disposition,
      areaSquareMeters: resolved.parcel.areaSquareMeters,
    };
  }

  private async transition(
    id: string,
    next: SurveyStatus,
    auditFn: (survey: FieldSurvey) => FieldSurvey,
  ): Promise<FieldSurvey> {
    let survey = await this.getById(id);
    this.assertTransition(survey.status, next);
    survey = {
      ...survey,
      status: next,
      updatedAt: new Date().toISOString(),
    };
    survey = auditFn(survey);
    return this.repository.update(survey);
  }

  private assertTransition(from: SurveyStatus, to: SurveyStatus): void {
    const allowed = SURVEY_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new ApiError(
        409,
        `Invalid survey status transition: ${from} → ${to}`,
        { code: 'FIELD_SURVEY_STATUS_VALID', from, to, allowed },
      );
    }
  }

  private assertEditable(survey: FieldSurvey): void {
    if (survey.status === 'approved') {
      throw new ApiError(
        409,
        'Approved survey is immutable; archive and create a revision instead',
        { code: 'FIELD_SURVEY_STATUS_VALID' },
      );
    }
    if (survey.status === 'rejected') {
      throw new ApiError(
        409,
        'Rejected survey must transition to draft before editing',
        { code: 'FIELD_SURVEY_STATUS_VALID' },
      );
    }
    if (survey.status !== 'draft') {
      throw new ApiError(
        409,
        `Survey in status ${survey.status} cannot be edited`,
        { code: 'FIELD_SURVEY_STATUS_VALID' },
      );
    }
  }

  async returnToDraft(id: string, actorId?: string): Promise<FieldSurvey> {
    return this.transition(id, 'draft', (survey) =>
      this.auditService.updated(survey, actorId),
    );
  }
}
