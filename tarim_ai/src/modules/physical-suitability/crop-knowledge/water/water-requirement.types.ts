import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.1E — Crop Water Requirements factor codes.
 * Numeric thresholds stay null until source-verified; no suitability scoring.
 */
export type WaterFactor =
  | 'TOTAL_WATER_REQUIREMENT'
  | 'IRRIGATION_REQUIREMENT'
  | 'IRRIGATION_INTERVAL'
  | 'CRITICAL_IRRIGATION_STAGE'
  | 'WATER_STRESS_TOLERANCE'
  | 'DROUGHT_TOLERANCE'
  | 'SALINE_WATER_TOLERANCE'
  | 'BORON_TOLERANCE'
  | 'SAR_TOLERANCE';

export const WATER_FACTORS: readonly WaterFactor[] = [
  'TOTAL_WATER_REQUIREMENT',
  'IRRIGATION_REQUIREMENT',
  'IRRIGATION_INTERVAL',
  'CRITICAL_IRRIGATION_STAGE',
  'WATER_STRESS_TOLERANCE',
  'DROUGHT_TOLERANCE',
  'SALINE_WATER_TOLERANCE',
  'BORON_TOLERANCE',
  'SAR_TOLERANCE',
] as const;

export type WaterToleranceLevel = 'Unknown' | 'Narrow' | 'Moderate' | 'Wide';

export type WaterImportanceLevel = 'Required' | 'Important' | 'Supporting' | 'Optional';

export type WaterFactorCatalogEntry = {
  waterFactor: WaterFactor;
  unit: string;
  description: string;
  importanceLevel: WaterImportanceLevel;
};

/** Catalog metadata only — no numeric thresholds. */
export const WATER_FACTOR_CATALOG: readonly WaterFactorCatalogEntry[] = [
  {
    waterFactor: 'TOTAL_WATER_REQUIREMENT',
    unit: 'mm',
    description: 'Seasonal total crop water requirement (ETc) envelope.',
    importanceLevel: 'Required',
  },
  {
    waterFactor: 'IRRIGATION_REQUIREMENT',
    unit: 'mm',
    description: 'Net irrigation requirement envelope (structural).',
    importanceLevel: 'Required',
  },
  {
    waterFactor: 'IRRIGATION_INTERVAL',
    unit: 'days',
    description: 'Typical irrigation interval preference (structural).',
    importanceLevel: 'Important',
  },
  {
    waterFactor: 'CRITICAL_IRRIGATION_STAGE',
    unit: 'stage_code',
    description: 'Phenology stage(s) where irrigation is most critical (structural link).',
    importanceLevel: 'Important',
  },
  {
    waterFactor: 'WATER_STRESS_TOLERANCE',
    unit: 'index',
    description: 'Relative water-stress tolerance class / index.',
    importanceLevel: 'Important',
  },
  {
    waterFactor: 'DROUGHT_TOLERANCE',
    unit: 'index',
    description: 'Relative drought tolerance class / index.',
    importanceLevel: 'Important',
  },
  {
    waterFactor: 'SALINE_WATER_TOLERANCE',
    unit: 'dS/m',
    description: 'Irrigation water salinity (ECw) tolerance envelope.',
    importanceLevel: 'Supporting',
  },
  {
    waterFactor: 'BORON_TOLERANCE',
    unit: 'mg/L',
    description: 'Irrigation water boron concentration tolerance.',
    importanceLevel: 'Supporting',
  },
  {
    waterFactor: 'SAR_TOLERANCE',
    unit: 'SAR',
    description: 'Sodium adsorption ratio tolerance for irrigation water.',
    importanceLevel: 'Supporting',
  },
];

/**
 * WaterRequirement — independent water factor entity per crop.
 * Threshold fields exist structurally; remain null until verified.
 */
export type WaterRequirement = {
  id: string;
  cropId: string;
  cropKnowledgeId: string;
  waterRequirementsId: string;
  waterFactor: WaterFactor;
  minimum: number | null;
  optimalMinimum: number | null;
  optimalMaximum: number | null;
  maximum: number | null;
  preferred: number | null;
  unit: string;
  toleranceLevel: WaterToleranceLevel;
  importanceLevel: WaterImportanceLevel;
  description: string | null;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type CropWaterRequirementsDto = {
  sectionId: string;
  cropKnowledgeId: string;
  cropCode: string | null;
  notes: string | null;
  requirements: WaterRequirement[];
};

export type WaterRequirementsValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type WaterRequirementsValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: WaterRequirementsValidationIssue[];
};
