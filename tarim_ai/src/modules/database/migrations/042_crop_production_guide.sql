-- 042_crop_production_guide
-- Phase 13: Crop Production Knowledge Engine

CREATE TABLE IF NOT EXISTS cpg_crop_production_guides (
  id UUID PRIMARY KEY,
  crop_code TEXT NOT NULL UNIQUE,
  general_info JSONB NOT NULL,
  expert_notes JSONB NOT NULL,
  fertilization_reference JSONB NOT NULL,
  irrigation_reference JSONB NOT NULL,
  harvest_info JSONB NOT NULL,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_version TEXT NOT NULL,
  review_status TEXT NOT NULL
    CHECK (review_status IN ('Draft','ExpertReviewed','Approved','Deprecated')),
  approved_by TEXT,
  last_review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cpg_production_calendars (
  id UUID PRIMARY KEY,
  crop_guide_id UUID NOT NULL REFERENCES cpg_crop_production_guides(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL
    CHECK (priority IN ('High', 'Medium', 'Low', 'Critical')),
  estimated_time TEXT,
  conditions TEXT,
  risks TEXT,
  sequence_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS cpg_diseases_pests (
  id UUID PRIMARY KEY,
  crop_guide_id UUID NOT NULL REFERENCES cpg_crop_production_guides(id) ON DELETE CASCADE,
  disease_name TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  risk_period TEXT NOT NULL,
  prevention TEXT NOT NULL,
  first_response TEXT NOT NULL,
  reference_source TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cpg_production_calendars_crop_guide
  ON cpg_production_calendars (crop_guide_id, sequence_order);

CREATE INDEX IF NOT EXISTS idx_cpg_diseases_pests_crop_guide
  ON cpg_diseases_pests (crop_guide_id);
