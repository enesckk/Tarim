import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.1F — Crop Terrain Requirements factor codes.
 * Numeric thresholds stay null until source-verified; no suitability scoring.
 */
export type TerrainFactor =
  | 'ELEVATION'
  | 'SLOPE'
  | 'ASPECT'
  | 'SOLAR_EXPOSURE'
  | 'TWI'
  | 'FLOW_ACCUMULATION'
  | 'EROSION_RISK';

export const TERRAIN_FACTORS: readonly TerrainFactor[] = [
  'ELEVATION',
  'SLOPE',
  'ASPECT',
  'SOLAR_EXPOSURE',
  'TWI',
  'FLOW_ACCUMULATION',
  'EROSION_RISK',
] as const;

export type TerrainFactorCatalogEntry = {
  terrainFactor: TerrainFactor;
  unit: string;
  description: string;
};

/** Catalog metadata only — no numeric thresholds. */
export const TERRAIN_FACTOR_CATALOG: readonly TerrainFactorCatalogEntry[] = [
  {
    terrainFactor: 'ELEVATION',
    unit: 'm',
    description: 'Elevation above sea level preference / tolerance envelope.',
  },
  {
    terrainFactor: 'SLOPE',
    unit: '%',
    description: 'Terrain slope gradient requirement envelope.',
  },
  {
    terrainFactor: 'ASPECT',
    unit: '°',
    description: 'Slope aspect / facing direction preference (structural).',
  },
  {
    terrainFactor: 'SOLAR_EXPOSURE',
    unit: 'index',
    description: 'Relative solar exposure / insolation preference.',
  },
  {
    terrainFactor: 'TWI',
    unit: 'index',
    description: 'Topographic wetness index preference / tolerance.',
  },
  {
    terrainFactor: 'FLOW_ACCUMULATION',
    unit: 'cells',
    description: 'Upslope flow accumulation context (structural).',
  },
  {
    terrainFactor: 'EROSION_RISK',
    unit: 'index',
    description: 'Relative erosion risk tolerance class / index.',
  },
];

/**
 * TerrainRequirement — independent terrain factor entity per crop.
 * Threshold fields exist structurally; remain null until verified.
 */
export type TerrainRequirement = {
  id: string;
  cropId: string;
  cropKnowledgeId: string;
  terrainRequirementsId: string;
  terrainFactor: TerrainFactor;
  minimum: number | null;
  optimalMinimum: number | null;
  optimalMaximum: number | null;
  maximum: number | null;
  preferred: number | null;
  unit: string;
  description: string | null;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type CropTerrainRequirementsDto = {
  sectionId: string;
  cropKnowledgeId: string;
  cropCode: string | null;
  notes: string | null;
  requirements: TerrainRequirement[];
};

export type TerrainRequirementsValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type TerrainRequirementsValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: TerrainRequirementsValidationIssue[];
};
