import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.1C — Crop Climate Requirements factor codes.
 * Numeric thresholds stay null until source-verified; no suitability scoring.
 */
export type ClimateFactor =
  | 'AIR_TEMPERATURE'
  | 'SOIL_TEMPERATURE'
  | 'GDD'
  | 'FROST'
  | 'FROST_FREE_PERIOD'
  | 'EXTREME_HEAT'
  | 'HEAT_WAVE'
  | 'RAINFALL'
  | 'RAINFALL_DISTRIBUTION'
  | 'HUMIDITY'
  | 'SOLAR_RADIATION'
  | 'SUNSHINE_DURATION'
  | 'DAY_LENGTH'
  | 'WIND'
  | 'EVAPOTRANSPIRATION'
  | 'CLIMATIC_WATER_DEFICIT';

export const CLIMATE_FACTORS: readonly ClimateFactor[] = [
  'AIR_TEMPERATURE',
  'SOIL_TEMPERATURE',
  'GDD',
  'FROST',
  'FROST_FREE_PERIOD',
  'EXTREME_HEAT',
  'HEAT_WAVE',
  'RAINFALL',
  'RAINFALL_DISTRIBUTION',
  'HUMIDITY',
  'SOLAR_RADIATION',
  'SUNSHINE_DURATION',
  'DAY_LENGTH',
  'WIND',
  'EVAPOTRANSPIRATION',
  'CLIMATIC_WATER_DEFICIT',
] as const;

export type ClimateToleranceLevel = 'Unknown' | 'Narrow' | 'Moderate' | 'Wide';

export type ClimateImportanceLevel =
  | 'Required'
  | 'Important'
  | 'Supporting'
  | 'Optional';

export type ClimateFactorCatalogEntry = {
  climateFactor: ClimateFactor;
  unit: string;
  scientificExplanation: string;
  importanceLevel: ClimateImportanceLevel;
};

/** Catalog metadata only — no numeric thresholds. */
export const CLIMATE_FACTOR_CATALOG: readonly ClimateFactorCatalogEntry[] = [
  {
    climateFactor: 'AIR_TEMPERATURE',
    unit: '°C',
    scientificExplanation: 'Near-surface air temperature requirement envelope.',
    importanceLevel: 'Required',
  },
  {
    climateFactor: 'SOIL_TEMPERATURE',
    unit: '°C',
    scientificExplanation: 'Soil temperature at root-zone relevant depth.',
    importanceLevel: 'Important',
  },
  {
    climateFactor: 'GDD',
    unit: '°C·d',
    scientificExplanation: 'Growing degree days accumulation requirement.',
    importanceLevel: 'Important',
  },
  {
    climateFactor: 'FROST',
    unit: '°C',
    scientificExplanation: 'Frost / freezing temperature sensitivity.',
    importanceLevel: 'Required',
  },
  {
    climateFactor: 'FROST_FREE_PERIOD',
    unit: 'days',
    scientificExplanation: 'Required frost-free period length.',
    importanceLevel: 'Important',
  },
  {
    climateFactor: 'EXTREME_HEAT',
    unit: '°C',
    scientificExplanation: 'Extreme high-temperature tolerance limit.',
    importanceLevel: 'Important',
  },
  {
    climateFactor: 'HEAT_WAVE',
    unit: 'days',
    scientificExplanation: 'Heat-wave duration / intensity sensitivity (structural).',
    importanceLevel: 'Supporting',
  },
  {
    climateFactor: 'RAINFALL',
    unit: 'mm',
    scientificExplanation: 'Seasonal / annual rainfall requirement envelope.',
    importanceLevel: 'Required',
  },
  {
    climateFactor: 'RAINFALL_DISTRIBUTION',
    unit: 'categorical',
    scientificExplanation: 'Intra-season rainfall distribution preference (structural).',
    importanceLevel: 'Supporting',
  },
  {
    climateFactor: 'HUMIDITY',
    unit: '%',
    scientificExplanation: 'Relative humidity preference / tolerance.',
    importanceLevel: 'Supporting',
  },
  {
    climateFactor: 'SOLAR_RADIATION',
    unit: 'MJ/m²/d',
    scientificExplanation: 'Solar radiation energy requirement.',
    importanceLevel: 'Important',
  },
  {
    climateFactor: 'SUNSHINE_DURATION',
    unit: 'h/d',
    scientificExplanation: 'Sunshine duration preference.',
    importanceLevel: 'Supporting',
  },
  {
    climateFactor: 'DAY_LENGTH',
    unit: 'h',
    scientificExplanation: 'Photoperiod / day-length sensitivity.',
    importanceLevel: 'Supporting',
  },
  {
    climateFactor: 'WIND',
    unit: 'm/s',
    scientificExplanation: 'Wind speed tolerance / exposure sensitivity.',
    importanceLevel: 'Optional',
  },
  {
    climateFactor: 'EVAPOTRANSPIRATION',
    unit: 'mm',
    scientificExplanation: 'Reference / crop evapotranspiration context.',
    importanceLevel: 'Important',
  },
  {
    climateFactor: 'CLIMATIC_WATER_DEFICIT',
    unit: 'mm',
    scientificExplanation: 'Climatic water deficit (P − ET) structural factor.',
    importanceLevel: 'Important',
  },
];

/**
 * ClimateRequirement — independent climate factor entity per crop.
 * Threshold fields exist structurally; remain null until verified.
 * Does not compute suitability.
 */
export type ClimateRequirement = {
  id: string;
  /** Crop Knowledge root id. */
  cropId: string;
  cropKnowledgeId: string;
  climateRequirementsId: string;
  climateFactor: ClimateFactor;
  minimumValue: number | null;
  optimalMinimum: number | null;
  optimalMaximum: number | null;
  maximumValue: number | null;
  preferredValue: number | null;
  toleranceLevel: ClimateToleranceLevel;
  importanceLevel: ClimateImportanceLevel;
  unit: string;
  scientificExplanation: string | null;
  notes: string | null;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type CropClimateRequirementsDto = {
  sectionId: string;
  cropKnowledgeId: string;
  cropCode: string | null;
  notes: string | null;
  requirements: ClimateRequirement[];
};

export type ClimateRequirementsValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type ClimateRequirementsValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: ClimateRequirementsValidationIssue[];
};
