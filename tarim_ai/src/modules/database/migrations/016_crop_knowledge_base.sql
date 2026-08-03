-- 016_crop_knowledge_base
-- Phase 2.1: normalized Crop Knowledge Base (General Information first; no suitability thresholds)

CREATE TABLE IF NOT EXISTS ck_crop_knowledge (
  id UUID PRIMARY KEY,
  crop_profile_id UUID,
  crop_code TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_code, version)
);

CREATE INDEX IF NOT EXISTS idx_ck_knowledge_code_active
  ON ck_crop_knowledge (crop_code)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ck_general_information (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  identity_code TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  scientific_name TEXT,
  fao_code TEXT,
  eppo_code TEXT,
  crop_group TEXT NOT NULL,
  family TEXT,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('Seasonal','Perennial','Biennial')),
  growing_type TEXT NOT NULL,
  supports_open_field BOOLEAN NOT NULL DEFAULT TRUE,
  supports_greenhouse BOOLEAN NOT NULL DEFAULT FALSE,
  supports_rainfed BOOLEAN NOT NULL DEFAULT FALSE,
  supports_irrigated BOOLEAN NOT NULL DEFAULT FALSE,
  supports_first_crop BOOLEAN NOT NULL DEFAULT TRUE,
  supports_second_crop BOOLEAN NOT NULL DEFAULT FALSE,
  seed_type TEXT,
  harvest_type TEXT,
  typical_growing_duration_days INTEGER,
  typical_root_depth_cm DOUBLE PRECISION,
  typical_plant_height_cm DOUBLE PRECISION,
  economic_part TEXT,
  primary_usage TEXT,
  secondary_usage TEXT,
  region_availability JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  photo_url TEXT,
  icon_url TEXT,
  scientific_reference_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_scientific_identity (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  scientific_name TEXT,
  fao_code TEXT,
  eppo_code TEXT,
  family TEXT,
  genus TEXT,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_phenology (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_climate_requirements (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_soil_requirements (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_water_requirements (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_terrain_requirements (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_production_calendar (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  region_code TEXT,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_risk_profile (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);

CREATE TABLE IF NOT EXISTS ck_references (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  version INTEGER NOT NULL DEFAULT 1,
  source_reference_id UUID,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  reference_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  UNIQUE (crop_knowledge_id, version)
);
