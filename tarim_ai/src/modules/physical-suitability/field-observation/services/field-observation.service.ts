import { createHash, randomUUID } from 'node:crypto';
import {
  buildFieldParameter,
  FIELD_PARAMETER_SEED,
} from '../catalogs/field-parameter.catalog.js';
import type { FieldObservationRepository } from '../repositories/field-observation.repository.js';
import type {
  FieldDeviceMeasurement,
  FieldEvidence,
  FieldMeasurementDevice,
  FieldObservationPoint,
  FieldObservationResult,
  FieldParameter,
  FieldSurvey,
  FieldSurveyReview,
  FieldSurveyStatus,
} from '../types/field-observation.types.js';
import { checkPointAgainstParcelGeometry } from './parcel-geometry.util.js';
import {
  FieldObservationValidationService,
  type CreateFieldDeviceInput,
  type CreateFieldDeviceMeasurementInput,
  type CreateFieldObservationPointInput,
  type CreateFieldObservationResultInput,
  type CreateFieldParameterInput,
  type CreateFieldSurveyInput,
  type CreateFieldSurveyReviewInput,
  type ReviewActionInput,
  type UpdateFieldDeviceInput,
  type UpdateFieldObservationPointInput,
  type UpdateFieldObservationResultInput,
  type UpdateFieldParameterInput,
  type UpdateFieldSurveyInput,
  type UploadFieldEvidenceInput,
} from './field-observation-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

function throwIfInvalid(issues: { severity: string }[], code: string, message: string) {
  const hard = issues.filter((i) => i.severity === 'error');
  if (hard.length > 0) throw httpError(422, code, message, { issues: hard });
}

export type FieldAuditEntry = {
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
};

export type FieldObservationServiceOptions = {
  onAudit?: (entry: FieldAuditEntry) => Promise<void> | void;
};

/**
 * Phase 2.2H — Field Observation & Parcel Verification.
 * Aggregate root: FieldSurvey.
 */
export class FieldObservationService {
  readonly validation: FieldObservationValidationService;
  private readonly onAudit?: FieldObservationServiceOptions['onAudit'];

  constructor(
    private readonly repo: FieldObservationRepository,
    opts?: FieldObservationServiceOptions,
  ) {
    this.validation = new FieldObservationValidationService(repo);
    this.onAudit = opts?.onAudit;
  }

  private async audit(entry: FieldAuditEntry) {
    if (this.onAudit) await this.onAudit(entry);
  }

  // ---- Surveys ----

  listSurveys(parcelId?: string) {
    return this.repo.listSurveys(parcelId);
  }

  getSurvey(id: string) {
    return this.repo.getSurveyById(id);
  }

  getAggregate(id: string) {
    return this.repo.getAggregate(id);
  }

