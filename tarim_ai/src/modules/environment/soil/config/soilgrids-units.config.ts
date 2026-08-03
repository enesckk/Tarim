/**
 * ISRIC SoilGrids REST property scaling (d-factor) and conversion constants.
 * Values are documented factors: stored integer / dFactor = physical unit.
 * @see https://www.isric.org/explore/soilgrids
 */
export const SOILGRIDS_PROPERTY_CONFIG = {
  phh2o: {
    dFactor: 10,
    unit: 'pH',
    required: true,
  },
  soc: {
    dFactor: 10,
    unit: 'g/kg',
    required: true,
  },
  clay: {
    dFactor: 10,
    unit: 'g/kg',
    required: true,
  },
  sand: {
    dFactor: 10,
    unit: 'g/kg',
    required: true,
  },
  silt: {
    dFactor: 10,
    unit: 'g/kg',
    required: true,
  },
  cec: {
    dFactor: 10,
    unit: 'cmol(c)/kg',
    required: false,
  },
  nitrogen: {
    dFactor: 100,
    unit: 'g/kg',
    required: false,
  },
  bdod: {
    dFactor: 100,
    unit: 'cg/cm³',
    required: false,
  },
  cfvo: {
    dFactor: 10,
    unit: 'cm³/dm³',
    required: false,
  },
} as const;

export type SoilGridsProperty = keyof typeof SOILGRIDS_PROPERTY_CONFIG;

export const SOILGRIDS_REQUEST_PROPERTIES: SoilGridsProperty[] = [
  'phh2o',
  'soc',
  'clay',
  'sand',
  'silt',
  'cec',
  'nitrogen',
  'bdod',
  'cfvo',
];

export const SOILGRIDS_DEPTHS = ['0-5cm', '5-15cm', '15-30cm', '30-60cm'] as const;
export type SoilGridsDepth = (typeof SOILGRIDS_DEPTHS)[number];

/** Agricultural topsoil depth weights — must sum to 1. */
export const SOIL_DEPTH_WEIGHTS: Record<SoilGridsDepth, number> = {
  '0-5cm': 0.15,
  '5-15cm': 0.3,
  '15-30cm': 0.35,
  '30-60cm': 0.2,
};

/** Van Bemmelen factor: SOM ≈ SOC × 1.724 (estimated). */
export const SOC_TO_ORGANIC_MATTER_FACTOR = 1.724;

export const SOILGRIDS_SPATIAL_RESOLUTION_METERS = 250;
