-- 027_soil_parameter_catalog
-- Phase 2.2C: Soil parameter definitions, units, aliases, options, raw/normalized values
-- No scientific interpretation ranges / crop thresholds / suitability scores.

CREATE TABLE IF NOT EXISTS sl_measurement_unit (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity_type TEXT NOT NULL,
  conversion_type TEXT NOT NULL
    CHECK (conversion_type IN ('Identity','Linear','OffsetLinear','Unsupported')),
  conversion_factor DOUBLE PRECISION NOT NULL DEFAULT 1,
  conversion_offset DOUBLE PRECISION NOT NULL DEFAULT 0,
  canonical_unit_id UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_measurement_unit_code_active
  ON sl_measurement_unit (code)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_soil_parameter (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  turkish_display_name TEXT NOT NULL,
  english_display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  description TEXT,
  canonical_unit_id UUID REFERENCES sl_measurement_unit(id),
  data_type TEXT NOT NULL,
  decimal_precision INTEGER,
  value_type TEXT NOT NULL
    CHECK (value_type IN (
      'NUMERIC','TEXT','BOOLEAN','ENUM','PERCENTAGE','RATIO','CLASSIFICATION'
    )),
  measurement_scope TEXT NOT NULL
    CHECK (measurement_scope IN (
      'SAMPLE','DEPTH_INTERVAL','PARCEL','ZONE','PROFILE','LABORATORY_REPORT'
    )),
  is_directly_measured BOOLEAN NOT NULL DEFAULT TRUE,
  is_calculated BOOLEAN NOT NULL DEFAULT FALSE,
  is_field_observation BOOLEAN NOT NULL DEFAULT FALSE,
  is_laboratory_parameter BOOLEAN NOT NULL DEFAULT TRUE,
  is_required_for_physical_suitability BOOLEAN NOT NULL DEFAULT FALSE,
  is_required_for_fertility_assessment BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN (
      'Draft','SourceVerified','ExpertReviewed','Approved','Deprecated'
    )),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_soil_parameter_code_active
  ON sl_soil_parameter (code)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_sl_soil_parameter_category
  ON sl_soil_parameter (category, display_order)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_soil_parameter_unit (
  id UUID PRIMARY KEY,
  parameter_id UUID NOT NULL REFERENCES sl_soil_parameter(id),
  unit_id UUID NOT NULL REFERENCES sl_measurement_unit(id),
  is_canonical BOOLEAN NOT NULL DEFAULT FALSE,
  is_allowed_for_import BOOLEAN NOT NULL DEFAULT TRUE,
  requires_context BOOLEAN NOT NULL DEFAULT FALSE,
  conversion_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_parameter_unit_active
  ON sl_soil_parameter_unit (parameter_id, unit_id)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_soil_parameter_alias (
  id UUID PRIMARY KEY,
  parameter_id UUID NOT NULL REFERENCES sl_soil_parameter(id),
  alias TEXT NOT NULL,
  language TEXT,
  laboratory_id UUID REFERENCES sl_laboratory(id),
  match_type TEXT NOT NULL
    CHECK (match_type IN ('EXACT','NORMALIZED_TEXT','LAB_SPECIFIC','MANUAL')),
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_sl_parameter_alias_lookup
  ON sl_soil_parameter_alias (alias, match_type)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_soil_parameter_option (
  id UUID PRIMARY KEY,
  parameter_id UUID NOT NULL REFERENCES sl_soil_parameter(id),
  code TEXT NOT NULL,
  turkish_label TEXT NOT NULL,
  english_label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN (
      'Draft','SourceVerified','ExpertReviewed','Approved','Deprecated'
    )),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_parameter_option_code_active
  ON sl_soil_parameter_option (parameter_id, code)
  WHERE is_active = TRUE;

-- Extend analysis results with raw/normalized fields (idempotent adds)
ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS value_source_type TEXT
    CHECK (value_source_type IS NULL OR value_source_type IN (
      'Measured','Observed','Modelled','Derived'
    ));

ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS raw_value TEXT;

ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS raw_unit TEXT;

ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS normalized_value DOUBLE PRECISION;

ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS normalized_unit_id UUID REFERENCES sl_measurement_unit(id);

ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS normalization_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED'
    CHECK (normalization_status IN (
      'NOT_REQUIRED','NORMALIZED','FAILED','REQUIRES_REVIEW','UNSUPPORTED_UNIT'
    ));

ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS normalization_message TEXT;

ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS original_parameter_name TEXT;

ALTER TABLE sl_soil_analysis_result
  ADD COLUMN IF NOT EXISTS original_method_name TEXT;
