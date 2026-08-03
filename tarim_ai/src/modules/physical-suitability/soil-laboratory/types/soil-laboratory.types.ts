import type { VerificationStatus } from '../../types/physical-suitability.types.js';
import type {
  NormalizationStatus,
  SoilValueSourceType,
} from './soil-parameter.types.js';

export type {
  AliasResolveResult,
  MeasurementQuantityType,
  MeasurementUnit,
  NormalizationStatus,
  SoilMeasurementScope,
  SoilParameter,
  SoilParameterAlias,
  SoilParameterAliasMatchType,
  SoilParameterCategory,
  SoilParameterDataType,
  SoilParameterOption,
  SoilParameterSubCategory,
  SoilParameterUnit,
  SoilParameterValueType,
  SoilValueSourceType,
  UnitConversionResult,
  UnitConversionType,
} from './soil-parameter.types.js';

export {
  NORMALIZATION_STATUSES,
  SOIL_MEASUREMENT_SCOPES,
  SOIL_PARAMETER_ALIAS_MATCH_TYPES,
  SOIL_PARAMETER_VALUE_TYPES,
  SOIL_VALUE_SOURCE_TYPES,
} from './soil-parameter.types.js';

/**
 * Phase 2.2A/C — Soil Laboratory core + parameter catalog.
 * No suitability scoring, crop recommendation, fertilizer/irrigation, or AI.
 */

export type SoilQualityFlag =
  | 'Unknown'
  | 'Accepted'
  | 'Suspect'
  | 'Rejected'
  | 'BelowDetectionLimit'
  | 'AboveRange';

export const SOIL_QUALITY_FLAGS: readonly SoilQualityFlag[] = [
  'Unknown',
  'Accepted',
  'Suspect',
  'Rejected',
  'BelowDetectionLimit',
  'AboveRange',
] as const;

/** Accredited / partner laboratory catalog entity. */
export type Laboratory = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  accreditationNumber: string | null;
  accreditationStandard: string | null;
  contact: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

/** Laboratory analysis method / standard catalog entity. */
export type AnalysisMethod = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  standard: string | null;
  organization: string | null;
  methodVersion: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

/**
 * SoilSample — field sample metadata for a parcel.
 */
export type SoilSample = {
  id: string;
  parcelId: string;
  sampleCode: string;
  laboratoryId: string | null;
  samplingDate: string | null;
  analysisDate: string | null;
  samplingDepthFromCm: number | null;
  samplingDepthToCm: number | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  samplerName: string | null;
  sampleMethod: string | null;
  weatherCondition: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/**
 * SoilAnalysisResult — one measured parameter row per sample.
 * Raw lab payload is immutable once set; normalized fields are derived.
 */
export type SoilAnalysisResult = {
  id: string;
  sampleId: string;
  parameterCode: string;
  parameterName: string;
  measuredValue: number | null;
  unit: string;
  analysisMethodId: string | null;
  analysisMethod: string | null;
  detectionLimit: number | null;
  measurementUncertainty: number | null;
  qualityFlag: SoilQualityFlag;
  isAccredited: boolean;
  /** Free-text provenance note (lab report id, citation, etc.). */
  source: string | null;
  /** Distinct source typology — Measured / Observed / Modelled / Derived. */
  valueSourceType: SoilValueSourceType | null;
  verificationStatus: VerificationStatus;
  /** Immutable lab-report payload (never overwritten after create). */
  rawValue: string | null;
  rawUnit: string | null;
  normalizedValue: number | null;
  normalizedUnitId: string | null;
  normalizationStatus: NormalizationStatus;
  normalizationMessage: string | null;
  originalParameterName: string | null;
  originalMethodName: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/**
 * SoilAnalysis aggregate root (read model).
 */
export type SoilAnalysis = {
  sampleId: string;
  parcelId: string;
  sample: SoilSample;
  results: SoilAnalysisResult[];
  laboratory: Laboratory | null;
};

export type SoilAnalysisDto = SoilAnalysis;

export type SoilLaboratoryValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type SoilLaboratoryValidationResult = {
  valid: boolean;
  issues: SoilLaboratoryValidationIssue[];
  sampleId?: string;
  laboratoryId?: string;
  analysisMethodId?: string;
  resultId?: string;
  parameterId?: string;
};
