-- 008_calibration_audit
CREATE TABLE IF NOT EXISTS calibration_audit_events (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES crop_requirement_profiles(id) ON DELETE CASCADE,
  crop_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor JSONB NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  changed_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  sequence_number BIGINT NOT NULL,
  UNIQUE (profile_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_calibration_audit_profile_seq
  ON calibration_audit_events (profile_id, sequence_number ASC);
