-- 018_crop_phenology_engine
-- Phase 2.1B: CropGrowthStage + StageTransition + StageReference (no climate/water/GDD thresholds)

CREATE TABLE IF NOT EXISTS ck_crop_growth_stage (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  phenology_id UUID NOT NULL REFERENCES ck_phenology(id),
  stage_code TEXT NOT NULL
    CHECK (stage_code IN (
      'SEED','GERMINATION','EMERGENCE','VEGETATIVE','BRANCHING',
      'FLOWERING','POLLINATION','FRUIT_SET','FRUIT_DEVELOPMENT',
      'MATURITY','HARVEST','POST_HARVEST','RESIDUE'
    )),
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL CHECK (stage_order >= 1),
  description TEXT,
  scientific_description TEXT,
  typical_duration_days INTEGER,
  minimum_duration_days INTEGER,
  maximum_duration_days INTEGER,
  can_overlap_previous_stage BOOLEAN NOT NULL DEFAULT FALSE,
  is_critical_stage BOOLEAN NOT NULL DEFAULT FALSE,
  requires_validation BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_knowledge_id, stage_code, version),
  CHECK (
    typical_duration_days IS NULL OR typical_duration_days > 0
  ),
  CHECK (
    minimum_duration_days IS NULL OR minimum_duration_days > 0
  ),
  CHECK (
    maximum_duration_days IS NULL OR maximum_duration_days > 0
  ),
  CHECK (
    minimum_duration_days IS NULL
    OR maximum_duration_days IS NULL
    OR minimum_duration_days <= maximum_duration_days
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_growth_stage_order_active
  ON ck_crop_growth_stage (crop_knowledge_id, stage_order)
  WHERE is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_growth_stage_code_active
  ON ck_crop_growth_stage (crop_knowledge_id, stage_code)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_growth_stage_crop_order
  ON ck_crop_growth_stage (crop_knowledge_id, stage_order)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ck_stage_transition (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  from_stage_code TEXT NOT NULL,
  to_stage_code TEXT NOT NULL,
  transition_order INTEGER NOT NULL CHECK (transition_order >= 1),
  can_skip BOOLEAN NOT NULL DEFAULT FALSE,
  requires_previous_completion BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (from_stage_code <> to_stage_code),
  UNIQUE (crop_knowledge_id, from_stage_code, to_stage_code, version)
);

CREATE INDEX IF NOT EXISTS idx_ck_stage_transition_crop
  ON ck_stage_transition (crop_knowledge_id, transition_order)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ck_stage_reference (
  id UUID PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES ck_crop_growth_stage(id),
  scientific_source TEXT NOT NULL,
  organization TEXT,
  publication TEXT,
  publication_year INTEGER,
  doi TEXT,
  reference_url TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_ck_stage_reference_stage
  ON ck_stage_reference (stage_id)
  WHERE is_active = TRUE;
