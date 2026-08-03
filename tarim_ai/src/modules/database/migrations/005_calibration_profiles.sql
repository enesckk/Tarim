-- 005_calibration_profiles
CREATE TABLE IF NOT EXISTS crop_requirement_profiles (
  id UUID PRIMARY KEY,
  crop_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  status TEXT NOT NULL
    CHECK (status IN (
      'draft', 'submitted', 'under_review', 'changes_requested',
      'approved', 'published', 'superseded', 'archived', 'rejected'
    )),
  base_profile_id UUID REFERENCES crop_requirement_profiles(id),
  requirements JSONB NOT NULL,
  field_validation_status JSONB NOT NULL,
  overall_validation_status TEXT NOT NULL,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by JSONB NOT NULL,
  approved_by JSONB,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  impact_analysis JSONB,
  bootstrap_key TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  UNIQUE (crop_id, version),
  UNIQUE (bootstrap_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crop_requirement_one_published
  ON crop_requirement_profiles (crop_id)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_crop_requirement_profiles_crop
  ON crop_requirement_profiles (crop_id, version DESC);
