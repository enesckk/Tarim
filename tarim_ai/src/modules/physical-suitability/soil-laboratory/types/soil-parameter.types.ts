import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.2C — Soil Parameter Catalog, units, aliases, options.
 * No scientific interpretation ranges, crop thresholds, or suitability scores.
 */

export type SoilParameterValueType =
  | 'NUMERIC'
  | 'TEXT'
  | 'BOOLEAN'
  | 'ENUM'
  | 'PERCENTAGE'
  | 'RATIO'
  | 'CLASSIFICATION';

export const SOIL_PARAMETER_VALUE_TYPES: readonly SoilParameterValueType[] = [
  'NUMERIC',
  'TEXT',
  'BOOLEAN',
  'ENUM',
  'PERCENTAGE',
  'RATIO',
  'CLASSIFICATION',
] as const;

export type SoilMeasurementScope =
  | 'SAMPLE'
  | 'DEPTH_INTERVAL'
  | 'PARCEL'
  | 'ZONE'
  | 'PROFILE'
  | 'LABORATORY_REPORT';

export const SOIL_MEASUREMENT_SCOPES: readonly SoilMeasurementScope[] = [
  'SAMPLE',
  'DEPTH_INTERVAL',
  'PARCEL',
  'ZONE',
  'PROFILE',
  'LABORATORY_REPORT',
] as const;

export type SoilParameterDataType =
  | 'Decimal'
  | 'Integer'
  | 'Boolean'
  | 'Text'
  | 'Enum';

export type SoilParameterCategory =
  | 'Chemical'
  | 'Physical'
  | 'Hydrological'
  | 'FieldObservation'
  | 'Nutrient';

export type SoilParameterSubCategory =
  | 'AciditySalinity'
  | 'OrganicMatter'
  | 'CationExchange'
  | 'Texture'
  | 'DensityPorosity'
  | 'Fragments'
  | 'Depth'
  | 'WaterRetention'
  | 'Hydraulic'
  | 'DrainageStructure'
  | 'SurfaceCondition'
  | 'Macronutrient'
  | 'Micronutrient';

export type MeasurementQuantityType =
  | 'Dimensionless'
  | 'Acidity'
  | 'ElectricalConductivity'
  | 'Fraction'
  | 'MassConcentration'
  | 'ExchangeCapacity'
  | 'Density'
  | 'Length'
  | 'Velocity'
  /** Irrigation water — meq/L (no auto-convert to mg/L; ion-specific). */
  | 'ChargeConcentration'
  | 'Temperature'
  | 'Turbidity'
  | 'HardnessAsCaCO3';

export type UnitConversionType = 'Identity' | 'Linear' | 'OffsetLinear' | 'Unsupported';

export type NormalizationStatus =
  | 'NOT_REQUIRED'
  | 'NORMALIZED'
  | 'FAILED'
  | 'REQUIRES_REVIEW'
  | 'UNSUPPORTED_UNIT';

export const NORMALIZATION_STATUSES: readonly NormalizationStatus[] = [
  'NOT_REQUIRED',
  'NORMALIZED',
  'FAILED',
  'REQUIRES_REVIEW',
  'UNSUPPORTED_UNIT',
] as const;

export type SoilParameterAliasMatchType = 'EXACT' | 'NORMALIZED_TEXT' | 'LAB_SPECIFIC' | 'MANUAL';

export const SOIL_PARAMETER_ALIAS_MATCH_TYPES: readonly SoilParameterAliasMatchType[] = [
  'EXACT',
  'NORMALIZED_TEXT',
  'LAB_SPECIFIC',
  'MANUAL',
] as const;

/** Measured / Observed / Modelled / Derived — kept distinct from free-text source. */
export type SoilValueSourceType = 'Measured' | 'Observed' | 'Modelled' | 'Derived';

export const SOIL_VALUE_SOURCE_TYPES: readonly SoilValueSourceType[] = [
  'Measured',
  'Observed',
  'Modelled',
  'Derived',
] as const;

export type MeasurementUnit = {
  id: string;
  code: string;
  symbol: string;
  name: string;
  quantityType: MeasurementQuantityType;
  conversionType: UnitConversionType;
  conversionFactor: number;
  conversionOffset: number;
  canonicalUnitId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type SoilParameter = {
  id: string;
  code: string;
  canonicalName: string;
  turkishDisplayName: string;
  englishDisplayName: string;
  category: SoilParameterCategory;
  subCategory: SoilParameterSubCategory | null;
  description: string | null;
  canonicalUnitId: string | null;
  dataType: SoilParameterDataType;
  decimalPrecision: number | null;
  valueType: SoilParameterValueType;
  measurementScope: SoilMeasurementScope;
  isDirectlyMeasured: boolean;
  isCalculated: boolean;
  isFieldObservation: boolean;
  isLaboratoryParameter: boolean;
  isRequiredForPhysicalSuitability: boolean;
  isRequiredForFertilityAssessment: boolean;
  displayOrder: number;
  source: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type SoilParameterUnit = {
  id: string;
  parameterId: string;
  unitId: string;
  isCanonical: boolean;
  isAllowedForImport: boolean;
  requiresContext: boolean;
  conversionNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SoilParameterAlias = {
  id: string;
  parameterId: string;
  alias: string;
  language: string | null;
  laboratoryId: string | null;
  matchType: SoilParameterAliasMatchType;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SoilParameterOption = {
  id: string;
  parameterId: string;
  code: string;
  turkishLabel: string;
  englishLabel: string;
  displayOrder: number;
  source: string | null;
  verificationStatus: VerificationStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type UnitConversionResult = {
  ok: boolean;
  value: number | null;
  fromUnitCode: string;
  toUnitCode: string;
  status: NormalizationStatus;
  message: string | null;
};

export type AliasResolveResult = {
  parameterId: string | null;
  parameterCode: string | null;
  matchCount: number;
  status: 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED';
  matches: Array<{ aliasId: string; parameterId: string; matchType: SoilParameterAliasMatchType }>;
};
