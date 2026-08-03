-- 006_calibration_sources_reviews
CREATE TABLE IF NOT EXISTS calibration_sources (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES crop_requirement_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  organization TEXT,
  authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  publication_year INTEGER,
  reference TEXT,
  url TEXT,
  notes TEXT,
  supports JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_sources_profile
  ON calibration_sources (profile_id);

CREATE TABLE IF NOT EXISTS calibration_reviews (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES crop_requirement_profiles(id) ON DELETE CASCADE,
  reviewer JSONB NOT NULL,
  decision TEXT NOT NULL,
  reviewed_fields JSONB NOT NULL,
  comments TEXT NOT NULL,
  suggested_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calibration_reviews_profile
  ON calibration_reviews (profile_id);
