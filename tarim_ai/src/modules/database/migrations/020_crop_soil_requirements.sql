-- 020_crop_soil_requirements
-- Phase 2.1D: SoilRequirement entities (factor shells; numeric thresholds deferred; no lab linkage)

CREATE TABLE IF NOT EXISTS ck_soil_requirement (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  soil_requirements_id UUID NOT NULL REFERENCES ck_soil_requirements(id),
  soil_factor TEXT NOT NULL
    CHECK (soil_factor IN (
      'TEXTURE','PH','EC','ORGANIC_MATTER','LIME','CEC','BULK_DENSITY',
      'ROOTING_DEPTH','DRAINAGE','STONE_CONTENT','SALINITY','SODICITY',
      'SOIL_DEPTH','SOIL_MOISTURE','FIELD_CAPACITY','PERMANENT_WILTING_POINT'
    )),
  minimum DOUBLE PRECISION,
  optimal_minimum DOUBLE PRECISION,
  optimal_maximum DOUBLE PRECISION,
  maximum DOUBLE PRECISION,
  preferred DOUBLE PRECISION,
  importance_level TEXT NOT NULL
    CHECK (importance_level IN ('Required','Important','Supporting','Optional')),
  tolerance_level TEXT NOT NULL
    CHECK (tolerance_level IN ('Unknown','Narrow','Moderate','Wide')),
  unit TEXT NOT NULL,
  description TEXT,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_knowledge_id, soil_factor, version),
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_soil_factor_active
  ON ck_soil_requirement (crop_knowledge_id, soil_factor)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_soil_requirement_crop
  ON ck_soil_requirement (crop_knowledge_id)
  WHERE is_active = TRUE;