  async createSurvey(input: CreateFieldSurveyInput): Promise<FieldSurvey> {
    const now = new Date().toISOString();
    const row: FieldSurvey = {
      id: newId(),
      surveyCode: input.surveyCode.trim(),
      parcelId: input.parcelId.trim(),
      zoneId: input.zoneId ?? null,
      samplingCampaignId: input.samplingCampaignId ?? null,
      surveyType: input.surveyType,
      surveyPurpose: input.surveyPurpose ?? null,
      surveyDate: input.surveyDate ?? null,
      startedAt: null,
      completedAt: null,
      surveyedBy: input.surveyedBy ?? null,
      responsibleExpert: input.responsibleExpert ?? null,
      organization: input.organization ?? null,
      weatherCondition: input.weatherCondition ?? null,
      previousRainfallCondition: input.previousRainfallCondition ?? null,
      parcelAccessibility: input.parcelAccessibility ?? null,
      surveyStatus: input.surveyStatus ?? 'PLANNED',
      generalNotes: input.generalNotes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    const result = await this.validation.validateSurveyCodeUnique(row);
    throwIfInvalid(result.issues, 'FIELD_SURVEY_INVALID', 'Field survey validation failed');
    const saved = await this.repo.upsertSurvey(row);
    await this.audit({
      entityType: 'FieldSurvey',
      entityId: saved.id,
      action: 'create',
      actor: input.surveyedBy ?? 'system',
      previousValue: null,
      newValue: saved,
      reason: null,
    });
    return saved;
  }

  async updateSurvey(id: string, input: UpdateFieldSurveyInput): Promise<FieldSurvey> {
    const existing = await this.requireActiveSurvey(id);
    if (existing.surveyStatus === 'APPROVED') {
      throw httpError(
        409,
        'SURVEY_IMMUTABLE',
        'Approved surveys cannot be updated directly; request revision first',
      );
    }
    const next: FieldSurvey = {
      ...existing,
      surveyCode: input.surveyCode !== undefined ? input.surveyCode.trim() : existing.surveyCode,
      parcelId: input.parcelId !== undefined ? input.parcelId.trim() : existing.parcelId,
      zoneId: input.zoneId !== undefined ? input.zoneId : existing.zoneId,
      samplingCampaignId:
        input.samplingCampaignId !== undefined
          ? input.samplingCampaignId
          : existing.samplingCampaignId,
      surveyType: input.surveyType ?? existing.surveyType,
      surveyPurpose: input.surveyPurpose !== undefined ? input.surveyPurpose : existing.surveyPurpose,
      surveyDate: input.surveyDate !== undefined ? input.surveyDate : existing.surveyDate,
      surveyedBy: input.surveyedBy !== undefined ? input.surveyedBy : existing.surveyedBy,
      responsibleExpert:
        input.responsibleExpert !== undefined
          ? input.responsibleExpert
          : existing.responsibleExpert,
      organization: input.organization !== undefined ? input.organization : existing.organization,
      weatherCondition:
        input.weatherCondition !== undefined ? input.weatherCondition : existing.weatherCondition,
      previousRainfallCondition:
        input.previousRainfallCondition !== undefined
          ? input.previousRainfallCondition
          : existing.previousRainfallCondition,
      parcelAccessibility:
        input.parcelAccessibility !== undefined
          ? input.parcelAccessibility
          : existing.parcelAccessibility,
      generalNotes: input.generalNotes !== undefined ? input.generalNotes : existing.generalNotes,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const result = await this.validation.validateSurveyCodeUnique(next);
    throwIfInvalid(result.issues, 'FIELD_SURVEY_INVALID', 'Field survey validation failed');
    const saved = await this.repo.upsertSurvey(next);
    await this.audit({
      entityType: 'FieldSurvey',
      entityId: saved.id,
      action: 'update',
      actor: 'system',
      previousValue: existing,
      newValue: saved,
      reason: null,
    });
    return saved;
  }

  private async transitionSurvey(
    id: string,
    to: FieldSurveyStatus,
    actor: string,
    patch?: Partial<FieldSurvey>,
  ): Promise<FieldSurvey> {
    const existing = await this.requireActiveSurvey(id);
    if (!this.validation.canTransition(existing.surveyStatus, to)) {
      throw httpError(
        422,
        'INVALID_STATUS_TRANSITION',
        `Cannot transition survey from ${existing.surveyStatus} to ${to}`,
      );
    }
    const next: FieldSurvey = {
      ...existing,
      ...patch,
      surveyStatus: to,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const saved = await this.repo.upsertSurvey(next);
    await this.audit({
      entityType: 'FieldSurvey',
      entityId: saved.id,
      action: `status:${to}`,
      actor,
      previousValue: existing,
      newValue: saved,
      reason: null,
    });
    return saved;
  }

  startSurvey(id: string, actor = 'system') {
    return this.transitionSurvey(id, 'IN_PROGRESS', actor, {
      startedAt: new Date().toISOString(),
    });
  }

  completeSurvey(id: string, actor = 'system') {
    return this.transitionSurvey(id, 'COMPLETED', actor, {
      completedAt: new Date().toISOString(),
    });
  }

  submitReview(id: string, actor = 'system') {
    return this.transitionSurvey(id, 'UNDER_REVIEW', actor);
  }

  // ---- Points ----

  listPoints(surveyId: string) {
    return this.repo.listPoints(surveyId);
  }

  getPoint(id: string) {
    return this.repo.getPointById(id);
  }

  async createPoint(
    surveyId: string,
    input: CreateFieldObservationPointInput,
  ): Promise<FieldObservationPoint> {
    const survey = await this.requireActiveSurvey(surveyId);
    if (survey.surveyStatus === 'APPROVED') {
      throw httpError(409, 'SURVEY_IMMUTABLE', 'Cannot add points to an approved survey');
    }
    const parcelId = input.parcelId?.trim() || survey.parcelId;
    const parcelGeom = await this.repo.getParcelGeometry(parcelId);
    const geomCheck = checkPointAgainstParcelGeometry(input.latitude, input.longitude, parcelGeom);
    const now = new Date().toISOString();
    const row: FieldObservationPoint = {
      id: newId(),
      surveyId,
      parcelId,
      zoneId: input.zoneId ?? survey.zoneId,
      pointCode: input.pointCode.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      elevation: input.elevation ?? null,
      geometry: input.geometry ?? null,
      accuracyMeters: input.accuracyMeters ?? null,
      observationDate: input.observationDate ?? null,
      observedBy: input.observedBy ?? null,
      landUse: input.landUse ?? null,
      currentCrop: input.currentCrop ?? null,
      previousCrop: input.previousCrop ?? null,
      surfaceCondition: input.surfaceCondition ?? null,
      notes: input.notes ?? null,
      geometryValidationStatus: geomCheck.status,
      geometryValidationMessage: geomCheck.message,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    const saved = await this.repo.upsertPoint(row);
    await this.audit({
      entityType: 'FieldObservationPoint',
      entityId: saved.id,
      action: 'create',
      actor: input.observedBy ?? 'system',
      previousValue: null,
      newValue: { ...saved, geometryCheck: geomCheck },
      reason: geomCheck.message,
    });
    return saved;
  }

  async updatePoint(
    id: string,
    input: UpdateFieldObservationPointInput,
  ): Promise<FieldObservationPoint> {
    const existing = await this.repo.getPointById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'FIELD_POINT_NOT_FOUND', 'Observation point not found');
    }
    const survey = await this.requireActiveSurvey(existing.surveyId);
    if (survey.surveyStatus === 'APPROVED') {
      throw httpError(409, 'SURVEY_IMMUTABLE', 'Cannot update points on an approved survey');
    }
    const latitude = input.latitude ?? existing.latitude;
    const longitude = input.longitude ?? existing.longitude;
    const parcelId = input.parcelId?.trim() || existing.parcelId;
    const parcelGeom = await this.repo.getParcelGeometry(parcelId);
    const geomCheck = checkPointAgainstParcelGeometry(latitude, longitude, parcelGeom);
    const next: FieldObservationPoint = {
      ...existing,
      parcelId,
      zoneId: input.zoneId !== undefined ? input.zoneId : existing.zoneId,
      pointCode: input.pointCode !== undefined ? input.pointCode.trim() : existing.pointCode,
      latitude,
      longitude,
      elevation: input.elevation !== undefined ? input.elevation : existing.elevation,
      geometry: input.geometry !== undefined ? input.geometry : existing.geometry,
      accuracyMeters:
        input.accuracyMeters !== undefined ? input.accuracyMeters : existing.accuracyMeters,
      observationDate:
        input.observationDate !== undefined ? input.observationDate : existing.observationDate,
      observedBy: input.observedBy !== undefined ? input.observedBy : existing.observedBy,
      landUse: input.landUse !== undefined ? input.landUse : existing.landUse,
      currentCrop: input.currentCrop !== undefined ? input.currentCrop : existing.currentCrop,
      previousCrop: input.previousCrop !== undefined ? input.previousCrop : existing.previousCrop,
      surfaceCondition:
        input.surfaceCondition !== undefined ? input.surfaceCondition : existing.surfaceCondition,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      geometryValidationStatus: geomCheck.status,
      geometryValidationMessage: geomCheck.message,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    return this.repo.upsertPoint(next);
  }

  async deletePoint(id: string): Promise<FieldObservationPoint> {
    const existing = await this.repo.getPointById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'FIELD_POINT_NOT_FOUND', 'Observation point not found');
    }
    const survey = await this.requireActiveSurvey(existing.surveyId);
    if (survey.surveyStatus === 'APPROVED') {
      throw httpError(409, 'SURVEY_IMMUTABLE', 'Cannot delete points on an approved survey');
    }
    const next = {
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    return this.repo.upsertPoint(next);
  }

  // ---- Parameters ----

  listParameters() {
    return this.repo.listParameters();
  }

  getParameter(id: string) {
    return this.repo.getParameterById(id);
  }

  getParameterByCode(code: string) {
    return this.repo.getParameterByCode(code);
  }

  async createParameter(input: CreateFieldParameterInput): Promise<FieldParameter> {
    const existing = await this.repo.getParameterByCode(input.code.trim());
    if (existing?.isActive) {
      throw httpError(409, 'FIELD_PARAMETER_EXISTS', `Parameter code exists: ${input.code}`);
    }
    const now = new Date().toISOString();
    const row: FieldParameter = {
      id: newId(),
      code: input.code.trim(),
      canonicalName: input.canonicalName.trim(),
      turkishDisplayName: input.turkishDisplayName.trim(),
      englishDisplayName: input.englishDisplayName.trim(),
      category: input.category,
      description: input.description ?? null,
      valueType: input.valueType,
      canonicalUnitId: input.canonicalUnitId ?? null,
      allowedMeasurementScope: input.allowedMeasurementScope ?? 'POINT',
      isRequiredForPhysicalSuitability: input.isRequiredForPhysicalSuitability ?? false,
      requiresPhotoEvidence: input.requiresPhotoEvidence ?? false,
      requiresGpsEvidence: input.requiresGpsEvidence ?? false,
      requiresExpertVerification: input.requiresExpertVerification ?? false,
      displayOrder: input.displayOrder ?? 1000,
      source: input.source ?? null,
      verificationStatus: input.verificationStatus ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    return this.repo.upsertParameter(row);
  }

  async updateParameter(id: string, input: UpdateFieldParameterInput): Promise<FieldParameter> {
    const existing = await this.repo.getParameterById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'FIELD_PARAMETER_NOT_FOUND', 'Field parameter not found');
    }
    const next: FieldParameter = {
      ...existing,
      code: input.code !== undefined ? input.code.trim() : existing.code,
      canonicalName:
        input.canonicalName !== undefined ? input.canonicalName.trim() : existing.canonicalName,
      turkishDisplayName:
        input.turkishDisplayName !== undefined
          ? input.turkishDisplayName.trim()
          : existing.turkishDisplayName,
      englishDisplayName:
        input.englishDisplayName !== undefined
          ? input.englishDisplayName.trim()
          : existing.englishDisplayName,
      category: input.category ?? existing.category,
      description: input.description !== undefined ? input.description : existing.description,
      valueType: input.valueType ?? existing.valueType,
      canonicalUnitId:
        input.canonicalUnitId !== undefined ? input.canonicalUnitId : existing.canonicalUnitId,
      allowedMeasurementScope:
        input.allowedMeasurementScope ?? existing.allowedMeasurementScope,
      isRequiredForPhysicalSuitability:
        input.isRequiredForPhysicalSuitability ?? existing.isRequiredForPhysicalSuitability,
      requiresPhotoEvidence: input.requiresPhotoEvidence ?? existing.requiresPhotoEvidence,
      requiresGpsEvidence: input.requiresGpsEvidence ?? existing.requiresGpsEvidence,
      requiresExpertVerification:
        input.requiresExpertVerification ?? existing.requiresExpertVerification,
      displayOrder: input.displayOrder ?? existing.displayOrder,
      source: input.source !== undefined ? input.source : existing.source,
      verificationStatus: input.verificationStatus ?? existing.verificationStatus,
      isActive: input.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    return this.repo.upsertParameter(next);
  }

  // ---- Results ----

  listResults(surveyId: string) {
    return this.repo.listResults(surveyId);
  }

  async createResult(input: CreateFieldObservationResultInput): Promise<FieldObservationResult> {
    const survey = await this.requireActiveSurvey(input.surveyId);
    if (survey.surveyStatus === 'APPROVED') {
      throw httpError(409, 'SURVEY_IMMUTABLE', 'Cannot add results to an approved survey');
    }
    const parameter = await this.repo.getParameterById(input.parameterId);
    const now = new Date().toISOString();
    let reviewStatus = input.reviewStatus ?? 'DRAFT';
    let reviewMessage: string | null = input.reviewMessage ?? null;

    if (parameter?.requiresExpertVerification) {
      reviewStatus = 'REQUIRES_REVIEW';
      reviewMessage = reviewMessage ?? 'Parameter requires expert verification';
    }

    const row: FieldObservationResult = {
      id: newId(),
      surveyId: input.surveyId,
      observationPointId: input.observationPointId ?? null,
      parameterId: input.parameterId,
      rawValue: input.rawValue ?? null,
      numericValue: input.numericValue ?? null,
      textValue: input.textValue ?? null,
      booleanValue: input.booleanValue ?? null,
      optionId: input.optionId ?? null,
      unitId: input.unitId ?? null,
      observationMethod: input.observationMethod ?? null,
      observationDepthFromCm: input.observationDepthFromCm ?? null,
      observationDepthToCm: input.observationDepthToCm ?? null,
      confidenceLevel: input.confidenceLevel ?? 'MEDIUM',
      evidenceStatus: input.evidenceStatus ?? 'NO_EVIDENCE',
      observedBy: input.observedBy ?? null,
      observedAt: input.observedAt ?? now,
      source: input.source ?? 'FieldObservation',
      dataOrigin: input.dataOrigin ?? 'OBSERVED',
      sourceInstitution: input.sourceInstitution ?? null,
      sourcePerson: input.sourcePerson ?? null,
      sourceDate: input.sourceDate ?? null,
      verificationStatus: input.verificationStatus ?? 'Draft',
      reviewStatus,
      reviewMessage,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    if (parameter?.valueType === 'ENUM' && row.optionId) {
      const option = await this.repo.getOptionById(row.optionId);
      if (!option || !option.isActive || option.parameterId !== parameter.id) {
        throw httpError(422, 'INVALID_OPTION', 'OptionId is not in the parameter catalog');
      }
    }

    const validation = this.validation.validateObservationResult(row, parameter);
    throwIfInvalid(validation.issues, 'FIELD_RESULT_INVALID', 'Observation result invalid');
    const saved = await this.repo.upsertResult(row);
    await this.audit({
      entityType: 'FieldObservationResult',
      entityId: saved.id,
      action: 'create',
      actor: input.observedBy ?? 'system',
      previousValue: null,
      newValue: saved,
      reason: null,
    });
    return saved;
  }

  async updateResult(
    id: string,
    input: UpdateFieldObservationResultInput,
  ): Promise<FieldObservationResult> {
    const existing = await this.repo.getResultById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'FIELD_RESULT_NOT_FOUND', 'Observation result not found');
    }
    if (existing.reviewStatus === 'VERIFIED') {
      // Immutable: create new version instead of in-place mutate
      const cloned = await this.createResult({
        surveyId: existing.surveyId,
        observationPointId:
          input.observationPointId !== undefined
            ? input.observationPointId
            : existing.observationPointId,
        parameterId: input.parameterId ?? existing.parameterId,
        rawValue: input.rawValue !== undefined ? input.rawValue : existing.rawValue,
        numericValue: input.numericValue !== undefined ? input.numericValue : existing.numericValue,
        textValue: input.textValue !== undefined ? input.textValue : existing.textValue,
        booleanValue:
          input.booleanValue !== undefined ? input.booleanValue : existing.booleanValue,
        optionId: input.optionId !== undefined ? input.optionId : existing.optionId,
        unitId: input.unitId !== undefined ? input.unitId : existing.unitId,
        observationMethod:
          input.observationMethod !== undefined
            ? input.observationMethod
            : existing.observationMethod,
        observationDepthFromCm:
          input.observationDepthFromCm !== undefined
            ? input.observationDepthFromCm
            : existing.observationDepthFromCm,
        observationDepthToCm:
          input.observationDepthToCm !== undefined
            ? input.observationDepthToCm
            : existing.observationDepthToCm,
        confidenceLevel: input.confidenceLevel ?? existing.confidenceLevel,
        evidenceStatus: input.evidenceStatus ?? existing.evidenceStatus,
        observedBy: input.observedBy !== undefined ? input.observedBy : existing.observedBy,
        observedAt: input.observedAt !== undefined ? input.observedAt : existing.observedAt,
        source: input.source !== undefined ? input.source : existing.source,
        dataOrigin: input.dataOrigin ?? existing.dataOrigin,
        sourceInstitution:
          input.sourceInstitution !== undefined
            ? input.sourceInstitution
            : existing.sourceInstitution,
        sourcePerson: input.sourcePerson !== undefined ? input.sourcePerson : existing.sourcePerson,
        sourceDate: input.sourceDate !== undefined ? input.sourceDate : existing.sourceDate,
        reviewStatus: 'DRAFT',
        reviewMessage: `Revision of verified result ${existing.id}`,
      });
      await this.repo.upsertResult({
        ...existing,
        isActive: false,
        updatedAt: new Date().toISOString(),
        version: existing.version + 1,
      });
      await this.audit({
        entityType: 'FieldObservationResult',
        entityId: cloned.id,
        action: 'revise_verified',
        actor: 'system',
        previousValue: existing,
        newValue: cloned,
        reason: 'Approved/verified records are immutable; new version created',
      });
      return cloned;
    }

    const survey = await this.requireActiveSurvey(existing.surveyId);
    if (survey.surveyStatus === 'APPROVED') {
      throw httpError(409, 'SURVEY_IMMUTABLE', 'Cannot update results on an approved survey');
    }

    const next: FieldObservationResult = {
      ...existing,
      observationPointId:
        input.observationPointId !== undefined
          ? input.observationPointId
          : existing.observationPointId,
      parameterId: input.parameterId ?? existing.parameterId,
      rawValue: input.rawValue !== undefined ? input.rawValue : existing.rawValue,
      numericValue: input.numericValue !== undefined ? input.numericValue : existing.numericValue,
      textValue: input.textValue !== undefined ? input.textValue : existing.textValue,
      booleanValue: input.booleanValue !== undefined ? input.booleanValue : existing.booleanValue,
      optionId: input.optionId !== undefined ? input.optionId : existing.optionId,
      unitId: input.unitId !== undefined ? input.unitId : existing.unitId,
      observationMethod:
        input.observationMethod !== undefined
          ? input.observationMethod
          : existing.observationMethod,
      observationDepthFromCm:
        input.observationDepthFromCm !== undefined
          ? input.observationDepthFromCm
          : existing.observationDepthFromCm,
      observationDepthToCm:
        input.observationDepthToCm !== undefined
          ? input.observationDepthToCm
          : existing.observationDepthToCm,
      confidenceLevel: input.confidenceLevel ?? existing.confidenceLevel,
      evidenceStatus: input.evidenceStatus ?? existing.evidenceStatus,
      observedBy: input.observedBy !== undefined ? input.observedBy : existing.observedBy,
      observedAt: input.observedAt !== undefined ? input.observedAt : existing.observedAt,
      source: input.source !== undefined ? input.source : existing.source,
      dataOrigin: input.dataOrigin ?? existing.dataOrigin,
      sourceInstitution:
        input.sourceInstitution !== undefined
          ? input.sourceInstitution
          : existing.sourceInstitution,
      sourcePerson: input.sourcePerson !== undefined ? input.sourcePerson : existing.sourcePerson,
      sourceDate: input.sourceDate !== undefined ? input.sourceDate : existing.sourceDate,
      verificationStatus: input.verificationStatus ?? existing.verificationStatus,
      reviewStatus: input.reviewStatus ?? existing.reviewStatus,
      reviewMessage: input.reviewMessage !== undefined ? input.reviewMessage : existing.reviewMessage,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const parameter = await this.repo.getParameterById(next.parameterId);
    const validation = this.validation.validateObservationResult(next, parameter);
    throwIfInvalid(validation.issues, 'FIELD_RESULT_INVALID', 'Observation result invalid');
    return this.repo.upsertResult(next);
  }

  async deleteResult(id: string): Promise<FieldObservationResult> {
    const existing = await this.repo.getResultById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'FIELD_RESULT_NOT_FOUND', 'Observation result not found');
    }
    if (existing.reviewStatus === 'VERIFIED') {
      throw httpError(409, 'RESULT_IMMUTABLE', 'Verified results cannot be deleted; reject or revise');
    }
    const next = {
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    return this.repo.upsertResult(next);
  }

  async verifyResult(id: string, actor: string): Promise<FieldObservationResult> {
    const existing = await this.repo.getResultById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'FIELD_RESULT_NOT_FOUND', 'Observation result not found');
    }
    const parameter = await this.repo.getParameterById(existing.parameterId);
    if (parameter?.requiresPhotoEvidence && existing.evidenceStatus === 'NO_EVIDENCE') {
      const links = await this.repo.listEvidenceLinks(undefined, existing.id);
      if (links.length === 0) {
        throw httpError(
          422,
          'EVIDENCE_REQUIRED',
          'Parameter requires photo evidence before verification',
        );
      }
    }
    const next: FieldObservationResult = {
      ...existing,
      reviewStatus: 'VERIFIED',
      verificationStatus: 'ExpertReviewed',
      reviewMessage: `Verified by ${actor}`,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const saved = await this.repo.upsertResult(next);
    await this.audit({
      entityType: 'FieldObservationResult',
      entityId: saved.id,
      action: 'verify',
      actor,
      previousValue: existing,
      newValue: saved,
      reason: null,
    });
    return saved;
  }

