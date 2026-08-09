-- 038_crop_scientific_data
-- Phase 4: Scientific Data Population and Traceability

CREATE TABLE IF NOT EXISTS ck_scientific_values (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  criterion_id UUID REFERENCES ck_criteria_catalog(id),
  
  -- The logical field name if criterion_id is not used directly
  field_name TEXT NOT NULL,
  
  provider TEXT NOT NULL,
  provider_field TEXT,
  original_value TEXT,
  normalized_value DOUBLE PRECISION,
  source_document TEXT,
  
  version INTEGER NOT NULL DEFAULT 1,
  retrieved_at TIMESTAMPTZ NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('Draft', 'Reviewed', 'Approved', 'Rejected')),
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(crop_knowledge_id, field_name, provider)
);

CREATE INDEX IF NOT EXISTS idx_ck_scientific_crop ON ck_scientific_values (crop_knowledge_id);

CREATE TABLE IF NOT EXISTS ck_phenology_phases (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  phase_name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  description TEXT,
  typical_duration_days INTEGER,
  
  source TEXT,
  review_status TEXT NOT NULL CHECK (review_status IN ('Draft', 'Reviewed', 'Approved', 'Rejected')),
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(crop_knowledge_id, phase_order),
  UNIQUE(crop_knowledge_id, phase_name)
);

CREATE INDEX IF NOT EXISTS idx_ck_phenology_crop ON ck_phenology_phases (crop_knowledge_id);

CREATE TABLE IF NOT EXISTS ck_production_profiles (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id) UNIQUE,
  
  normal_planting_start_day INTEGER,
  normal_planting_end_day INTEGER,
  normal_harvest_start_day INTEGER,
  normal_harvest_end_day INTEGER,
  
  supports_second_crop BOOLEAN,
  open_field BOOLEAN,
  greenhouse BOOLEAN,
  rainfed BOOLEAN,
  irrigated BOOLEAN,
  
  source TEXT,
  review_status TEXT NOT NULL CHECK (review_status IN ('Draft', 'Reviewed', 'Approved', 'Rejected')),
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
