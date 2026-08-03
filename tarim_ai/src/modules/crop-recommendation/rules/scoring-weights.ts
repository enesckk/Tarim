/** Scoring weight constants — total must equal 100. */
export const SCORING_WEIGHTS = {
  climate: {
    total: 35,
    growingSeasonTemperature: 10,
    precipitation: 8,
    frostCompatibility: 5,
    extremeHeatCompatibility: 4,
    droughtCompatibility: 4,
    irrigationCompatibility: 4,
  },
  soil: {
    total: 40,
    ph: 10,
    texture: 7,
    drainage: 6,
    salinity: 5,
    organicMatter: 4,
    soilDepth: 4,
    waterHoldingCapacity: 2,
    calciumCarbonate: 2,
  },
  sentinel: {
    total: 15,
    acquisitionQuality: 4,
    vegetationActivity: 3,
    moistureSignal: 3,
    temporalConsistency: 3,
    bareSoilInterpretation: 2,
  },
  reliability: {
    total: 10,
  },
} as const;

export const TOTAL_GROSS_SCORE =
  SCORING_WEIGHTS.climate.total +
  SCORING_WEIGHTS.soil.total +
  SCORING_WEIGHTS.sentinel.total +
  SCORING_WEIGHTS.reliability.total;

export const TEXTURE_SCORE_RATIO = {
  preferred: 1,
  accepted: 0.65,
  unknown: 0.35,
  incompatible: 0,
} as const;

/** Floor score at absolute boundary (inside absolute, outside optimal). */
export const ABSOLUTE_BOUNDARY_SCORE = 0.25;
