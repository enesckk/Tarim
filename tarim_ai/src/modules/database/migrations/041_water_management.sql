-- 041_water_management
-- Create tables for the new Water Management module

CREATE TABLE wm_water_sources (
  id UUID PRIMARY KEY,
  parcel_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL 
    CHECK (source_type IN ('Groundwater Well', 'DSİ Well', 'Shared Well', 'Irrigation Canal', 'Pond', 'Dam', 'Spring', 'River', 'Municipal Water', 'Rainwater Storage', 'Other')),
  active BOOLEAN NOT NULL DEFAULT true,
  owner TEXT,
  shared BOOLEAN NOT NULL DEFAULT false,
  distance_to_parcel DOUBLE PRECISION,
  available BOOLEAN NOT NULL DEFAULT true,
  seasonal BOOLEAN NOT NULL DEFAULT false,
  estimated_capacity DOUBLE PRECISION,
  flow_rate DOUBLE PRECISION,
  pump_available BOOLEAN NOT NULL DEFAULT false,
  electricity_available BOOLEAN NOT NULL DEFAULT false,
  license_number TEXT,
  notes TEXT,
  data_confidence TEXT,
  source_quality TEXT,
  review_status TEXT,
  approval_status TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wm_water_sources_parcel ON wm_water_sources(parcel_id);

CREATE TABLE wm_water_quantity (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES wm_water_sources(id) ON DELETE CASCADE,
  estimated_flow DOUBLE PRECISION,
  measured_flow DOUBLE PRECISION,
  daily_capacity DOUBLE PRECISION,
  seasonal_capacity DOUBLE PRECISION,
  reliability TEXT,
  measurement_date TIMESTAMPTZ,
  measurement_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wm_water_quantity_source ON wm_water_quantity(source_id);

CREATE TABLE wm_laboratory_reports (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES wm_water_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL
    CHECK (status IN ('Draft', 'Uploaded', 'Parsed', 'Verified', 'Approved', 'Rejected', 'Archived')),
  analysis_date TIMESTAMPTZ,
  sampling_date TIMESTAMPTZ,
  report_number TEXT,
  analyst TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wm_laboratory_reports_source ON wm_laboratory_reports(source_id);
CREATE INDEX idx_wm_laboratory_reports_status ON wm_laboratory_reports(status);

CREATE TABLE wm_analysis_results (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES wm_laboratory_reports(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT,
  source_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wm_analysis_results_report ON wm_analysis_results(report_id);
