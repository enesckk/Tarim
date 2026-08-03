import type {
  MeasurementUnit,
  NormalizationStatus,
} from '../../soil-laboratory/types/soil-parameter.types.js';
import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.2G — Irrigation Water Laboratory.
 * Aggregate root: IrrigationWaterAnalysis.
 * No crop suitability, irrigation scheduling, AI, or automatic decisions.
 */

export type WaterSourceType =
  | 'WELL'
  | 'SPRING'
  | 'STREAM'
  | 'RIVER'
  | 'CANAL'
  | 'RESERVOIR'
  | 'POND'
  | 'DAM'
  | 'MUNICIPAL_NETWORK'
  | 'RAINWATER_STORAGE'
  | 'TREATED_WASTEWATER'
  | 'OTHER';

export const WATER_SOURCE_TYPES: readonly WaterSourceType[] = [
  'WELL',
  'SPRING',
  'STREAM',
  'RIVER',
  'CANAL',
  'RESERVOIR',
  'POND',
  'DAM',
  'MUNICIPAL_NETWORK',
  'RAINWATER_STORAGE',
  'TREATED_WASTEWATER',
  'OTHER',
] as const;

export type WaterOwnershipType =
  | 'PRIVATE'
  | 'PUBLIC'
  | 'COOPERATIVE'
  | 'SHARED'
  | 'UNKNOWN';

export const WATER_OWNERSHIP_TYPES: readonly WaterOwnershipType[] = [
  'PRIVATE',
  'PUBLIC',
  'COOPERATIVE',
  'SHARED',
  'UNKNOWN',
] as const;

export type WaterLicenseStatus =
  | 'LICENSED'
  | 'UNLICENSED'
  | 'PENDING'
  | 'EXPIRED'
  | 'UNKNOWN';

export const WATER_LICENSE_STATUSES: readonly WaterLicenseStatus[] = [
  'LICENSED',
  'UNLICENSED',
  'PENDING',
  'EXPIRED',
  'UNKNOWN',
] as const;

export type WaterContinuityStatus =
  | 'CONTINUOUS'
  | 'SEASONAL'
  | 'INTERMITTENT'
  | 'UNKNOWN';

export const WATER_CONTINUITY_STATUSES: readonly WaterContinuityStatus[] = [
  'CONTINUOUS',
  'SEASONAL',
  'INTERMITTENT',
  'UNKNOWN',
] as const;

export type WaterSampleStatus =
  | 'PLANNED'
  | 'COLLECTED'
  | 'IN_TRANSPORT'
  | 'RECEIVED'
  | 'IN_ANALYSIS'
  | 'ANALYZED'
  | 'APPROVED'
  | 'ARCHIVED'
  | 'REJECTED';

export const WATER_SAMPLE_STATUSES: readonly WaterSampleStatus[] = [
  'PLANNED',
  'COLLECTED',
  'IN_TRANSPORT',
  'RECEIVED',
  'IN_ANALYSIS',
  'ANALYZED',
  'APPROVED',
  'ARCHIVED',
  'REJECTED',
] as const;

export type WaterParameterCategory =
  | 'GENERAL'
  | 'SALINITY'
  | 'SODICITY'
  | 'MAJOR_CATION'
  | 'MAJOR_ANION'
  | 'TOXICITY'
  | 'NUTRIENT'
  | 'MICROBIOLOGICAL'
  | 'PHYSICAL'
  | 'DERIVED';

export const WATER_PARAMETER_CATEGORIES: readonly WaterParameterCategory[] = [
  'GENERAL',
  'SALINITY',
  'SODICITY',
  'MAJOR_CATION',
  'MAJOR_ANION',
  'TOXICITY',
  'NUTRIENT',
  'MICROBIOLOGICAL',
  'PHYSICAL',
  'DERIVED',
] as const;

export type WaterParameterDataType = 'Decimal' | 'Integer' | 'Boolean' | 'Text' | 'Enum';

export type WaterDerivedIndicatorCode =
  | 'SAR'
  | 'ADJUSTED_SAR'
  | 'RSC'
  | 'TOTAL_HARDNESS'
  | 'SODIUM_PERCENTAGE'
  | 'ION_BALANCE_ERROR';

export const WATER_DERIVED_INDICATOR_CODES: readonly WaterDerivedIndicatorCode[] = [
  'SAR',
  'ADJUSTED_SAR',
  'RSC',
  'TOTAL_HARDNESS',
  'SODIUM_PERCENTAGE',
  'ION_BALANCE_ERROR',
] as const;

export type WaterCalculationStatus =
  | 'CALCULATED'
  | 'INSUFFICIENT_DATA'
  | 'INVALID_INPUT'
  | 'REQUIRES_REVIEW'
  | 'FAILED';

export const WATER_CALCULATION_STATUSES: readonly WaterCalculationStatus[] = [
  'CALCULATED',
  'INSUFFICIENT_DATA',
  'INVALID_INPUT',
  'REQUIRES_REVIEW',
  'FAILED',
] as const;

