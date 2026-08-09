-- 045_field_log_module.sql

CREATE TABLE IF NOT EXISTS fld_log_entries (
  id UUID PRIMARY KEY,
  entry_code VARCHAR(50) UNIQUE NOT NULL,
  producer_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  parcel_id VARCHAR(255) NOT NULL,
  production_plan_id VARCHAR(255),
  production_task_id VARCHAR(255),
  crop_code VARCHAR(255),
  production_scenario_id VARCHAR(255),
  operation_type VARCHAR(50) NOT NULL,
  operation_date TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  performed_by VARCHAR(255),
  supervised_by VARCHAR(255),
  affected_area NUMERIC CHECK (affected_area >= 0),
  affected_area_unit VARCHAR(50),
  location_geometry JSONB,
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy_meters NUMERIC,
  weather_snapshot_id UUID,
  description TEXT,
  producer_notes TEXT,
  expert_notes TEXT,
  source VARCHAR(50),
  verification_status VARCHAR(50),
  review_status VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_fld_log_entries_producer ON fld_log_entries(producer_id);
CREATE INDEX idx_fld_log_entries_parcel_date ON fld_log_entries(parcel_id, operation_date);
CREATE INDEX idx_fld_log_entries_task ON fld_log_entries(production_task_id);
CREATE INDEX idx_fld_log_entries_status ON fld_log_entries(status);
CREATE INDEX idx_fld_log_entries_review_status ON fld_log_entries(review_status);

CREATE TABLE IF NOT EXISTS fld_log_operation_details (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  detail_type VARCHAR(50) NOT NULL,
  parameter_code VARCHAR(100) NOT NULL,
  raw_value VARCHAR(255),
  numeric_value NUMERIC,
  text_value TEXT,
  boolean_value BOOLEAN,
  unit_id VARCHAR(50),
  normalized_value NUMERIC,
  normalized_unit_id VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fld_log_input_usages (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  input_type VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  commercial_name VARCHAR(255),
  active_ingredient VARCHAR(255),
  registration_number VARCHAR(100),
  batch_number VARCHAR(100),
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  unit_id VARCHAR(50) NOT NULL,
  normalized_quantity NUMERIC CHECK (normalized_quantity >= 0),
  normalized_unit_id VARCHAR(50),
  application_method VARCHAR(100),
  application_rate NUMERIC CHECK (application_rate >= 0),
  application_rate_unit_id VARCHAR(50),
  target_purpose VARCHAR(255),
  supplier VARCHAR(255),
  purchase_document_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fld_log_irrigation_details (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  water_source_id VARCHAR(255),
  irrigation_method VARCHAR(50),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER CHECK (duration_minutes >= 0),
  measured_flow_rate NUMERIC CHECK (measured_flow_rate >= 0),
  flow_rate_unit_id VARCHAR(50),
  estimated_water_volume NUMERIC CHECK (estimated_water_volume >= 0),
  measured_water_volume NUMERIC CHECK (measured_water_volume >= 0),
  volume_unit_id VARCHAR(50),
  irrigated_area NUMERIC CHECK (irrigated_area >= 0),
  area_unit_id VARCHAR(50),
  pressure NUMERIC CHECK (pressure >= 0),
  pressure_unit_id VARCHAR(50),
  water_meter_start NUMERIC CHECK (water_meter_start >= 0),
  water_meter_end NUMERIC CHECK (water_meter_end >= 0),
  weather_at_application JSONB,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS fld_log_fertilization_details (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  application_method VARCHAR(50),
  application_timing VARCHAR(50),
  soil_or_foliar VARCHAR(50),
  target_area NUMERIC CHECK (target_area >= 0),
  area_unit_id VARCHAR(50),
  weather_condition JSONB,
  irrigation_associated BOOLEAN,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS fld_log_pesticide_details (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  target_type VARCHAR(100),
  target_name VARCHAR(255),
  application_reason TEXT,
  application_method VARCHAR(100),
  operator_certification_reference VARCHAR(255),
  pre_harvest_interval_days INTEGER CHECK (pre_harvest_interval_days >= 0),
  re_entry_interval_hours INTEGER CHECK (re_entry_interval_hours >= 0),
  weather_condition JSONB,
  wind_condition JSONB,
  buffer_zone_observed BOOLEAN,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS fld_log_machine_usages (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  machine_type VARCHAR(50) NOT NULL,
  machine_name VARCHAR(255),
  registration_or_serial_number VARCHAR(100),
  operator_name VARCHAR(255),
  start_hour_meter NUMERIC CHECK (start_hour_meter >= 0),
  end_hour_meter NUMERIC CHECK (end_hour_meter >= 0),
  fuel_used NUMERIC CHECK (fuel_used >= 0),
  fuel_unit_id VARCHAR(50),
  working_width NUMERIC CHECK (working_width >= 0),
  working_width_unit_id VARCHAR(50),
  maintenance_issue TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fld_log_labor_usages (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  worker_count INTEGER CHECK (worker_count >= 0),
  total_labor_hours NUMERIC CHECK (total_labor_hours >= 0),
  labor_type VARCHAR(50),
  crew_leader VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fld_log_observations (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  observation_type VARCHAR(50) NOT NULL,
  severity VARCHAR(50),
  description TEXT,
  affected_area NUMERIC CHECK (affected_area >= 0),
  area_unit_id VARCHAR(50),
  observed_at TIMESTAMPTZ NOT NULL,
  requires_expert_review BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fld_log_evidence (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  evidence_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  storage_path TEXT NOT NULL,
  file_hash VARCHAR(255),
  captured_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by VARCHAR(255) NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy_meters NUMERIC,
  device_id VARCHAR(255),
  description TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_fld_log_evidence_hash ON fld_log_evidence(file_hash);

CREATE TABLE IF NOT EXISTS fld_log_reviews (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  reviewer_id VARCHAR(255) NOT NULL,
  reviewer_role VARCHAR(50),
  status VARCHAR(50) NOT NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL,
  revision_requested_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fld_log_revisions (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  previous_entry_id UUID,
  change_reason TEXT,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary_json JSONB
);

CREATE TABLE IF NOT EXISTS fld_log_audit_events (
  id UUID PRIMARY KEY,
  field_log_entry_id UUID NOT NULL REFERENCES fld_log_entries(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  reason TEXT,
  correlation_id VARCHAR(255),
  request_id VARCHAR(255),
  user_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
