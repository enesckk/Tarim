import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.1D — Crop Soil Requirements factor codes.
 * Numeric thresholds stay null until source-verified; no suitability / lab linkage.
 */
export type SoilFactor =
  | 'TEXTURE'
  | 'PH'
  | 'EC'
  | 'ORGANIC_MATTER'
  | 'LIME'
  | 'CEC'
  | 'BULK_DENSITY'
  | 'ROOTING_DEPTH'
  | 'DRAINAGE'
  | 'STONE_CONTENT'
  | 'SALINITY'
  | 'SODICITY'
  | 'SOIL_DEPTH'
  | 'SOIL_MOISTURE'
  | 'FIELD_CAPACITY'
  | 'PERMANENT_WILTING_POINT';

export const SOIL_FACTORS: readonly SoilFactor[] = [
  'TEXTURE',
  'PH',
  'EC',
  'ORGANIC_MATTER',
  'LIME',
  'CEC',
  'BULK_DENSITY',
  'ROOTING_DEPTH',
  'DRAINAGE',
  'STONE_CONTENT',
  'SALINITY',
  'SODICITY',
  'SOIL_DEPTH',
  'SOIL_MOISTURE',
  'FIELD_CAPACITY',
  'PERMANENT_WILTING_POINT',
] as const;

export type SoilToleranceLevel = 'Unknown' | 'Narrow' | 'Moderate' | 'Wide';

export type SoilImportanceLevel = 'Required' | 'Important' | 'Supporting' | 'Optional';

export type SoilFactorCatalogEntry = {
  soilFactor: SoilFactor;
  unit: string;
  description: string;
  importanceLevel: SoilImportanceLevel;
};

/** Catalog metadata only — no numeric thresholds. */
export const SOIL_FACTOR_CATALOG: readonly SoilFactorCatalogEntry[] = [
  {
    soilFactor: 'TEXTURE',
    unit: 'class',
    description: 'Soil texture class preference / tolerance.',
    importanceLevel: 'Required',
  },
  {
    soilFactor: 'PH',
    unit: 'pH',
    description: 'Soil reaction (pH) requirement envelope.',
    importanceLevel: 'Required',
  },
  {
    soilFactor: 'EC',
    unit: 'dS/m',
    description: 'Electrical conductivity / salinity-related envelope.',
    importanceLevel: 'Important',
  },
  {
    soilFactor: 'ORGANIC_MATTER',
    unit: '%',
    description: 'Soil organic matter content preference.',
    importanceLevel: 'Important',
  },
  {
    soilFactor: 'LIME',
    unit: '%',
    description: 'Calcium carbonate / lime content tolerance.',
    importanceLevel: 'Supporting',
  },
  {
    soilFactor: 'CEC',
    unit: 'cmol+/kg',
    description: 'Cation exchange capacity preference.',
    importanceLevel: 'Supporting',
  },
  {
    soilFactor: 'BULK_DENSITY',
    unit: 'g/cm³',
    description: 'Bulk density / compaction sensitivity.',
    importanceLevel: 'Important',
  },
  {
    soilFactor: 'ROOTING_DEPTH',
    unit: 'cm',
    description: 'Effective rooting depth requirement.',
    importanceLevel: 'Required',
  },
  {
    soilFactor: 'DRAINAGE',
    unit: 'class',
    description: 'Natural drainage class preference.',
    importanceLevel: 'Important',
  },
  {
    soilFactor: 'STONE_CONTENT',
    unit: '%',
    description: 'Coarse fragment / stone content tolerance.',
    importanceLevel: 'Supporting',
  },
  {
    soilFactor: 'SALINITY',
    unit: 'dS/m',
    description: 'Soil salinity stress tolerance envelope.',
    importanceLevel: 'Important',
  },
  {
    soilFactor: 'SODICITY',
    unit: 'ESP %',
    description: 'Sodicity / exchangeable sodium percentage tolerance.',
    importanceLevel: 'Important',
  },
  {
    soilFactor: 'SOIL_DEPTH',
    unit: 'cm',
    description: 'Total soil depth requirement.',
    importanceLevel: 'Required',
  },
  {
    soilFactor: 'SOIL_MOISTURE',
    unit: '%',
    description: 'Soil moisture status preference (structural).',
    importanceLevel: 'Supporting',
  },
  {
    soilFactor: 'FIELD_CAPACITY',
    unit: '%',
    description: 'Field capacity moisture reference (structural).',
    importanceLevel: 'Supporting',
  },
  {
    soilFactor: 'PERMANENT_WILTING_POINT',
    unit: '%',
    description: 'Permanent wilting point reference (structural).',
    importanceLevel: 'Supporting',
  },
];

/**
 * SoilRequirement — independent soil factor entity per crop.
 * Threshold fields exist structurally; remain null until verified.
 * No laboratory linkage or suitability scoring in Phase 2.1D.
 */
export type SoilRequirement = {
  id: string;
  cropId: string;
  cropKnowledgeId: string;
  soilRequirementsId: string;
  soilFactor: SoilFactor;
  minimum: number | null;
  optimalMinimum: number | null;
  optimalMaximum: number | null;
  maximum: number | null;
  preferred: number | null;
  importanceLevel: SoilImportanceLevel;
  toleranceLevel: SoilToleranceLevel;
  unit: string;
  description: string | null;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type CropSoilRequirementsDto = {
  sectionId: string;
  cropKnowledgeId: string;
  cropCode: string | null;
  notes: string | null;
  requirements: SoilRequirement[];
};

export type SoilRequirementsValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type SoilRequirementsValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: SoilRequirementsValidationIssue[];
};
