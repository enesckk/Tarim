-- 021_crop_water_requirements
-- Phase 2.1E: WaterRequirement entities (factor shells; numeric thresholds deferred)

CREATE TABLE IF NOT EXISTS ck_water_requirement (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  water_requirements_id UUID NOT NULL REFERENCES ck_water_requirements(id),
  water_factor TEXT NOT NULL
    CHECK (water_factor IN (
      'TOTAL_WATER_REQUIREMENT','IRRIGATION_REQUIREMENT','IRRIGATION_INTERVAL',
      'CRITICAL_IRRIGATION_STAGE','WATER_STRESS_TOLERANCE','DROUGHT_TOLERANCE',
      'SALINE_WATER_TOLERANCE','BORON_TOLERANCE','SAR_TOLERANCE'
    )),
  minimum DOUBLE PRECISION,
  optimal_minimum DOUBLE PRECISION,
  optimal_maximum DOUBLE PRECISION,
  maximum DOUBLE PRECISION,
  preferred DOUBLE PRECISION,
  unit TEXT NOT NULL,
  tolerance_level TEXT NOT NULL
    CHECK (tolerance_level IN ('Unknown','Narrow','Moderate','Wide')),
  importance_level TEXT NOT NULL
    CHECK (importance_level IN ('Required','Important','Supporting','Optional')),
  description TEXT,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_knowledge_id, water_factor, version),
  CHECK (
    optimal_minimum IS NULL
    OR optimal_maximum IS NULL
    OR optimal_minimum <= optimal_maximum
  ),
  CHECK (
    minimum IS NULL
    OR maximum IS NULL
    OR minimum <= maximum
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_water_factor_active
  ON ck_water_requirement (crop_knowledge_id, water_factor)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_water_requirement_crop
  ON ck_water_requirement (crop_knowledge_id)
  WHERE is_active = TRUE;
