import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.2H — Field Observation & Parcel Verification.
 * Aggregate root: FieldSurvey.
 * No suitability scoring, crop recommendation, AI, fertilizer/irrigation advice.
 */

export type FieldSurveyType =
  | 'INITIAL'
  | 'ROUTINE'
  | 'VERIFICATION'
  | 'FOLLOW_UP'
  | 'PROBLEM_DIAGNOSIS'
  | 'PRE_PLANTING'
  | 'POST_HARVEST';

export const FIELD_SURVEY_TYPES: readonly FieldSurveyType[] = [
  'INITIAL',
  'ROUTINE',
  'VERIFICATION',
  'FOLLOW_UP',
  'PROBLEM_DIAGNOSIS',
  'PRE_PLANTING',
  'POST_HARVEST',
] as const;

export type FieldSurveyStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export const FIELD_SURVEY_STATUSES: readonly FieldSurveyStatus[] = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type FieldParameterCategory =
  | 'SOIL_PROFILE'
  | 'DRAINAGE'
  | 'COMPACTION'
  | 'STONINESS'
  | 'EROSION'
  | 'SURFACE'
  | 'WATER'
  | 'IRRIGATION'
  | 'LAND_USE'
  | 'VEGETATION'
  | 'INFRASTRUCTURE'
  | 'MANAGEMENT';

export const FIELD_PARAMETER_CATEGORIES: readonly FieldParameterCategory[] = [
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
] as const;

export type FieldValueType =
  | 'NUMERIC'
  | 'BOOLEAN'
  | 'TEXT'
  | 'ENUM'
  | 'PERCENTAGE'
  | 'DEPTH'
  | 'CLASSIFICATION';

export const FIELD_VALUE_TYPES: readonly FieldValueType[] = [
  'NUMERIC',
  'BOOLEAN',
  'TEXT',
  'ENUM',
  'PERCENTAGE',
  'DEPTH',
  'CLASSIFICATION',
] as const;

export type FieldMeasurementScope = 'POINT' | 'ZONE' | 'PARCEL' | 'PROFILE' | 'SURVEY';

export const FIELD_MEASUREMENT_SCOPES: readonly FieldMeasurementScope[] = [
  'POINT',
  'ZONE',
  'PARCEL',
  'PROFILE',
  'SURVEY',
] as const;

export type FieldConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export const FIELD_CONFIDENCE_LEVELS: readonly FieldConfidenceLevel[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'VERY_HIGH',
] as const;

export type FieldEvidenceStatus =
  | 'NO_EVIDENCE'
  | 'PHOTO_ATTACHED'
  | 'VIDEO_ATTACHED'
  | 'GPS_CONFIRMED'
  | 'MEASUREMENT_DEVICE_CONFIRMED'
  | 'MULTIPLE_EVIDENCE';

export const FIELD_EVIDENCE_STATUSES: readonly FieldEvidenceStatus[] = [
  'NO_EVIDENCE',
  'PHOTO_ATTACHED',
  'VIDEO_ATTACHED',
  'GPS_CONFIRMED',
  'MEASUREMENT_DEVICE_CONFIRMED',
  'MULTIPLE_EVIDENCE',
] as const;

export type FieldReviewStatus = 'DRAFT' | 'REQUIRES_REVIEW' | 'VERIFIED' | 'REJECTED';

export const FIELD_REVIEW_STATUSES: readonly FieldReviewStatus[] = [
  'DRAFT',
  'REQUIRES_REVIEW',
  'VERIFIED',
  'REJECTED',
] as const;

export type FieldEvidenceType =
  | 'PHOTO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'MEASUREMENT_SCREENSHOT'
  | 'AUDIO_NOTE'
  | 'SKETCH';

export const FIELD_EVIDENCE_TYPES: readonly FieldEvidenceType[] = [
  'PHOTO',
  'VIDEO',
  'DOCUMENT',
  'MEASUREMENT_SCREENSHOT',
  'AUDIO_NOTE',
  'SKETCH',
] as const;

export type FieldDeviceType =
  | 'PENETROMETER'
  | 'SOIL_MOISTURE_METER'
  | 'EC_METER'
  | 'PH_METER'
  | 'GPS'
  | 'RANGE_FINDER'
  | 'INFILTROMETER'
  | 'FLOW_METER'
  | 'OTHER';

export const FIELD_DEVICE_TYPES: readonly FieldDeviceType[] = [
  'PENETROMETER',
  'SOIL_MOISTURE_METER',
  'EC_METER',
  'PH_METER',
  'GPS',
  'RANGE_FINDER',
  'INFILTROMETER',
  'FLOW_METER',
  'OTHER',
] as const;

export type FieldSurveyReviewStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED';

export const FIELD_SURVEY_REVIEW_STATUSES: readonly FieldSurveyReviewStatus[] = [
  'PENDING',
  'IN_REVIEW',
  'REVISION_REQUIRED',
  'APPROVED',
  'REJECTED',
] as const;

/** Observed / Measured / Reported / Derived — never mixed. */
export type FieldDataOrigin =
  | 'OBSERVED'
  | 'MEASURED'
  | 'REPORTED_BY_FARMER'
  | 'DERIVED'
  | 'IMPORTED'
  | 'EXPERT_ASSESSMENT';

