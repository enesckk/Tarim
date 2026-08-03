-- 017_crop_phenology_stages
-- Phase 2.1b: independent phenology stage entities (no temperature/water thresholds)

CREATE TABLE IF NOT EXISTS ck_phenology_stage (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  phenology_id UUID NOT NULL REFERENCES ck_phenology(id),
  code TEXT NOT NULL
    CHECK (code IN (
      'Seed','Germination','Emergence','Vegetative','Flowering',
      'FruitSet','FruitDevelopment','Ripening','Harvest','Residue'
    )),
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL CHECK (stage_order >= 1),
  description TEXT,
  typical_duration_days INTEGER,
  is_critical_stage BOOLEAN NOT NULL DEFAULT FALSE,
  sensitive_to JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  scientific_reference_id UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_knowledge_id, code, version)
);

CREATE INDEX IF NOT EXISTS idx_ck_phenology_stage_crop_active
  ON ck_phenology_stage (crop_knowledge_id, stage_order)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_phenology_stage_phenology
  ON ck_phenology_stage (phenology_id)
  WHERE is_active = TRUE;
