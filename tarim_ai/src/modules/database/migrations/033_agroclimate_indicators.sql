-- 033_agroclimate_indicators
-- Phase 2.3A: AgroClimate Indicators Engine
-- Climate data sources, observations, indicator catalog, calculation configs,
-- analysis runs, versioned indicator results, source comparisons.
-- No suitability scoring, crop ranking, AI, irrigation scheduling, or yield estimates.
-- null ≠ 0 for missing climate values; calculations use normalized values only.

CREATE TABLE IF NOT EXISTS ac_climate_data_source (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN (
      'NASA_POWER','ERA5_LAND','WEATHER_STATION','SATELLITE_DERIVED','MANUAL_IMPORT','OTHER'
    )),
  spatial_resolution TEXT,
  temporal_resolution TEXT,
  coverage_start_date DATE,
  coverage_end_date DATE,
  api_version TEXT,
  dataset_version TEXT,
  license TEXT,
  priority INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ac_climate_data_source_code_active
  ON ac_climate_data_source (code) WHERE is_active;

CREATE TABLE IF NOT EXISTS ac_climate_observation (
  id UUID PRIMARY KEY,
  parcel_id TEXT NOT NULL,
  zone_id TEXT,
  data_source_id UUID NOT NULL REFERENCES ac_climate_data_source(id),
  observation_date DATE NOT NULL,
  observation_time TEXT,
  parameter_code TEXT NOT NULL
    CHECK (parameter_code IN (
      'T2M_MIN','T2M_MAX','T2M_MEAN','SOIL_TEMPERATURE','PRECIPITATION',
      'RELATIVE_HUMIDITY','SOLAR_RADIATION','WIND_SPEED','WIND_DIRECTION',
      'SURFACE_PRESSURE','DEW_POINT','SOIL_MOISTURE','REFERENCE_ET','CLOUD_COVER'
    )),
  raw_value DOUBLE PRECISION,
  raw_unit TEXT,
  normalized_value DOUBLE PRECISION,
  normalized_unit_id UUID,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  spatial_resolution TEXT,
  temporal_resolution TEXT,
  quality_flag TEXT NOT NULL
    CHECK (quality_flag IN ('RAW','ESTIMATED','GAP_FILLED','QC_FLAGGED','MISSING')),
  missing_reason TEXT,
  source_record_id TEXT,
  dataset_version TEXT,
  retrieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ac_observation_parcel_source_date_param_active
  ON ac_climate_observation (parcel_id, data_source_id, observation_date, parameter_code)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_ac_climate_observation_parcel
  ON ac_climate_observation (parcel_id) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_ac_climate_observation_source_date
  ON ac_climate_observation (data_source_id, observation_date) WHERE is_active;

CREATE TABLE IF NOT EXISTS ac_agroclimate_indicator (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  turkish_display_name TEXT NOT NULL,
  english_display_name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN (
      'TEMPERATURE','FROST','HEAT','GROWING_SEASON','PRECIPITATION','DROUGHT',
      'WATER_BALANCE','EVAPOTRANSPIRATION','RADIATION','HUMIDITY','WIND','DATA_QUALITY'
    )),
  description TEXT,
  canonical_unit_id UUID,
  calculation_type TEXT NOT NULL
    CHECK (calculation_type IN ('DIRECT','AGGREGATED','DERIVED','STATISTICAL','EVENT_BASED')),
  temporal_scope TEXT NOT NULL
    CHECK (temporal_scope IN ('DAILY','MONTHLY','SEASONAL','ANNUAL','MULTI_YEAR','CUSTOM_PERIOD')),
  spatial_scope TEXT NOT NULL
    CHECK (spatial_scope IN ('POINT','PARCEL','ZONE','REGION')),
  requires_daily_data BOOLEAN NOT NULL DEFAULT TRUE,
  requires_hourly_data BOOLEAN NOT NULL DEFAULT FALSE,
  minimum_data_coverage_percent DOUBLE PRECISION,
  formula_version TEXT NOT NULL,
  is_required_for_physical_suitability BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 1000,
  source TEXT,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ac_calculation_config (
  id UUID PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES ac_agroclimate_indicator(id),
  region_id TEXT NOT NULL,
  crop_id TEXT,
  base_temperature DOUBLE PRECISION,
  upper_temperature_limit DOUBLE PRECISION,
  frost_threshold DOUBLE PRECISION,
  severe_frost_threshold DOUBLE PRECISION,
  extreme_heat_threshold DOUBLE PRECISION,
  heatwave_minimum_duration INTEGER CHECK (heatwave_minimum_duration IS NULL OR heatwave_minimum_duration > 0),
  rainy_day_threshold DOUBLE PRECISION,
  heavy_rain_threshold DOUBLE PRECISION,
  dry_day_threshold DOUBLE PRECISION,
  calculation_period_start DATE,
  calculation_period_end DATE,
  formula_code TEXT,
  formula_version TEXT,
  source TEXT,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_ac_calculation_config_indicator
  ON ac_calculation_config (indicator_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS ac_analysis_run (
  id UUID PRIMARY KEY,
  parcel_id TEXT NOT NULL,
  zone_id TEXT,
  analysis_code TEXT NOT NULL,
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  baseline_period_start DATE,
  baseline_period_end DATE,
  primary_data_source_id UUID NOT NULL REFERENCES ac_climate_data_source(id),
  secondary_data_source_id UUID REFERENCES ac_climate_data_source(id),
  status TEXT NOT NULL
    CHECK (status IN (
      'CREATED','VALIDATING','FETCHING_DATA','NORMALIZING','CALCULATING',
      'COMPLETED','PARTIALLY_COMPLETED','FAILED','REQUIRES_REVIEW'
    )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  requested_by TEXT,
  formula_set_version TEXT NOT NULL,
  minimum_coverage_requirement DOUBLE PRECISION,
  actual_coverage_percent DOUBLE PRECISION,
  quality_status TEXT
    CHECK (quality_status IS NULL OR quality_status IN (
      'VALID','LIMITED','INSUFFICIENT','CONFLICTING_SOURCES','REQUIRES_REVIEW'
    )),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (analysis_period_start <= analysis_period_end)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ac_analysis_run_code_active
  ON ac_analysis_run (analysis_code) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_ac_analysis_run_parcel
  ON ac_analysis_run (parcel_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS ac_indicator_result (
  id UUID PRIMARY KEY,
  analysis_run_id UUID NOT NULL REFERENCES ac_analysis_run(id),
  indicator_id UUID NOT NULL REFERENCES ac_agroclimate_indicator(id),
  parcel_id TEXT NOT NULL,
  zone_id TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calculated_value DOUBLE PRECISION,
  unit_id UUID,
  calculation_status TEXT NOT NULL
    CHECK (calculation_status IN (
      'CALCULATED','INSUFFICIENT_DATA','INVALID_INPUT','SOURCE_CONFLICT','REQUIRES_REVIEW','FAILED'
    )),
  formula_code TEXT,
  formula_version TEXT NOT NULL,
  configuration_id UUID REFERENCES ac_calculation_config(id),
  input_data_count INTEGER,
  expected_data_count INTEGER,
  data_coverage_percent DOUBLE PRECISION,
  primary_source_id UUID REFERENCES ac_climate_data_source(id),
  secondary_source_id UUID REFERENCES ac_climate_data_source(id),
  source_difference_percent DOUBLE PRECISION,
  confidence_level TEXT NOT NULL
    CHECK (confidence_level IN ('LOW','MEDIUM','HIGH','VERY_HIGH')),
  quality_flag TEXT
    CHECK (quality_flag IS NULL OR quality_flag IN (
      'RAW','ESTIMATED','GAP_FILLED','QC_FLAGGED','MISSING'
    )),
  calculation_message TEXT,
  input_summary_json TEXT NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Multiple versions allowed per (analysis_run_id, indicator_id); no uniqueness on that pair.
CREATE INDEX IF NOT EXISTS idx_ac_indicator_result_run
  ON ac_indicator_result (analysis_run_id) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_ac_indicator_result_run_indicator_version
  ON ac_indicator_result (analysis_run_id, indicator_id, version DESC);

CREATE TABLE IF NOT EXISTS ac_source_comparison (
  id UUID PRIMARY KEY,
  parcel_id TEXT NOT NULL,
  parameter_code TEXT NOT NULL
    CHECK (parameter_code IN (
      'T2M_MIN','T2M_MAX','T2M_MEAN','SOIL_TEMPERATURE','PRECIPITATION',
      'RELATIVE_HUMIDITY','SOLAR_RADIATION','WIND_SPEED','WIND_DIRECTION',
      'SURFACE_PRESSURE','DEW_POINT','SOIL_MOISTURE','REFERENCE_ET','CLOUD_COVER'
    )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  primary_source_id UUID NOT NULL REFERENCES ac_climate_data_source(id),
  secondary_source_id UUID NOT NULL REFERENCES ac_climate_data_source(id),
  primary_record_count INTEGER NOT NULL DEFAULT 0,
  secondary_record_count INTEGER NOT NULL DEFAULT 0,
  mean_absolute_difference DOUBLE PRECISION,
  percentage_difference DOUBLE PRECISION,
  correlation_value DOUBLE PRECISION,
  comparison_status TEXT NOT NULL
    CHECK (comparison_status IN (
      'CONSISTENT','MINOR_DIFFERENCE','MAJOR_DIFFERENCE','INSUFFICIENT_DATA','REQUIRES_REVIEW'
    )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  CHECK (period_start <= period_end),
  CHECK (primary_source_id <> secondary_source_id)
);

CREATE INDEX IF NOT EXISTS idx_ac_source_comparison_parcel
  ON ac_source_comparison (parcel_id);
