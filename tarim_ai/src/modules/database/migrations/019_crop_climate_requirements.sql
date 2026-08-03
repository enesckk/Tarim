-- 019_crop_climate_requirements
-- Phase 2.1C: ClimateRequirement entities (factor shells; numeric thresholds deferred)

CREATE TABLE IF NOT EXISTS ck_climate_requirement (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  climate_requirements_id UUID NOT NULL REFERENCES ck_climate_requirements(id),
  climate_factor TEXT NOT NULL
    CHECK (climate_factor IN (
      'AIR_TEMPERATURE','SOIL_TEMPERATURE','GDD','FROST','FROST_FREE_PERIOD',
      'EXTREME_HEAT','HEAT_WAVE','RAINFALL','RAINFALL_DISTRIBUTION','HUMIDITY',
      'SOLAR_RADIATION','SUNSHINE_DURATION','DAY_LENGTH','WIND',
      'EVAPOTRANSPIRATION','CLIMATIC_WATER_DEFICIT'
    )),
  minimum_value DOUBLE PRECISION,
  optimal_minimum DOUBLE PRECISION,
  optimal_maximum DOUBLE PRECISION,
  maximum_value DOUBLE PRECISION,
  preferred_value DOUBLE PRECISION,
  tolerance_level TEXT NOT NULL
    CHECK (tolerance_level IN ('Unknown','Narrow','Moderate','Wide')),
  importance_level TEXT NOT NULL
    CHECK (importance_level IN ('Required','Important','Supporting','Optional')),
  unit TEXT NOT NULL,
  scientific_explanation TEXT,
  notes TEXT,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_knowledge_id, climate_factor, version),
  CHECK (
    optimal_minimum IS NULL
    OR optimal_maximum IS NULL
    OR optimal_minimum <= optimal_maximum
  ),
  CHECK (
    minimum_value IS NULL
    OR maximum_value IS NULL
    OR minimum_value <= maximum_value
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_climate_factor_active
  ON ck_climate_requirement (crop_knowledge_id, climate_factor)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_climate_requirement_crop
  ON ck_climate_requirement (crop_knowledge_id)
  WHERE is_active = TRUE;
