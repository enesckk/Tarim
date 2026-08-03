import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.1G — Crop Risk Profile risk type codes.
 * RiskLevel / Sensitivity stay Unknown until source-verified; no suitability scoring.
 */
export type RiskType =
  | 'FROST'
  | 'DROUGHT'
  | 'HEAT'
  | 'EXCESS_RAIN'
  | 'FLOOD'
  | 'SALINITY'
  | 'SODICITY'
  | 'EROSION'
  | 'DISEASE'
  | 'PEST'
  | 'WIND'
  | 'HAIL';

export const RISK_TYPES: readonly RiskType[] = [
  'FROST',
  'DROUGHT',
  'HEAT',
  'EXCESS_RAIN',
  'FLOOD',
  'SALINITY',
  'SODICITY',
  'EROSION',
  'DISEASE',
  'PEST',
  'WIND',
  'HAIL',
] as const;

/** Qualitative severity class — not a suitability score. */
export type RiskLevel = 'Unknown' | 'Low' | 'Moderate' | 'High' | 'Critical';

export const RISK_LEVELS: readonly RiskLevel[] = [
  'Unknown',
  'Low',
  'Moderate',
  'High',
  'Critical',
] as const;

/** Crop sensitivity to the risk type — structural only. */
export type RiskSensitivity = 'Unknown' | 'Low' | 'Moderate' | 'High';

export const RISK_SENSITIVITIES: readonly RiskSensitivity[] = [
  'Unknown',
  'Low',
  'Moderate',
  'High',
] as const;

export type RiskTypeCatalogEntry = {
  riskType: RiskType;
  description: string;
};

/** Catalog metadata only — no scored risk output. */
export const RISK_TYPE_CATALOG: readonly RiskTypeCatalogEntry[] = [
  { riskType: 'FROST', description: 'Frost / freeze injury exposure.' },
  { riskType: 'DROUGHT', description: 'Drought / prolonged water deficit exposure.' },
  { riskType: 'HEAT', description: 'Heat stress / extreme temperature exposure.' },
  { riskType: 'EXCESS_RAIN', description: 'Excess rainfall / waterlogging pressure.' },
  { riskType: 'FLOOD', description: 'Flood inundation exposure.' },
  { riskType: 'SALINITY', description: 'Soil / water salinity stress.' },
  { riskType: 'SODICITY', description: 'Sodic soil stress.' },
  { riskType: 'EROSION', description: 'Soil erosion exposure.' },
  { riskType: 'DISEASE', description: 'Disease pressure (structural catalog shell).' },
  { riskType: 'PEST', description: 'Pest pressure (structural catalog shell).' },
  { riskType: 'WIND', description: 'Wind damage / lodging exposure.' },
  { riskType: 'HAIL', description: 'Hail damage exposure.' },
];

/**
 * CropRisk — independent risk-type entity per crop.
 * Level/sensitivity remain Unknown until verified; mitigation stays null until sourced.
 */
export type CropRisk = {
  id: string;
  cropId: string;
  cropKnowledgeId: string;
  riskProfileId: string;
  riskType: RiskType;
  riskLevel: RiskLevel;
  sensitivity: RiskSensitivity;
  description: string | null;
  mitigationSuggestion: string | null;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type CropRiskProfileDto = {
  sectionId: string;
  cropKnowledgeId: string;
  cropCode: string | null;
  notes: string | null;
  risks: CropRisk[];
};

export type CropRiskValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type CropRiskValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: CropRiskValidationIssue[];
};
