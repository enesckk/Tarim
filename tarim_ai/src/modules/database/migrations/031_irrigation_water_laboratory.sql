-- 031_irrigation_water_laboratory
-- Phase 2.2G: Irrigation water sources, samples, parameter catalog, results, derived indicators, custody
-- No crop suitability / irrigation scheduling / AI / automatic decisions.
-- AnalysisMethod / Laboratory referenced as opaque UUID (shared 2.2A tables).

CREATE TABLE IF NOT EXISTS iw_water_source (
  id UUID PRIMARY KEY,
  parcel_id TEXT,
  source_code TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN (
      'WELL','SPRING','STREAM','RIVER','CANAL','RESERVOIR','POND','DAM',
      'MUNICIPAL_NETWORK','RAINWATER_STORAGE','TREATED_WASTEWATER','OTHER'
    )),
  ownership_type TEXT NOT NULL
    CHECK (ownership_type IN ('PRIVATE','PUBLIC','COOPERATIVE','SHARED','UNKNOWN')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geometry TEXT,
  is_inside_parcel BOOLEAN,
  related_parcel_id TEXT,
  official_registration_number TEXT,
  license_number TEXT,
  license_status TEXT NOT NULL
    CHECK (license_status IN ('LICENSED','UNLICENSED','PENDING','EXPIRED','UNKNOWN')),
  permit_start_date TIMESTAMPTZ,
  permit_end_date TIMESTAMPTZ,
  intended_use TEXT,
  declared_discharge DOUBLE PRECISION,
  declared_discharge_unit TEXT,
  measured_discharge DOUBLE PRECISION,
  measured_discharge_unit TEXT,
  well_depth DOUBLE PRECISION,
  static_water_level DOUBLE PRECISION,
  dynamic_water_level DOUBLE PRECISION,
  seasonal_availability TEXT,
  continuity_status TEXT NOT NULL
    CHECK (continuity_status IN ('CONTINUOUS','SEASONAL','INTERMITTENT','UNKNOWN')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (declared_discharge IS NULL OR declared_discharge >= 0),
  CHECK (measured_discharge IS NULL OR measured_discharge >= 0),
  CHECK (well_depth IS NULL OR well_depth >= 0),
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_iw_water_source_code_active
  ON iw_water_source (source_code)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_iw_water_source_parcel
  ON iw_water_source (parcel_id)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS iw_measurement_unit (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity_type TEXT NOT NULL,
  conversion_type TEXT NOT NULL,
  conversion_factor DOUBLE PRECISION NOT NULL,
  conversion_offset DOUBLE PRECISION NOT NULL DEFAULT 0,
  canonical_unit_id UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS iw_water_parameter (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  turkish_display_name TEXT NOT NULL,
  english_display_name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN (
      'GENERAL','SALINITY','SODICITY','MAJOR_CATION','MAJOR_ANION',
      'TOXICITY','NUTRIENT','MICROBIOLOGICAL','PHYSICAL','DERIVED'
    )),
  description TEXT,
  canonical_unit_id UUID REFERENCES iw_measurement_unit(id),
  data_type TEXT NOT NULL,
  decimal_precision INTEGER,
  is_directly_measured BOOLEAN NOT NULL,
  is_calculated BOOLEAN NOT NULL,
  is_required_for_irrigation_assessment BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 1000,
  source TEXT,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (NOT (is_calculated AND is_directly_measured))
);

CREATE TABLE IF NOT EXISTS iw_water_sample (
  id UUID PRIMARY KEY,
  water_source_id UUID NOT NULL REFERENCES iw_water_source(id),
  sample_code TEXT NOT NULL,
  sampling_date TIMESTAMPTZ,
  sampling_time TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sampled_by TEXT,
  sampling_point_description TEXT,
  sampling_method TEXT,
  container_type TEXT,
  preservation_method TEXT,
  transport_condition TEXT,
  received_date TIMESTAMPTZ,
  laboratory_id UUID,
  laboratory_report_id UUID,
  water_temperature_at_sampling DOUBLE PRECISION,
  weather_condition TEXT,
  current_status TEXT NOT NULL
    CHECK (current_status IN (
      'PLANNED','COLLECTED','IN_TRANSPORT','RECEIVED','IN_ANALYSIS',
      'ANALYZED','APPROVED','ARCHIVED','REJECTED'
    )),
  barcode TEXT,
  qr_code TEXT,
  seal_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_iw_water_sample_code
  ON iw_water_sample (sample_code);

CREATE INDEX IF NOT EXISTS idx_iw_water_sample_source
  ON iw_water_sample (water_source_id);

CREATE TABLE IF NOT EXISTS iw_water_analysis_result (
  id UUID PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES iw_water_sample(id),
  parameter_id UUID NOT NULL REFERENCES iw_water_parameter(id),
  raw_parameter_name TEXT,
  raw_value TEXT,
  raw_unit TEXT,
  measured_value DOUBLE PRECISION,
  measured_unit_id UUID REFERENCES iw_measurement_unit(id),
  normalized_value DOUBLE PRECISION,
  normalized_unit_id UUID REFERENCES iw_measurement_unit(id),
  analysis_method_id UUID,
  detection_limit DOUBLE PRECISION,
  measurement_uncertainty DOUBLE PRECISION,
  quality_flag TEXT,
  is_accredited BOOLEAN,
  source TEXT,
  verification_status TEXT NOT NULL,
  normalization_status TEXT NOT NULL
    CHECK (normalization_status IN (
      'NOT_REQUIRED','NORMALIZED','FAILED','REQUIRES_REVIEW','UNSUPPORTED_UNIT'
    )),
  normalization_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_iw_water_result_sample_param_method
  ON iw_water_analysis_result (
    sample_id,
    parameter_id,
    COALESCE(analysis_method_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_iw_water_result_sample
  ON iw_water_analysis_result (sample_id);

CREATE TABLE IF NOT EXISTS iw_water_derived_indicator (
  id UUID PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES iw_water_sample(id),
  indicator_code TEXT NOT NULL
    CHECK (indicator_code IN (
      'SAR','ADJUSTED_SAR','RSC','TOTAL_HARDNESS','SODIUM_PERCENTAGE','ION_BALANCE_ERROR'
    )),
  calculated_value DOUBLE PRECISION,
  unit_id UUID REFERENCES iw_measurement_unit(id),
  formula_version TEXT NOT NULL,
  input_parameters_json TEXT NOT NULL,
  calculation_status TEXT NOT NULL
    CHECK (calculation_status IN (
      'CALCULATED','INSUFFICIENT_DATA','INVALID_INPUT','REQUIRES_REVIEW','FAILED'
    )),
  calculation_message TEXT,
  calculated_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_iw_derived_sample_code_active
  ON iw_water_derived_indicator (sample_id, indicator_code)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS iw_water_sample_chain_of_custody (
  id UUID PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES iw_water_sample(id),
  action TEXT NOT NULL
    CHECK (action IN (
      'COLLECTED','SEALED','TRANSPORTED','RECEIVED','OPENED',
      'ANALYZED','APPROVED','ARCHIVED','DESTROYED'
    )),
  performed_by TEXT,
  performed_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_iw_water_custody_sample_time
  ON iw_water_sample_chain_of_custody (sample_id, performed_at);