  async rejectResult(id: string, actor: string, notes?: string): Promise<FieldObservationResult> {
    const existing = await this.repo.getResultById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'FIELD_RESULT_NOT_FOUND', 'Observation result not found');
    }
    const next: FieldObservationResult = {
      ...existing,
      reviewStatus: 'REJECTED',
      reviewMessage: notes ?? `Rejected by ${actor}`,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const saved = await this.repo.upsertResult(next);
    await this.audit({
      entityType: 'FieldObservationResult',
      entityId: saved.id,
      action: 'reject',
      actor,
      previousValue: existing,
      newValue: saved,
      reason: notes ?? null,
    });
    return saved;
  }

  // ---- Evidence ----

  listEvidence(surveyId: string) {
    return this.repo.listEvidence(surveyId);
  }

  async uploadEvidence(input: UploadFieldEvidenceInput): Promise<FieldEvidence> {
    await this.requireActiveSurvey(input.surveyId);
    let fileHash = input.fileHash?.trim() ?? '';
    if (!fileHash) {
      if (!input.dataBase64) {
        throw httpError(400, 'FILE_HASH_REQUIRED', 'Provide fileHash or dataBase64');
      }
      fileHash = createHash('sha256').update(input.dataBase64).digest('hex');
    }
    const now = new Date().toISOString();
    const row: FieldEvidence = {
      id: newId(),
      surveyId: input.surveyId,
      observationPointId: input.observationPointId ?? null,
      evidenceType: input.evidenceType,
      fileName: input.fileName.trim(),
      fileType: input.fileType ?? null,
      fileSize: input.fileSize ?? null,
      storagePath: input.storagePath ?? null,
      fileHash,
      capturedAt: input.capturedAt ?? null,
      uploadedAt: now,
      uploadedBy: input.uploadedBy ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      accuracyMeters: input.accuracyMeters ?? null,
      deviceId: input.deviceId ?? null,
      description: input.description ?? null,
      isPrimary: input.isPrimary ?? false,
      verificationStatus: 'Draft',
      createdAt: now,
      isActive: true,
    };
    const saved = await this.repo.upsertEvidence(row);
    if (input.observationResultId) {
      await this.repo.upsertEvidenceLink({
        id: newId(),
        evidenceId: saved.id,
        observationResultId: input.observationResultId,
        createdAt: now,
      });
      const result = await this.repo.getResultById(input.observationResultId);
      if (result?.isActive) {
        const evidenceStatus =
          input.evidenceType === 'PHOTO'
            ? 'PHOTO_ATTACHED'
            : input.evidenceType === 'VIDEO'
              ? 'VIDEO_ATTACHED'
              : result.evidenceStatus === 'NO_EVIDENCE'
                ? 'MULTIPLE_EVIDENCE'
                : result.evidenceStatus;
        await this.repo.upsertResult({
          ...result,
          evidenceStatus,
          updatedAt: now,
          version: result.version + 1,
        });
      }
    }
    await this.audit({
      entityType: 'FieldEvidence',
      entityId: saved.id,
      action: 'upload',
      actor: input.uploadedBy ?? 'system',
      previousValue: null,
      newValue: { id: saved.id, fileHash: saved.fileHash, fileName: saved.fileName },
      reason: null,
    });
    return saved;
  }

  async deleteEvidence(id: string): Promise<FieldEvidence> {
    const existing = await this.repo.getEvidenceById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'FIELD_EVIDENCE_NOT_FOUND', 'Evidence not found');
    }
    return this.repo.upsertEvidence({
      ...existing,
      isActive: false,
    });
  }

  // ---- Devices ----

  listDevices() {
    return this.repo.listDevices();
  }

  async createDevice(input: CreateFieldDeviceInput): Promise<FieldMeasurementDevice> {
    const existing = await this.repo.getDeviceByCode(input.deviceCode.trim());
    if (existing?.isActive) {
      throw httpError(409, 'DEVICE_EXISTS', `Device code exists: ${input.deviceCode}`);
    }
    const now = new Date().toISOString();
    const row: FieldMeasurementDevice = {
      id: newId(),
      deviceCode: input.deviceCode.trim(),
      deviceName: input.deviceName.trim(),
      deviceType: input.deviceType,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      serialNumber: input.serialNumber ?? null,
      calibrationDate: input.calibrationDate ?? null,
      calibrationExpiryDate: input.calibrationExpiryDate ?? null,
      calibrationCertificatePath: input.calibrationCertificatePath ?? null,
      measurementUnitId: input.measurementUnitId ?? null,
      isCalibrated: input.isCalibrated ?? true,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    return this.repo.upsertDevice(row);
  }

  async updateDevice(id: string, input: UpdateFieldDeviceInput): Promise<FieldMeasurementDevice> {
    const existing = await this.repo.getDeviceById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }
    const next: FieldMeasurementDevice = {
      ...existing,
      deviceCode: input.deviceCode !== undefined ? input.deviceCode.trim() : existing.deviceCode,
      deviceName: input.deviceName !== undefined ? input.deviceName.trim() : existing.deviceName,
      deviceType: input.deviceType ?? existing.deviceType,
      manufacturer: input.manufacturer !== undefined ? input.manufacturer : existing.manufacturer,
      model: input.model !== undefined ? input.model : existing.model,
      serialNumber: input.serialNumber !== undefined ? input.serialNumber : existing.serialNumber,
      calibrationDate:
        input.calibrationDate !== undefined ? input.calibrationDate : existing.calibrationDate,
      calibrationExpiryDate:
        input.calibrationExpiryDate !== undefined
          ? input.calibrationExpiryDate
          : existing.calibrationExpiryDate,
      calibrationCertificatePath:
        input.calibrationCertificatePath !== undefined
          ? input.calibrationCertificatePath
          : existing.calibrationCertificatePath,
      measurementUnitId:
        input.measurementUnitId !== undefined
          ? input.measurementUnitId
          : existing.measurementUnitId,
      isCalibrated: input.isCalibrated ?? existing.isCalibrated,
      isActive: input.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    return this.repo.upsertDevice(next);
  }

  async createDeviceMeasurement(
    input: CreateFieldDeviceMeasurementInput,
  ): Promise<FieldDeviceMeasurement> {
    const device = await this.repo.getDeviceById(input.deviceId);
    if (!device || !device.isActive) {
      throw httpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }
    const result = await this.repo.getResultById(input.observationResultId);
    if (!result || !result.isActive) {
      throw httpError(404, 'FIELD_RESULT_NOT_FOUND', 'Observation result not found');
    }

    let calibrationValid = true;
    if (device.calibrationExpiryDate) {
      calibrationValid = device.calibrationExpiryDate >= input.measuredAt;
    }
    if (!device.isCalibrated) calibrationValid = false;

    const now = new Date().toISOString();
    const row: FieldDeviceMeasurement = {
      id: newId(),
      observationResultId: input.observationResultId,
      deviceId: input.deviceId,
      measuredValue: input.measuredValue ?? null,
      unitId: input.unitId ?? null,
      measuredAt: input.measuredAt,
      calibrationValidAtMeasurement: calibrationValid,
      rawDeviceOutput: input.rawDeviceOutput ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      version: 1,
      isActive: true,
    };
    const saved = await this.repo.upsertDeviceMeasurement(row);

    if (!calibrationValid) {
      await this.repo.upsertResult({
        ...result,
        dataOrigin: 'MEASURED',
        reviewStatus: 'REQUIRES_REVIEW',
        reviewMessage: 'Device calibration expired or invalid at measurement time',
        evidenceStatus:
          result.evidenceStatus === 'NO_EVIDENCE'
            ? 'MEASUREMENT_DEVICE_CONFIRMED'
            : result.evidenceStatus,
        updatedAt: now,
        version: result.version + 1,
      });
    } else {
      await this.repo.upsertResult({
        ...result,
        dataOrigin: 'MEASURED',
        evidenceStatus: 'MEASUREMENT_DEVICE_CONFIRMED',
        updatedAt: now,
        version: result.version + 1,
      });
    }

    return saved;
  }

  // ---- Review workflow ----

  getReview(surveyId: string) {
    return this.repo.getLatestReview(surveyId);
  }

  async createReview(surveyId: string, input: CreateFieldSurveyReviewInput): Promise<FieldSurveyReview> {
    const survey = await this.requireActiveSurvey(surveyId);
    if (survey.surveyStatus !== 'UNDER_REVIEW' && survey.surveyStatus !== 'COMPLETED') {
      throw httpError(
        422,
        'SURVEY_NOT_READY_FOR_REVIEW',
        'Survey must be completed and submitted before review',
      );
    }
    if (survey.surveyStatus === 'COMPLETED') {
      await this.submitReview(surveyId, input.reviewedBy);
    }
    const results = await this.repo.listResults(surveyId, true);
    const now = new Date().toISOString();
    const row: FieldSurveyReview = {
      id: newId(),
      surveyId,
      reviewedBy: input.reviewedBy,
      reviewerRole: input.reviewerRole ?? null,
      reviewDate: now,
      reviewStatus: input.reviewStatus ?? 'IN_REVIEW',
      reviewNotes: input.reviewNotes ?? null,
      approvedObservationCount: results.filter((r) => r.reviewStatus === 'VERIFIED').length,
      rejectedObservationCount: results.filter((r) => r.reviewStatus === 'REJECTED').length,
      revisionRequestedCount: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    return this.repo.upsertReview(row);
  }

  async approveSurvey(surveyId: string, input: ReviewActionInput): Promise<FieldSurvey> {
    const survey = await this.requireActiveSurvey(surveyId);
    if (survey.surveyStatus !== 'UNDER_REVIEW') {
      throw httpError(422, 'SURVEY_NOT_IN_REVIEW', 'Survey must be UNDER_REVIEW to approve');
    }
    const results = await this.repo.listResults(surveyId, true);
    const critical = [];
    for (const r of results) {
      const p = await this.repo.getParameterById(r.parameterId);
      if (p?.requiresExpertVerification && r.reviewStatus !== 'VERIFIED') {
        critical.push(p.code);
      }
    }
    if (critical.length > 0) {
      throw httpError(
        422,
        'CRITICAL_UNVERIFIED',
        `Critical parameters require verification: ${critical.join(', ')}`,
      );
    }
    const now = new Date().toISOString();
    await this.repo.upsertReview({
      id: newId(),
      surveyId,
      reviewedBy: input.reviewedBy,
      reviewerRole: input.reviewerRole ?? null,
      reviewDate: now,
      reviewStatus: 'APPROVED',
      reviewNotes: input.reviewNotes ?? null,
      approvedObservationCount: results.filter((r) => r.reviewStatus === 'VERIFIED').length,
      rejectedObservationCount: results.filter((r) => r.reviewStatus === 'REJECTED').length,
      revisionRequestedCount: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    return this.transitionSurvey(surveyId, 'APPROVED', input.reviewedBy);
  }

  async requestRevision(surveyId: string, input: ReviewActionInput): Promise<FieldSurvey> {
    const survey = await this.requireActiveSurvey(surveyId);
    if (survey.surveyStatus !== 'UNDER_REVIEW' && survey.surveyStatus !== 'APPROVED') {
      throw httpError(422, 'SURVEY_NOT_IN_REVIEW', 'Revision can be requested from review/approved');
    }
    const latest = await this.repo.getLatestReview(surveyId);
    const now = new Date().toISOString();
    await this.repo.upsertReview({
      id: newId(),
      surveyId,
      reviewedBy: input.reviewedBy,
      reviewerRole: input.reviewerRole ?? null,
      reviewDate: now,
      reviewStatus: 'REVISION_REQUIRED',
      reviewNotes: input.reviewNotes ?? null,
      approvedObservationCount: latest?.approvedObservationCount ?? 0,
      rejectedObservationCount: latest?.rejectedObservationCount ?? 0,
      revisionRequestedCount: (latest?.revisionRequestedCount ?? 0) + 1,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    // Force transition: APPROVED has empty transitions — allow revision override
    if (survey.surveyStatus === 'APPROVED') {
      const next: FieldSurvey = {
        ...survey,
        surveyStatus: 'IN_PROGRESS',
        updatedAt: now,
        version: survey.version + 1,
      };
      const saved = await this.repo.upsertSurvey(next);
      await this.audit({
        entityType: 'FieldSurvey',
        entityId: saved.id,
        action: 'request_revision',
        actor: input.reviewedBy,
        previousValue: survey,
        newValue: saved,
        reason: input.reviewNotes ?? null,
      });
      return saved;
    }
    return this.transitionSurvey(surveyId, 'IN_PROGRESS', input.reviewedBy);
  }

  async rejectSurvey(surveyId: string, input: ReviewActionInput): Promise<FieldSurvey> {
    const survey = await this.requireActiveSurvey(surveyId);
    if (survey.surveyStatus !== 'UNDER_REVIEW') {
      throw httpError(422, 'SURVEY_NOT_IN_REVIEW', 'Survey must be UNDER_REVIEW to reject');
    }
    const now = new Date().toISOString();
    await this.repo.upsertReview({
      id: newId(),
      surveyId,
      reviewedBy: input.reviewedBy,
      reviewerRole: input.reviewerRole ?? null,
      reviewDate: now,
      reviewStatus: 'REJECTED',
      reviewNotes: input.reviewNotes ?? null,
      approvedObservationCount: 0,
      rejectedObservationCount: 0,
      revisionRequestedCount: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    return this.transitionSurvey(surveyId, 'REJECTED', input.reviewedBy);
  }

  registerParcelGeometry(parcelId: string, geometryJson: string) {
    return this.repo.upsertParcelGeometry(parcelId, geometryJson);
  }

  private async requireActiveSurvey(id: string): Promise<FieldSurvey> {
    const survey = await this.repo.getSurveyById(id);
    if (!survey || !survey.isActive) {
      throw httpError(404, 'FIELD_SURVEY_NOT_FOUND', 'Field survey not found');
    }
    return survey;
  }
}

export async function seedFieldObservationModule(
  repo: FieldObservationRepository,
): Promise<void> {
  const existing = await repo.listParameters(false);
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  for (const def of FIELD_PARAMETER_SEED) {
    await repo.upsertParameter(buildFieldParameter(def, now));
  }
  // Enum options intentionally not seeded without verified sources.
}
