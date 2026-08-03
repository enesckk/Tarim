import { z } from 'zod';
import type { FieldObservationRepository } from '../repositories/field-observation.repository.js';
import type {
  FieldObservationResult,
  FieldObservationValidationIssue,
  FieldObservationValidationResult,
  FieldParameter,
  FieldSurvey,
  FieldSurveyStatus,
} from '../types/field-observation.types.js';

const surveyTypeSchema = z.enum([
  'INITIAL',
  'ROUTINE',
  'VERIFICATION',
  'FOLLOW_UP',
  'PROBLEM_DIAGNOSIS',
  'PRE_PLANTING',
  'POST_HARVEST',
]);
const surveyStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);
const categorySchema = z.enum([
  'SOIL_PROFILE',
  'DRAINAGE',
  'COMPACTION',
  'STONINESS',
  'EROSION',
  'SURFACE',
  'WATER',
  'IRRIGATION',
  'LAND_USE',
  'VEGETATION',
  'INFRASTRUCTURE',
  'MANAGEMENT',
]);
const valueTypeSchema = z.enum([
  'NUMERIC',
  'BOOLEAN',
  'TEXT',
  'ENUM',
  'PERCENTAGE',
  'DEPTH',
  'CLASSIFICATION',
]);
const scopeSchema = z.enum(['POINT', 'ZONE', 'PARCEL', 'PROFILE', 'SURVEY']);
const confidenceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']);
const evidenceStatusSchema = z.enum([
  'NO_EVIDENCE',
  'PHOTO_ATTACHED',
  'VIDEO_ATTACHED',
  'GPS_CONFIRMED',
  'MEASUREMENT_DEVICE_CONFIRMED',
  'MULTIPLE_EVIDENCE',
]);
const reviewStatusSchema = z.enum(['DRAFT', 'REQUIRES_REVIEW', 'VERIFIED', 'REJECTED']);
const evidenceTypeSchema = z.enum([
  'PHOTO',
  'VIDEO',
  'DOCUMENT',
  'MEASUREMENT_SCREENSHOT',
  'AUDIO_NOTE',
  'SKETCH',
]);
const deviceTypeSchema = z.enum([
  'PENETROMETER',
  'SOIL_MOISTURE_METER',
  'EC_METER',
  'PH_METER',
  'GPS',
  'RANGE_FINDER',
  'INFILTROMETER',
  'FLOW_METER',
  'OTHER',
]);
const surveyReviewStatusSchema = z.enum([
  'PENDING',
  'IN_REVIEW',
  'REVISION_REQUIRED',
  'APPROVED',
  'REJECTED',
]);
const dataOriginSchema = z.enum([
  'OBSERVED',
  'MEASURED',
  'REPORTED_BY_FARMER',
  'DERIVED',
  'IMPORTED',
  'EXPERT_ASSESSMENT',
]);
const verificationSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

export const createFieldSurveySchema = z.object({
  surveyCode: z.string().trim().min(1).max(100),
  parcelId: z.string().trim().min(1).max(200),
  zoneId: z.string().trim().max(200).nullable().optional(),
  samplingCampaignId: z.string().uuid().nullable().optional(),
  surveyType: surveyTypeSchema,
  surveyPurpose: z.string().max(2000).nullable().optional(),
  surveyDate: z.string().datetime().nullable().optional(),
  surveyedBy: z.string().trim().max(500).nullable().optional(),
  responsibleExpert: z.string().trim().max(500).nullable().optional(),
  organization: z.string().trim().max(500).nullable().optional(),
  weatherCondition: z.string().trim().max(500).nullable().optional(),
  previousRainfallCondition: z.string().trim().max(500).nullable().optional(),
  parcelAccessibility: z.string().trim().max(500).nullable().optional(),
  surveyStatus: surveyStatusSchema.optional(),
  generalNotes: z.string().max(8000).nullable().optional(),
});