export type WaterCustodyAction =
  | 'COLLECTED'
  | 'SEALED'
  | 'TRANSPORTED'
  | 'RECEIVED'
  | 'OPENED'
  | 'ANALYZED'
  | 'APPROVED'
  | 'ARCHIVED'
  | 'DESTROYED';

export const WATER_CUSTODY_ACTIONS: readonly WaterCustodyAction[] = [
  'COLLECTED',
  'SEALED',
  'TRANSPORTED',
  'RECEIVED',
  'OPENED',
  'ANALYZED',
  'APPROVED',
  'ARCHIVED',
  'DESTROYED',
] as const;

export type { MeasurementUnit, NormalizationStatus };

export type WaterSource = {
  id: string;
  parcelId: string | null;
  sourceCode: string;
  sourceName: string;
  sourceType: WaterSourceType;
  ownershipType: WaterOwnershipType;
  latitude: number | null;
  longitude: number | null;
  geometry: string | null;
  isInsideParcel: boolean | null;
  relatedParcelId: string | null;
  officialRegistrationNumber: string | null;
  licenseNumber: string | null;
  licenseStatus: WaterLicenseStatus;
  permitStartDate: string | null;
  permitEndDate: string | null;
  intendedUse: string | null;
  declaredDischarge: number | null;
  declaredDischargeUnit: string | null;
  measuredDischarge: number | null;
  measuredDischargeUnit: string | null;
  wellDepth: number | null;
  staticWaterLevel: number | null;
  dynamicWaterLevel: number | null;
  seasonalAvailability: string | null;
  continuityStatus: WaterContinuityStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type WaterSample = {
  id: string;
  waterSourceId: string;
  sampleCode: string;
  samplingDate: string | null;
  samplingTime: string | null;
  latitude: number | null;
  longitude: number | null;
  sampledBy: string | null;
  samplingPointDescription: string | null;
  samplingMethod: string | null;
  containerType: string | null;
  preservationMethod: string | null;
  transportCondition: string | null;
  receivedDate: string | null;
  /** Opaque reference to shared Laboratory (2.2A) — not enforced at runtime. */
  laboratoryId: string | null;
  laboratoryReportId: string | null;
  waterTemperatureAtSampling: number | null;
  weatherCondition: string | null;
  currentStatus: WaterSampleStatus;
  barcode: string | null;
  qrCode: string | null;
  sealNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/** Aggregate: WaterParameterCatalog */
export type WaterParameter = {
  id: string;
  code: string;
  canonicalName: string;
  turkishDisplayName: string;
  englishDisplayName: string;
  category: WaterParameterCategory;
  description: string | null;
  canonicalUnitId: string | null;
  dataType: WaterParameterDataType;
  decimalPrecision: number | null;
  isDirectlyMeasured: boolean;
  isCalculated: boolean;
  isRequiredForIrrigationAssessment: boolean;
  displayOrder: number;
  source: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/**
 * Laboratory-reported result for a water sample.
 * Distinct from WaterDerivedIndicator (engine-calculated).
 */
export type WaterAnalysisResult = {
  id: string;
  sampleId: string;
  parameterId: string;
  rawParameterName: string | null;
  rawValue: string | null;
  rawUnit: string | null;
  measuredValue: number | null;
  measuredUnitId: string | null;
  normalizedValue: number | null;
  normalizedUnitId: string | null;
  /** Opaque reference to shared AnalysisMethod (2.2A). */
  analysisMethodId: string | null;
  detectionLimit: number | null;
  measurementUncertainty: number | null;
  qualityFlag: string | null;
  isAccredited: boolean | null;
  source: string | null;
  verificationStatus: VerificationStatus;
  normalizationStatus: NormalizationStatus;
  normalizationMessage: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type WaterDerivedIndicator = {
  id: string;
  sampleId: string;
  indicatorCode: WaterDerivedIndicatorCode;
  calculatedValue: number | null;
  unitId: string | null;
  formulaVersion: string;
  inputParametersJson: string;
  calculationStatus: WaterCalculationStatus;
  calculationMessage: string | null;
  calculatedAt: string;
  source: string;
  verificationStatus: VerificationStatus;
  version: number;
  isActive: boolean;
};

export type WaterSampleChainOfCustody = {
  id: string;
  sampleId: string;
  action: WaterCustodyAction;
  performedBy: string | null;
  performedAt: string;
  location: string | null;
  notes: string | null;
};

/** Aggregate root */
export type IrrigationWaterAnalysis = {
  waterSource: WaterSource;
  samples: WaterSample[];
  results: WaterAnalysisResult[];
  derivedIndicators: WaterDerivedIndicator[];
  chainOfCustody: WaterSampleChainOfCustody[];
};

export type WaterParameterCatalog = {
  parameters: WaterParameter[];
  units: MeasurementUnit[];
};

export type IrrigationWaterValidationIssue = {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning';
};

export type IrrigationWaterValidationResult = {
  valid: boolean;
  issues: IrrigationWaterValidationIssue[];
};
