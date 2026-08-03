-- 032_field_observation_module
-- Phase 2.2H: Field survey / observation / evidence / devices / expert review
-- No suitability scoring, crop recommendation, AI, fertilizer/irrigation advice.
-- Enum option catalog present but not scientifically seeded.

CREATE TABLE IF NOT EXISTS fo_field_survey (
  id UUID PRIMARY KEY,
  survey_code TEXT NOT NULL,
  parcel_id TEXT NOT NULL,
  zone_id TEXT,
  sampling_campaign_id UUID,
  survey_type TEXT NOT NULL,
  survey_purpose TEXT,
  survey_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  surveyed_by TEXT,
  responsible_expert TEXT,
  organization TEXT,
  weather_condition TEXT,
  previous_rainfall_condition TEXT,
  parcel_accessibility TEXT,
  survey_status TEXT NOT NULL
    CHECK (survey_status IN (
      'PLANNED','IN_PROGRESS','COMPLETED','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED'
    )),
  general_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fo_field_survey_code_active
  ON fo_field_survey (survey_code) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_fo_field_survey_parcel
  ON fo_field_survey (parcel_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS fo_field_observation_point (
  id UUID PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES fo_field_survey(id),
  parcel_id TEXT NOT NULL,
  zone_id TEXT,
  point_code TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  elevation DOUBLE PRECISION,
  geometry TEXT,
  accuracy_meters DOUBLE PRECISION CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0),
  observation_date TIMESTAMPTZ,
  observed_by TEXT,
  land_use TEXT,
  current_crop TEXT,
  previous_crop TEXT,
  surface_condition TEXT,
  notes TEXT,
  geometry_validation_status TEXT NOT NULL,
  geometry_validation_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fo_point_code
  ON fo_field_observation_point (survey_id, point_code) WHERE is_active;

CREATE TABLE IF NOT EXISTS fo_field_parameter (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  turkish_display_name TEXT NOT NULL,
  english_display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  value_type TEXT NOT NULL,
  canonical_unit_id UUID,
  allowed_measurement_scope TEXT NOT NULL,
  is_required_for_physical_suitability BOOLEAN NOT NULL DEFAULT FALSE,
  requires_photo_evidence BOOLEAN NOT NULL DEFAULT FALSE,
  requires_gps_evidence BOOLEAN NOT NULL DEFAULT FALSE,
  requires_expert_verification BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 1000,
  source TEXT,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fo_field_parameter_option (
  id UUID PRIMARY KEY,
  parameter_id UUID NOT NULL REFERENCES fo_field_parameter(id),
  code TEXT NOT NULL,
  turkish_label TEXT NOT NULL,
  english_label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  source TEXT,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fo_parameter_option_code
  ON fo_field_parameter_option (parameter_id, code) WHERE is_active;

CREATE TABLE IF NOT EXISTS fo_field_observation_result (
  id UUID PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES fo_field_survey(id),
  observation_point_id UUID REFERENCES fo_field_observation_point(id),
  parameter_id UUID NOT NULL REFERENCES fo_field_parameter(id),
  raw_value TEXT,
  numeric_value DOUBLE PRECISION,
  text_value TEXT,
  boolean_value BOOLEAN,
  option_id UUID REFERENCES fo_field_parameter_option(id),
  unit_id UUID,
  observation_method TEXT,
  observation_depth_from_cm DOUBLE PRECISION,
  observation_depth_to_cm DOUBLE PRECISION,
  confidence_level TEXT NOT NULL,
  evidence_status TEXT NOT NULL,
  observed_by TEXT,
  observed_at TIMESTAMPTZ,
  source TEXT,
  data_origin TEXT NOT NULL,
  source_institution TEXT,
  source_person TEXT,
  source_date TIMESTAMPTZ,
  verification_status TEXT NOT NULL,
  review_status TEXT NOT NULL,
  review_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (observation_depth_from_cm IS NULL OR observation_depth_from_cm >= 0),
  CHECK (observation_depth_to_cm IS NULL OR observation_depth_to_cm >= 0),
  CHECK (
    observation_depth_from_cm IS NULL
    OR observation_depth_to_cm IS NULL
    OR observation_depth_from_cm <= observation_depth_to_cm
  )
);

CREATE TABLE IF NOT EXISTS fo_field_evidence (
  id UUID PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES fo_field_survey(id),
  observation_point_id UUID REFERENCES fo_field_observation_point(id),
  evidence_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT,
  file_hash TEXT NOT NULL,
  captured_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL,
  uploaded_by TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,
  device_id TEXT,
  description TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fo_field_evidence_result_link (
  id UUID PRIMARY KEY,
  evidence_id UUID NOT NULL REFERENCES fo_field_evidence(id),
  observation_result_id UUID NOT NULL REFERENCES fo_field_observation_result(id),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fo_evidence_result_link
  ON fo_field_evidence_result_link (evidence_id, observation_result_id);

CREATE TABLE IF NOT EXISTS fo_field_measurement_device (
  id UUID PRIMARY KEY,
  device_code TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  calibration_date TIMESTAMPTZ,
  calibration_expiry_date TIMESTAMPTZ,
  calibration_certificate_path TEXT,
  measurement_unit_id UUID,
  is_calibrated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fo_field_device_measurement (
  id UUID PRIMARY KEY,
  observation_result_id UUID NOT NULL REFERENCES fo_field_observation_result(id),
  device_id UUID NOT NULL REFERENCES fo_field_measurement_device(id),
  measured_value DOUBLE PRECISION,
  unit_id UUID,
  measured_at TIMESTAMPTZ NOT NULL,
  calibration_valid_at_measurement BOOLEAN NOT NULL,
  raw_device_output TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fo_field_survey_review (
  id UUID PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES fo_field_survey(id),
  reviewed_by TEXT NOT NULL,
  reviewer_role TEXT,
  review_date TIMESTAMPTZ NOT NULL,
  review_status TEXT NOT NULL,
  review_notes TEXT,
  approved_observation_count INTEGER NOT NULL DEFAULT 0,
  rejected_observation_count INTEGER NOT NULL DEFAULT 0,
  revision_requested_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fo_parcel_geometry (
  parcel_id TEXT PRIMARY KEY,
  geometry_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