export const updateFieldSurveySchema = createFieldSurveySchema.partial().omit({ surveyCode: true }).extend({
  surveyCode: z.string().trim().min(1).max(100).optional(),
});

export const createFieldObservationPointSchema = z.object({
  parcelId: z.string().trim().min(1).max(200).optional(),
  zoneId: z.string().trim().max(200).nullable().optional(),
  pointCode: z.string().trim().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number().nullable().optional(),
  geometry: z.string().max(100_000).nullable().optional(),
  accuracyMeters: z.number().nonnegative().nullable().optional(),
  observationDate: z.string().datetime().nullable().optional(),
  observedBy: z.string().trim().max(500).nullable().optional(),
  landUse: z.string().trim().max(200).nullable().optional(),
  currentCrop: z.string().trim().max(200).nullable().optional(),
  previousCrop: z.string().trim().max(200).nullable().optional(),
  surfaceCondition: z.string().trim().max(500).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const updateFieldObservationPointSchema = createFieldObservationPointSchema.partial().extend({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const createFieldParameterSchema = z.object({
  code: z.string().trim().min(1).max(100),
  canonicalName: z.string().trim().min(1).max(500),
  turkishDisplayName: z.string().trim().min(1).max(500),
  englishDisplayName: z.string().trim().min(1).max(500),
  category: categorySchema,
  description: z.string().max(8000).nullable().optional(),
  valueType: valueTypeSchema,
  canonicalUnitId: z.string().uuid().nullable().optional(),
  allowedMeasurementScope: scopeSchema.optional(),
  isRequiredForPhysicalSuitability: z.boolean().optional(),
  requiresPhotoEvidence: z.boolean().optional(),
  requiresGpsEvidence: z.boolean().optional(),
  requiresExpertVerification: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  source: z.string().trim().max(500).nullable().optional(),
  verificationStatus: verificationSchema.optional(),
});

export const updateFieldParameterSchema = createFieldParameterSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createFieldObservationResultSchema = z.object({
  surveyId: z.string().uuid(),
  observationPointId: z.string().uuid().nullable().optional(),
  parameterId: z.string().uuid(),
  rawValue: z.string().max(2000).nullable().optional(),
  numericValue: z.number().nullable().optional(),
  textValue: z.string().max(8000).nullable().optional(),
  booleanValue: z.boolean().nullable().optional(),
  optionId: z.string().uuid().nullable().optional(),
  unitId: z.string().uuid().nullable().optional(),
  observationMethod: z.string().trim().max(200).nullable().optional(),
  observationDepthFromCm: z.number().nullable().optional(),
  observationDepthToCm: z.number().nullable().optional(),
  confidenceLevel: confidenceSchema.optional(),
  evidenceStatus: evidenceStatusSchema.optional(),
  observedBy: z.string().trim().max(500).nullable().optional(),
  observedAt: z.string().datetime().nullable().optional(),
  source: z.string().trim().max(500).nullable().optional(),
  dataOrigin: dataOriginSchema.optional(),
  sourceInstitution: z.string().trim().max(500).nullable().optional(),
  sourcePerson: z.string().trim().max(500).nullable().optional(),
  sourceDate: z.string().datetime().nullable().optional(),
  verificationStatus: verificationSchema.optional(),
  reviewStatus: reviewStatusSchema.optional(),
  reviewMessage: z.string().max(8000).nullable().optional(),
});

export const updateFieldObservationResultSchema = createFieldObservationResultSchema.partial();

export const uploadFieldEvidenceSchema = z.object({
  surveyId: z.string().uuid(),
  observationPointId: z.string().uuid().nullable().optional(),
  observationResultId: z.string().uuid().nullable().optional(),
  evidenceType: evidenceTypeSchema,
  fileName: z.string().trim().min(1).max(500),
  fileType: z.string().trim().max(200).nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  storagePath: z.string().trim().max(2000).nullable().optional(),
  /** Caller-supplied hash, or base64 content to hash. */
  fileHash: z.string().trim().min(1).max(128).optional(),
  dataBase64: z.string().optional(),
  capturedAt: z.string().datetime().nullable().optional(),
  uploadedBy: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  accuracyMeters: z.number().nonnegative().nullable().optional(),
  deviceId: z.string().trim().max(200).nullable().optional(),
  description: z.string().max(8000).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export const createFieldDeviceSchema = z.object({
  deviceCode: z.string().trim().min(1).max(100),
  deviceName: z.string().trim().min(1).max(500),
  deviceType: deviceTypeSchema,
  manufacturer: z.string().trim().max(200).nullable().optional(),
  model: z.string().trim().max(200).nullable().optional(),
  serialNumber: z.string().trim().max(200).nullable().optional(),
  calibrationDate: z.string().datetime().nullable().optional(),
  calibrationExpiryDate: z.string().datetime().nullable().optional(),
  calibrationCertificatePath: z.string().trim().max(2000).nullable().optional(),
  measurementUnitId: z.string().uuid().nullable().optional(),
  isCalibrated: z.boolean().optional(),
});

export const updateFieldDeviceSchema = createFieldDeviceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createFieldDeviceMeasurementSchema = z.object({
  observationResultId: z.string().uuid(),
  deviceId: z.string().uuid(),
  measuredValue: z.number().nullable().optional(),
  unitId: z.string().uuid().nullable().optional(),
  measuredAt: z.string().datetime(),
  rawDeviceOutput: z.string().max(8000).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const createFieldSurveyReviewSchema = z.object({
  reviewedBy: z.string().trim().min(1).max(500),
  reviewerRole: z.string().trim().max(200).nullable().optional(),
  reviewNotes: z.string().max(8000).nullable().optional(),
  reviewStatus: surveyReviewStatusSchema.optional(),
});

export const reviewActionSchema = z.object({
  reviewedBy: z.string().trim().min(1).max(500),
  reviewerRole: z.string().trim().max(200).nullable().optional(),
  reviewNotes: z.string().max(8000).nullable().optional(),
});

export type CreateFieldSurveyInput = z.infer<typeof createFieldSurveySchema>;
export type UpdateFieldSurveyInput = z.infer<typeof updateFieldSurveySchema>;
export type CreateFieldObservationPointInput = z.infer<typeof createFieldObservationPointSchema>;
export type UpdateFieldObservationPointInput = z.infer<typeof updateFieldObservationPointSchema>;
export type CreateFieldParameterInput = z.infer<typeof createFieldParameterSchema>;
export type UpdateFieldParameterInput = z.infer<typeof updateFieldParameterSchema>;
export type CreateFieldObservationResultInput = z.infer<typeof createFieldObservationResultSchema>;
export type UpdateFieldObservationResultInput = z.infer<typeof updateFieldObservationResultSchema>;
export type UploadFieldEvidenceInput = z.infer<typeof uploadFieldEvidenceSchema>;
export type CreateFieldDeviceInput = z.infer<typeof createFieldDeviceSchema>;
export type UpdateFieldDeviceInput = z.infer<typeof updateFieldDeviceSchema>;
export type CreateFieldDeviceMeasurementInput = z.infer<typeof createFieldDeviceMeasurementSchema>;
export type CreateFieldSurveyReviewInput = z.infer<typeof createFieldSurveyReviewSchema>;
export type ReviewActionInput = z.infer<typeof reviewActionSchema>;

function issue(
  code: string,
  message: string,
  path?: string,
  severity: 'error' | 'warning' = 'error',
): FieldObservationValidationIssue {
  return { code, message, path, severity };
}

/** Allowed survey status transitions. */
export const SURVEY_STATUS_TRANSITIONS: Record<FieldSurveyStatus, FieldSurveyStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['UNDER_REVIEW', 'IN_PROGRESS'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'IN_PROGRESS'],
  APPROVED: [],
  REJECTED: ['IN_PROGRESS'],
  CANCELLED: [],
};

export class FieldObservationValidationService {
  constructor(private readonly repo: FieldObservationRepository) {}

  async validateSurveyCodeUnique(row: FieldSurvey): Promise<FieldObservationValidationResult> {
    const issues: FieldObservationValidationIssue[] = [];
    const existing = await this.repo.getSurveyByCode(row.surveyCode);
    if (existing && existing.id !== row.id && existing.isActive) {
      issues.push(issue('SURVEY_CODE_DUPLICATE', `Survey code already exists: ${row.surveyCode}`, 'surveyCode'));
    }
    return { valid: issues.length === 0, issues };
  }

  canTransition(from: FieldSurveyStatus, to: FieldSurveyStatus): boolean {
    if (from === to) return true;
    return SURVEY_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  validateObservationResult(
    row: FieldObservationResult,
    parameter: FieldParameter | null,
  ): FieldObservationValidationResult {
    const issues: FieldObservationValidationIssue[] = [];
    if (!parameter || !parameter.isActive) {
      issues.push(issue('PARAMETER_NOT_FOUND', 'Field parameter not found', 'parameterId'));
      return { valid: false, issues };
    }

    if (row.source?.toLowerCase().includes('laboratory')) {
      issues.push(
        issue(
          'LABORATORY_SOURCE_FORBIDDEN',
          'Field observation results must not be marked as laboratory results',
          'source',
        ),
      );
    }

    const from = row.observationDepthFromCm;
    const to = row.observationDepthToCm;
    if (from != null && from < 0) {
      issues.push(issue('NEGATIVE_DEPTH', 'DepthFrom must not be negative', 'observationDepthFromCm'));
    }
    if (to != null && to < 0) {
      issues.push(issue('NEGATIVE_DEPTH', 'DepthTo must not be negative', 'observationDepthToCm'));
    }
    if (from != null && to != null && from > to) {
      issues.push(
        issue('DEPTH_INTERVAL_INVALID', 'DepthFrom must not exceed DepthTo', 'observationDepthFromCm'),
      );
    }

    const hasNumeric = row.numericValue != null;
    const hasText = row.textValue != null && row.textValue !== '';
    const hasBool = row.booleanValue != null;
    const hasOption = row.optionId != null;

    switch (parameter.valueType) {
      case 'NUMERIC':
      case 'PERCENTAGE':
      case 'DEPTH':
        if (hasText && !hasNumeric) {
          issues.push(
            issue('VALUE_TYPE_MISMATCH', 'Numeric/depth/percentage parameters must not use textValue alone', 'textValue'),
          );
        }
        if (hasBool) {
          issues.push(issue('VALUE_TYPE_MISMATCH', 'Boolean value not allowed for numeric parameter', 'booleanValue'));
        }
        break;
      case 'BOOLEAN':
        if (hasNumeric) {
          issues.push(issue('VALUE_TYPE_MISMATCH', 'Numeric value not allowed for boolean parameter', 'numericValue'));
        }
        if (hasText) {
          issues.push(issue('VALUE_TYPE_MISMATCH', 'Text value not allowed for boolean parameter', 'textValue'));
        }
        break;
      case 'TEXT':
        if (hasNumeric && !hasText) {
          // allow numeric in raw only; measured typed field should be text
        }
        if (hasBool) {
          issues.push(issue('VALUE_TYPE_MISMATCH', 'Boolean value not allowed for text parameter', 'booleanValue'));
        }
        break;
      case 'ENUM':
      case 'CLASSIFICATION':
        if (hasNumeric && !hasOption) {
          issues.push(
            issue('VALUE_TYPE_MISMATCH', 'Enum/classification should use optionId, not numericValue', 'numericValue'),
          );
        }
        break;
      default:
        break;
    }

    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }
}
