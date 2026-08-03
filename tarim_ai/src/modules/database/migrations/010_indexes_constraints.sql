-- 010_indexes_constraints
-- Additional supporting indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_field_surveys_updated_at
  ON field_surveys (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_crop_requirement_profiles_status
  ON crop_requirement_profiles (status);

CREATE INDEX IF NOT EXISTS idx_calibration_impact_profile
  ON calibration_impact_analyses (profile_id, created_at DESC);
