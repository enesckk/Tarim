-- 022_crop_terrain_requirements
-- Phase 2.1F: TerrainRequirement entities (factor shells; numeric thresholds deferred)

CREATE TABLE IF NOT EXISTS ck_terrain_requirement (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  terrain_requirements_id UUID NOT NULL REFERENCES ck_terrain_requirements(id),
  terrain_factor TEXT NOT NULL
    CHECK (terrain_factor IN (
      'ELEVATION','SLOPE','ASPECT','SOLAR_EXPOSURE','TWI',
      'FLOW_ACCUMULATION','EROSION_RISK'
    )),
  minimum DOUBLE PRECISION,
  optimal_minimum DOUBLE PRECISION,
  optimal_maximum DOUBLE PRECISION,
  maximum DOUBLE PRECISION,
  preferred DOUBLE PRECISION,
  unit TEXT NOT NULL,
  description TEXT,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_knowledge_id, terrain_factor, version),
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_terrain_factor_active
  ON ck_terrain_requirement (crop_knowledge_id, terrain_factor)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_terrain_requirement_crop
  ON ck_terrain_requirement (crop_knowledge_id)
  WHERE is_active = TRUE;
