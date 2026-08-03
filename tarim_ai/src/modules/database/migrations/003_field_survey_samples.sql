-- 003_field_survey_samples
CREATE TABLE IF NOT EXISTS field_survey_samples (
  id UUID PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES field_surveys(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  latitude NUMERIC NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude NUMERIC NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy_meters NUMERIC CHECK (accuracy_meters IS NULL OR accuracy_meters > 0),
  location JSONB NOT NULL,
  measurement_method TEXT,
  rootable_soil_depth_cm NUMERIC
    CHECK (
      rootable_soil_depth_cm IS NULL
      OR (rootable_soil_depth_cm > 0 AND rootable_soil_depth_cm <= 500)
    ),
  surface_stoniness TEXT,
  stoniness_estimated_percent NUMERIC,
  bedrock_observation TEXT,
  drainage_observation TEXT,
  notes TEXT,
  photo_metadata JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (survey_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_field_survey_samples_survey_id
  ON field_survey_samples (survey_id);
