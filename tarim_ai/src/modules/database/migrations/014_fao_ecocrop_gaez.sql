-- FAO ECOCROP + GAEZ reference layer (not a hard runtime dependency for analysis)
CREATE TABLE IF NOT EXISTS ecocrop_profile_sources (
  id TEXT PRIMARY KEY,
  ecocrop_id TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  common_name TEXT,
  snapshot_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'reviewed', 'approved', 'rejected')),
  thresholds_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  unknown_fields_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ecocrop_profile_snapshot
  ON ecocrop_profile_sources (ecocrop_id, snapshot_version);

CREATE TABLE IF NOT EXISTS gaez_datasets (
  dataset_id TEXT NOT NULL,
  gaez_version TEXT NOT NULL CHECK (gaez_version IN ('v4', 'v5')),
  name TEXT NOT NULL,
  crop_code TEXT,
  water_supply TEXT,
  input_level TEXT,
  climate_scenario TEXT,
  variable TEXT,
  unit TEXT,
  resolution TEXT,
  service_url TEXT NOT NULL,
  filepath TEXT,
  download_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  provenance_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (gaez_version, dataset_id)
);

CREATE INDEX IF NOT EXISTS idx_gaez_datasets_crop
  ON gaez_datasets (gaez_version, crop_code);

CREATE TABLE IF NOT EXISTS gaez_crop_mappings (
  id TEXT PRIMARY KEY,
  internal_crop_code TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  ecocrop_id TEXT,
  gaez_crop_code TEXT,
  gaez_version TEXT CHECK (gaez_version IS NULL OR gaez_version IN ('v4', 'v5')),
  production_system TEXT,
  confidence TEXT,
  review_status TEXT NOT NULL CHECK (review_status IN ('draft', 'reviewed', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  notes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gaez_crop_mapping_internal
  ON gaez_crop_mappings (internal_crop_code);

CREATE TABLE IF NOT EXISTS gaez_sample_cache (
  cache_key TEXT PRIMARY KEY,
  gaez_version TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  crop_code TEXT NOT NULL,
  geometry_hash TEXT NOT NULL,
  water_supply TEXT NOT NULL,
  input_level TEXT NOT NULL,
  climate_scenario TEXT NOT NULL,
  sample_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gaez_sample_cache_lookup
  ON gaez_sample_cache (gaez_version, dataset_id, crop_code, geometry_hash);
