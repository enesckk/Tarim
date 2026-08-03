-- 028_laboratory_report_management
-- Phase 2.2D: Laboratory report metadata, attachments, approvals, import history
-- No OCR / PDF parsing / AI interpretation / Excel parameter mapping.

CREATE TABLE IF NOT EXISTS sl_laboratory_report (
  id UUID PRIMARY KEY,
  report_number TEXT NOT NULL,
  report_date TIMESTAMPTZ,
  laboratory_id UUID NOT NULL REFERENCES sl_laboratory(id),
  parcel_id TEXT,
  sample_id UUID REFERENCES sl_soil_sample(id),
  customer_name TEXT,
  requested_by TEXT,
  approved_by TEXT,
  status TEXT NOT NULL
    CHECK (status IN (
      'PENDING','UNDER_REVIEW','APPROVED','REJECTED','ARCHIVED'
    )),
  report_language TEXT,
  report_version TEXT,
  original_file_name TEXT,
  original_file_type TEXT,
  original_file_size BIGINT,
  file_hash TEXT,
  storage_path TEXT,
  digital_signature TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_laboratory_report_number_active
  ON sl_laboratory_report (laboratory_id, report_number)
  WHERE is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_laboratory_report_hash_active
  ON sl_laboratory_report (file_hash)
  WHERE is_active = TRUE AND file_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sl_laboratory_report_lab
  ON sl_laboratory_report (laboratory_id, report_date DESC)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_laboratory_report_attachment (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES sl_laboratory_report(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_category TEXT NOT NULL
    CHECK (file_category IN (
      'PDF','EXCEL','CSV','IMAGE','SCAN','XML','JSON'
    )),
  storage_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  page_count INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL,
  uploaded_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_sl_report_attachment_report
  ON sl_laboratory_report_attachment (report_id, uploaded_at)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_laboratory_approval (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES sl_laboratory_report(id),
  approved_by TEXT,
  approval_date TIMESTAMPTZ,
  approval_status TEXT NOT NULL
    CHECK (approval_status IN (
      'PENDING','UNDER_REVIEW','APPROVED','REJECTED','ARCHIVED'
    )),
  approval_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sl_laboratory_approval_report
  ON sl_laboratory_approval (report_id, created_at)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sl_laboratory_import_history (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES sl_laboratory_report(id),
  imported_by TEXT,
  imported_at TIMESTAMPTZ NOT NULL,
  import_type TEXT NOT NULL
    CHECK (import_type IN ('MANUAL','EXCEL','CSV','API','OCR')),
  imported_parameter_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_parameter_count >= 0),
  successful_parameter_count INTEGER NOT NULL DEFAULT 0 CHECK (successful_parameter_count >= 0),
  failed_parameter_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_parameter_count >= 0),
  warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
  execution_time_ms INTEGER NOT NULL DEFAULT 0 CHECK (execution_time_ms >= 0),
  logs TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sl_laboratory_import_history_report
  ON sl_laboratory_import_history (report_id, imported_at)
  WHERE is_active = TRUE;
