-- 030_soil_sampling_management
-- Phase 2.2F: Soil sampling lifecycle (campaign / point / sample / observation / custody)
-- Independent from laboratory analysis. No suitability / AI / OCR / map / QR generation.

CREATE TABLE IF NOT EXISTS ss_sampling_campaign (
  id UUID PRIMARY KEY,
  campaign_code TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  purpose TEXT,
  description TEXT,
  organization TEXT,
  responsible_person TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL
    CHECK (status IN ('PLANNED','ONGOING','COMPLETED','CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ss_sampling_campaign_code
  ON ss_sampling_campaign (campaign_code)
  WHERE status <> 'CANCELLED';

CREATE TABLE IF NOT EXISTS ss_sampling_point (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES ss_sampling_campaign(id),
  parcel_id TEXT,
  point_code TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  elevation DOUBLE PRECISION,
  geometry TEXT,
  sampling_depth_from DOUBLE PRECISION,
  sampling_depth_to DOUBLE PRECISION,
  sampling_area DOUBLE PRECISION,
  sampling_method TEXT,
  slope DOUBLE PRECISION,
  aspect DOUBLE PRECISION,
  land_use TEXT,
  crop_at_sampling TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  CHECK (sampling_depth_from IS NULL OR sampling_depth_from >= 0),
  CHECK (sampling_depth_to IS NULL OR sampling_depth_to >= 0),
  CHECK (
    sampling_depth_from IS NULL
    OR sampling_depth_to IS NULL
    OR sampling_depth_from <= sampling_depth_to
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ss_sampling_point_code
  ON ss_sampling_point (campaign_id, point_code);

CREATE INDEX IF NOT EXISTS idx_ss_sampling_point_campaign
  ON ss_sampling_point (campaign_id);

CREATE TABLE IF NOT EXISTS ss_sampling_soil_sample (
  id UUID PRIMARY KEY,
  sampling_point_id UUID NOT NULL REFERENCES ss_sampling_point(id),
  sample_code TEXT NOT NULL,
  sample_type TEXT NOT NULL
    CHECK (sample_type IN ('COMPOSITE','SINGLE_POINT','DISTURBED','UNDISTURBED')),
  collection_date TIMESTAMPTZ,
  collected_by TEXT,
  transport_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  storage_condition TEXT,
  container_type TEXT,
  current_status TEXT NOT NULL
    CHECK (current_status IN (
      'COLLECTED','IN_TRANSPORT','RECEIVED','IN_ANALYSIS','ANALYZED','ARCHIVED','DISCARDED'
    )),
  barcode TEXT,
  qr_code TEXT,
  seal_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ss_sampling_soil_sample_code
  ON ss_sampling_soil_sample (sample_code);

CREATE INDEX IF NOT EXISTS idx_ss_sampling_soil_sample_point
  ON ss_sampling_soil_sample (sampling_point_id);

CREATE TABLE IF NOT EXISTS ss_sampling_observation (
  id UUID PRIMARY KEY,
  sampling_point_id UUID NOT NULL REFERENCES ss_sampling_point(id),
  observation_type TEXT NOT NULL
    CHECK (observation_type IN (
      'STONE','ROCK','EROSION','COMPACTION','SURFACE_CRUST','DRAINAGE',
      'ROOTING_DEPTH','MOISTURE','WATERLOGGING','SALINITY'
    )),
  observation_value TEXT,
  photo_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ss_sampling_observation_point
  ON ss_sampling_observation (sampling_point_id, created_at);

CREATE TABLE IF NOT EXISTS ss_chain_of_custody (
  id UUID PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES ss_sampling_soil_sample(id),
  action TEXT NOT NULL
    CHECK (action IN (
      'COLLECTED','PACKAGED','TRANSPORTED','RECEIVED','OPENED','ANALYZED','ARCHIVED','DESTROYED'
    )),
  performed_by TEXT,
  performed_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_ss_chain_of_custody_sample
  ON ss_chain_of_custody (sample_id, performed_date);
