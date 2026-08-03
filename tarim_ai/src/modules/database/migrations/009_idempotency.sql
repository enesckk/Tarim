-- 009_idempotency
CREATE TABLE IF NOT EXISTS idempotency_records (
  key TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  resource_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key, operation)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires
  ON idempotency_records (expires_at);
