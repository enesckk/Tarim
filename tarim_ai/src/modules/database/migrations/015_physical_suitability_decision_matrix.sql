-- 015_physical_suitability_decision_matrix
-- Phase 1: crop knowledge base + decision matrix (no ranking / suitability score)

CREATE TABLE IF NOT EXISTS ps_source_references (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT,
  author TEXT,
  publication_year INTEGER,
  url_or_identifier TEXT,
  region TEXT,
  notes TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated'))
);

CREATE TABLE IF NOT EXISTS ps_agro_climatic_regions (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  province TEXT,
  district TEXT,
  climate_zone TEXT,
  default_planting_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_harvest_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ps_crops (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scientific_name TEXT,
  crop_group TEXT NOT NULL,
  lifecycle_type TEXT NOT NULL CHECK (lifecycle_type IN ('Seasonal','Perennial')),
  default_growing_period_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  source_status TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS ps_production_scenarios (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL REFERENCES ps_crops(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  production_type TEXT NOT NULL CHECK (production_type IN ('Rainfed','Irrigated')),
  irrigation_mode TEXT NOT NULL CHECK (irrigation_mode IN ('Rainfed','Irrigated')),
  cultivation_environment TEXT NOT NULL CHECK (cultivation_environment IN ('OpenField','Greenhouse')),
  region_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  UNIQUE (crop_id, code, version)
);

CREATE TABLE IF NOT EXISTS ps_criterion_definitions (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  data_type TEXT NOT NULL,
  unit TEXT,
  description TEXT NOT NULL,
  allowed_source_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ps_crop_criterion_rules (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL REFERENCES ps_crops(id),
  production_scenario_id UUID NOT NULL REFERENCES ps_production_scenarios(id),
  criterion_definition_id UUID NOT NULL REFERENCES ps_criterion_definitions(id),
  criterion_code TEXT NOT NULL,
  requirement_level TEXT NOT NULL,
  decision_role TEXT NOT NULL,
  evaluation_type TEXT NOT NULL,
  optimal_range JSONB,
  acceptable_range JSONB,
  critical_minimum DOUBLE PRECISION,
  critical_maximum DOUBLE PRECISION,
  allowed_values JSONB,
  disallowed_values JSONB,
  weight_placeholder DOUBLE PRECISION,
  missing_data_behavior TEXT NOT NULL,
  condition_expression TEXT,
  explanation_template TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID REFERENCES ps_source_references(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verification_status TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ps_rules_crop_scenario
  ON ps_crop_criterion_rules (crop_id, production_scenario_id)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ps_critical_barrier_rules (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  crop_id UUID NOT NULL REFERENCES ps_crops(id),
  production_scenario_id UUID NOT NULL REFERENCES ps_production_scenarios(id),
  criterion_code TEXT NOT NULL,
  crop_criterion_rule_id UUID REFERENCES ps_crop_criterion_rules(id),
  severity TEXT NOT NULL,
  evaluation_type TEXT NOT NULL,
  critical_minimum DOUBLE PRECISION,
  critical_maximum DOUBLE PRECISION,
  boolean_expected BOOLEAN,
  allowed_values JSONB,
  disallowed_values JSONB,
  explanation_template TEXT NOT NULL,
  source_reference_id UUID REFERENCES ps_source_references(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verification_status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (code, version)
);

CREATE TABLE IF NOT EXISTS ps_data_source_priorities (
  id UUID PRIMARY KEY,
  criterion_code TEXT NOT NULL,
  source_type TEXT NOT NULL,
  priority_rank INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (criterion_code, source_type)
);

CREATE TABLE IF NOT EXISTS ps_audit_events (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  version INTEGER,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ps_audit_entity
  ON ps_audit_events (entity_type, entity_id, created_at DESC);
