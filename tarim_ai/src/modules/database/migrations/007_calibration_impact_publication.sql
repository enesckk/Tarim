-- 007_calibration_impact_publication
CREATE TABLE IF NOT EXISTS calibration_impact_analyses (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES crop_requirement_profiles(id) ON DELETE CASCADE,
  baseline_profile_id UUID REFERENCES crop_requirement_profiles(id),
  input_hash TEXT NOT NULL,
  result JSONB NOT NULL,
  score_invariant BOOLEAN NOT NULL,
  rank_invariant BOOLEAN NOT NULL,
  profile_updated_at_snapshot TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, input_hash)
);

CREATE TABLE IF NOT EXISTS calibration_publications (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES crop_requirement_profiles(id) ON DELETE CASCADE,
  crop_id TEXT NOT NULL,
  previous_profile_id UUID REFERENCES crop_requirement_profiles(id),
  publication_type TEXT NOT NULL,
  published_by JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_publications_crop
  ON calibration_publications (crop_id, created_at DESC);