export const FIELD_DATA_ORIGINS: readonly FieldDataOrigin[] = [
  'OBSERVED',
  'MEASURED',
  'REPORTED_BY_FARMER',
  'DERIVED',
  'IMPORTED',
  'EXPERT_ASSESSMENT',
] as const;

export type GeometryValidationStatus =
  | 'OK'
  | 'OUTSIDE_PARCEL'
  | 'REQUIRES_REVIEW'
  | 'NOT_CHECKED';

export type FieldSurvey = {
  id: string;
  surveyCode: string;
  parcelId: string;
  zoneId: string | null;
  samplingCampaignId: string | null;
  surveyType: FieldSurveyType;
  surveyPurpose: string | null;
  surveyDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  surveyedBy: string | null;
  responsibleExpert: string | null;
  organization: string | null;
  weatherCondition: string | null;
  previousRainfallCondition: string | null;
  parcelAccessibility: string | null;
  surveyStatus: FieldSurveyStatus;
  generalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type FieldObservationPoint = {
  id: string;
  surveyId: string;
  parcelId: string;
  zoneId: string | null;
  pointCode: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  geometry: string | null;
  accuracyMeters: number | null;
  observationDate: string | null;
  observedBy: string | null;
  landUse: string | null;
  currentCrop: string | null;
  previousCrop: string | null;
  surfaceCondition: string | null;
  notes: string | null;
  /** Soft geometry check outcome — data always preserved. */
  geometryValidationStatus: GeometryValidationStatus;
  geometryValidationMessage: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type FieldParameter = {
  id: string;
  code: string;
  canonicalName: string;
  turkishDisplayName: string;
  englishDisplayName: string;
  category: FieldParameterCategory;
  description: string | null;
  valueType: FieldValueType;
  canonicalUnitId: string | null;
  allowedMeasurementScope: FieldMeasurementScope;
  isRequiredForPhysicalSuitability: boolean;
  requiresPhotoEvidence: boolean;
  requiresGpsEvidence: boolean;
  requiresExpertVerification: boolean;
  displayOrder: number;
  source: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type FieldParameterOption = {
  id: string;
  parameterId: string;
  code: string;
  turkishLabel: string;
  englishLabel: string;
  displayOrder: number;
  description: string | null;
  source: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type FieldObservationResult = {
  id: string;
  surveyId: string;
  observationPointId: string | null;
  parameterId: string;
  rawValue: string | null;
  numericValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  optionId: string | null;
  unitId: string | null;
  observationMethod: string | null;
  observationDepthFromCm: number | null;
  observationDepthToCm: number | null;
  confidenceLevel: FieldConfidenceLevel;
  evidenceStatus: FieldEvidenceStatus;
  observedBy: string | null;
  observedAt: string | null;
  /** Must not be LaboratoryReported — field domain only. */
  source: string | null;
  dataOrigin: FieldDataOrigin;
  sourceInstitution: string | null;
  sourcePerson: string | null;
  sourceDate: string | null;
  verificationStatus: VerificationStatus;
  reviewStatus: FieldReviewStatus;
  reviewMessage: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type FieldEvidence = {
  id: string;
  surveyId: string;
  observationPointId: string | null;
  evidenceType: FieldEvidenceType;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string | null;
  fileHash: string;
  capturedAt: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  deviceId: string | null;
  description: string | null;
  isPrimary: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string;
  isActive: boolean;
};

/** Many-to-many: evidence ↔ observation results (no direct copy). */
export type FieldEvidenceResultLink = {
  id: string;
  evidenceId: string;
  observationResultId: string;
  createdAt: string;
};

export type FieldMeasurementDevice = {
  id: string;
  deviceCode: string;
  deviceName: string;
  deviceType: FieldDeviceType;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  calibrationDate: string | null;
  calibrationExpiryDate: string | null;
  calibrationCertificatePath: string | null;
  measurementUnitId: string | null;
  isCalibrated: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type FieldDeviceMeasurement = {
  id: string;
  observationResultId: string;
  deviceId: string;
  measuredValue: number | null;
  unitId: string | null;
  measuredAt: string;
  calibrationValidAtMeasurement: boolean;
  rawDeviceOutput: string | null;
  notes: string | null;
  createdAt: string;
  version: number;
  isActive: boolean;
};

export type FieldSurveyReview = {
  id: string;
  surveyId: string;
  reviewedBy: string;
  reviewerRole: string | null;
  reviewDate: string;
  reviewStatus: FieldSurveyReviewStatus;
  reviewNotes: string | null;
  approvedObservationCount: number;
  rejectedObservationCount: number;
  revisionRequestedCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type FieldSurveyAggregate = {
  survey: FieldSurvey;
  points: FieldObservationPoint[];
  results: FieldObservationResult[];
  evidence: FieldEvidence[];
  reviews: FieldSurveyReview[];
};

export type FieldParameterCatalog = {
  parameters: FieldParameter[];
  options: FieldParameterOption[];
};

export type FieldObservationValidationIssue = {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning';
};

export type FieldObservationValidationResult = {
  valid: boolean;
  issues: FieldObservationValidationIssue[];
};
