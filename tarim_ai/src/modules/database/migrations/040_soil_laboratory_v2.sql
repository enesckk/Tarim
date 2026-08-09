-- 040_soil_laboratory_v2
-- Drop previous complex lab tables to rebuild with a simplified, report-centric architecture

DROP TABLE IF EXISTS sl_laboratory_report_attachment CASCADE;
DROP TABLE IF EXISTS sl_laboratory_approval CASCADE;
DROP TABLE IF EXISTS sl_laboratory_import_history CASCADE;
DROP TABLE IF EXISTS sl_import_file CASCADE;
DROP TABLE IF EXISTS sl_import_validation CASCADE;
DROP TABLE IF EXISTS sl_import_mapping CASCADE;
DROP TABLE IF EXISTS sl_import_session CASCADE;
DROP TABLE IF EXISTS sl_soil_analysis_result CASCADE;
DROP TABLE IF EXISTS sl_soil_sample CASCADE;
DROP TABLE IF EXISTS sl_laboratory_report CASCADE;
DROP TABLE IF EXISTS sl_analysis_method CASCADE;
DROP TABLE IF EXISTS sl_soil_parameter_unit CASCADE;
DROP TABLE IF EXISTS sl_soil_parameter_alias CASCADE;
DROP TABLE IF EXISTS sl_soil_parameter_option CASCADE;
DROP TABLE IF EXISTS sl_soil_parameter CASCADE;
DROP TABLE IF EXISTS sl_measurement_unit CASCADE;
DROP TABLE IF EXISTS sl_laboratory CASCADE;

CREATE TABLE sl_analysis_reports (
  id UUID PRIMARY KEY,
  parcel_id TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('Draft', 'Uploaded', 'Parsed', 'Verified', 'Approved', 'Rejected', 'Archived')),
  sample_number TEXT,
  lab_name TEXT,
  lab_accreditation TEXT,
  analysis_date TIMESTAMPTZ,
  sampling_date TIMESTAMPTZ,
  sample_depth TEXT,
  sample_location TEXT,
  report_number TEXT,
  analyst TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  review_status TEXT,
  approval_status TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sl_analysis_reports_parcel ON sl_analysis_reports(parcel_id);
CREATE INDEX idx_sl_analysis_reports_status ON sl_analysis_reports(status);

CREATE TABLE sl_analysis_results (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES sl_analysis_reports(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT,
  source_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sl_analysis_results_report ON sl_analysis_results(report_id);

CREATE TABLE sl_quality_control (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES sl_analysis_reports(id) ON DELETE CASCADE,
  completeness DOUBLE PRECISION NOT NULL,
  missing_fields TEXT[],
  suspicious_values TEXT[],
  duplicate_report BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sl_quality_control_report ON sl_quality_control(report_id);
