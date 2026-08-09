-- 039_regional_crop_profiles
-- Phase 5: Regional Crop Profiles (Gaziantep)

CREATE TABLE IF NOT EXISTS ck_regional_profiles (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  region_type TEXT NOT NULL,
  region_name TEXT NOT NULL,
  
  version INTEGER NOT NULL DEFAULT 1,
  review_status TEXT NOT NULL CHECK (review_status IN ('Draft', 'Reviewed', 'Approved', 'Rejected')),
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(crop_knowledge_id, region_type, region_name)
);

CREATE INDEX IF NOT EXISTS idx_ck_regional_profiles_crop ON ck_regional_profiles (crop_knowledge_id);

CREATE TABLE IF NOT EXISTS ck_regional_production_calendars (
  id UUID PRIMARY KEY,
  regional_profile_id UUID NOT NULL REFERENCES ck_regional_profiles(id) ON DELETE CASCADE,
  
  normal_planting_start_day INTEGER,
  normal_planting_end_day INTEGER,
  normal_transplanting_start_day INTEGER,
  normal_transplanting_end_day INTEGER,
  normal_harvest_start_day INTEGER,
  normal_harvest_end_day INTEGER,
  
  supports_second_crop BOOLEAN,
  supports_rainfed BOOLEAN,
  supports_irrigated BOOLEAN,
  supports_open_field BOOLEAN,
  supports_greenhouse BOOLEAN,
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(regional_profile_id)
);

CREATE TABLE IF NOT EXISTS ck_regional_production_scenarios (
  id UUID PRIMARY KEY,
  regional_profile_id UUID NOT NULL REFERENCES ck_regional_profiles(id) ON DELETE CASCADE,
  
  scenario_name TEXT NOT NULL,
  growing_type TEXT NOT NULL, -- e.g., 'Open Field', 'Greenhouse'
  water_regime TEXT NOT NULL, -- e.g., 'Rainfed', 'Irrigated'
  description TEXT,
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(regional_profile_id, scenario_name)
);

CREATE TABLE IF NOT EXISTS ck_regional_notes (
  id UUID PRIMARY KEY,
  regional_profile_id UUID NOT NULL REFERENCES ck_regional_profiles(id) ON DELETE CASCADE,
  
  note_type TEXT NOT NULL,
  note_content TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS ck_regional_sources (
  id UUID PRIMARY KEY,
  regional_profile_id UUID NOT NULL REFERENCES ck_regional_profiles(id) ON DELETE CASCADE,
  
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  reference_url TEXT,
  
  version INTEGER NOT NULL DEFAULT 1,
  review_status TEXT NOT NULL CHECK (review_status IN ('Draft', 'Reviewed', 'Approved', 'Rejected')),
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
