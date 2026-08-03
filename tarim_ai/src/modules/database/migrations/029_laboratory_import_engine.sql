-- 029_laboratory_import_engine
-- Phase 2.2E: Import session / file / mapping / validation architecture
-- No OCR / AI / PDF parsing / Excel / CSV / XML parsers / real row import.

CREATE TABLE IF NOT EXISTS sl_import_session (
  id UUID PRIMARY KEY,
  session_code TEXT NOT NULL,
  laboratory_id UUID NOT NULL REFERENCES sl_laboratory(id),
  import_type TEXT NOT NULL
    CHECK (import_type IN ('CSV','EXCEL','XML','JSON','API','MANUAL')),
  import_status TEXT NOT NULL
    CHECK (import_status IN (
      'CREATED','UPLOADED','VALIDATING','MAPPING','IMPORTING',
      'COMPLETED','FAILED','PARTIALLY_IMPORTED'
    )),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  imported_by TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  successful_rows INTEGER NOT NULL DEFAULT 0 CHECK (successful_rows >= 0),
  failed_rows INTEGER NOT NULL DEFAULT 0 CHECK (failed_rows >= 0),
  warning_rows INTEGER NOT NULL DEFAULT 0 CHECK (warning_rows >= 0),
  execution_time_ms INTEGER NOT NULL DEFAULT 0 CHECK (execution_time_ms >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sl_import_session_code
  ON sl_import_session (session_code);

CREATE INDEX IF NOT EXISTS idx_sl_import_session_lab
  ON sl_import_session (laboratory_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sl_import_file (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sl_import_session(id),
  original_file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  storage_path TEXT,
  hash TEXT,
  encoding TEXT,
  sheet_name TEXT,
  delimiter TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_sl_import_file_session
  ON sl_import_file (session_id, uploaded_at);

CREATE TABLE IF NOT EXISTS sl_import_mapping (
  id UUID PRIMARY KEY,
  laboratory_id UUID NOT NULL REFERENCES sl_laboratory(id),
  external_parameter_name TEXT NOT NULL,
  external_unit TEXT,
  internal_parameter_code TEXT,
  internal_unit TEXT,
  confidence_score DOUBLE PRECISION
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  requires_review BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_sl_import_mapping_lab
  ON sl_import_mapping (laboratory_id, external_parameter_name);

CREATE TABLE IF NOT EXISTS sl_import_validation (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sl_import_session(id),
  rule_name TEXT NOT NULL
    CHECK (rule_name IN (
      'MISSING_COLUMN','UNKNOWN_PARAMETER','UNKNOWN_UNIT','UNSUPPORTED_FILE_TYPE',
      'DUPLICATE_ROW','MISSING_SAMPLE_CODE','MISSING_LABORATORY',
      'INVALID_NUMBER_FORMAT','INVALID_DATE_FORMAT'
    )),
  severity TEXT NOT NULL
    CHECK (severity IN ('INFO','WARNING','ERROR','CRITICAL')),
  result TEXT NOT NULL
    CHECK (result IN ('PASS','FAIL','SKIPPED')),
  message TEXT NOT NULL,
  affected_row INTEGER,
  affected_column TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_sl_import_validation_session
  ON sl_import_validation (session_id, created_at);
