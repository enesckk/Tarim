-- 002_field_surveys
CREATE TABLE IF NOT EXISTS field_surveys (
  id UUID PRIMARY KEY,
  parcel_id TEXT NOT NULL,
  parcel_reference JSONB NOT NULL,
  geometry_hash TEXT,
  survey_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived')),
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  base_survey_id UUID REFERENCES field_surveys(id),
  machine_access TEXT,
  created_by JSONB NOT NULL,
  reviewer JSONB,
  review JSONB,
  weather_conditions JSONB,
  parcel_observations JSONB NOT NULL DEFAULT '{}'::jsonb,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_field_surveys_parcel_id ON field_surveys (parcel_id);
CREATE INDEX IF NOT EXISTS idx_field_surveys_status ON field_surveys (status);
CREATE INDEX IF NOT EXISTS idx_field_surveys_parcel_approved
  ON field_surveys (parcel_id, approved_at DESC)
  WHERE status = 'approved';
