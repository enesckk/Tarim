-- 004_field_survey_audit
CREATE TABLE IF NOT EXISTS field_survey_audit_events (
  id UUID PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES field_surveys(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor JSONB,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  changed_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  sequence_number BIGINT NOT NULL,
  UNIQUE (survey_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_field_survey_audit_survey_seq
  ON field_survey_audit_events (survey_id, sequence_number ASC);
