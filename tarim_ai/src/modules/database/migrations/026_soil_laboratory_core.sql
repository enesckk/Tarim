-- 026_soil_laboratory_core
-- Phase 2.2A: Soil Laboratory infrastructure (no parameter catalog yet)
-- No suitability scoring / recommendation / fertilizer / irrigation logic.

CREATE TABLE IF NOT EXISTS sl_laboratory (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  city TEXT,
  accreditation_number TEXT,
  accreditation_standard TEXT,
  contact TEXT,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_sl_laboratory_active
  ON sl_laboratory (is_active, name)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_analysis_method (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  standard TEXT,
  organization TEXT,
  method_version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_analysis_method_code_active
  ON sl_analysis_method (code)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_soil_sample (
  id UUID PRIMARY KEY,
  parcel_id TEXT NOT NULL,
  sample_code TEXT NOT NULL,
  laboratory_id UUID REFERENCES sl_laboratory(id),
  sampling_date TIMESTAMPTZ,
  analysis_date TIMESTAMPTZ,
  sampling_depth_from_cm DOUBLE PRECISION,
  sampling_depth_to_cm DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  elevation DOUBLE PRECISION,
  sampler_name TEXT,
  sample_method TEXT,
  weather_condition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (
    sampling_depth_from_cm IS NULL
    OR sampling_depth_to_cm IS NULL
    OR sampling_depth_from_cm <= sampling_depth_to_cm
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_soil_sample_code_active
  ON sl_soil_sample (sample_code)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_sl_soil_sample_parcel
  ON sl_soil_sample (parcel_id)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_soil_analysis_result (
  id UUID PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES sl_soil_sample(id),
  parameter_code TEXT NOT NULL,
  parameter_name TEXT NOT NULL,
  measured_value DOUBLE PRECISION,
  unit TEXT NOT NULL,
  analysis_method_id UUID REFERENCES sl_analysis_method(id),
  analysis_method TEXT,
  detection_limit DOUBLE PRECISION,
  measurement_uncertainty DOUBLE PRECISION,
  quality_flag TEXT NOT NULL
    CHECK (quality_flag IN (
      'Unknown','Accepted','Suspect','Rejected','BelowDetectionLimit','AboveRange'
    )),
  is_accredited BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_soil_result_param_active
  ON sl_soil_analysis_result (sample_id, parameter_code)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_sl_soil_result_sample
  ON sl_soil_analysis_result (sample_id)
  WHERE is_active = TRUE;
