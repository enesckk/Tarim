-- 011_idempotency_state_and_locking
-- Extend idempotency_records for processing/completed/failed states and locking.

ALTER TABLE idempotency_records
  ALTER COLUMN response_status DROP NOT NULL;

ALTER TABLE idempotency_records
  ALTER COLUMN response_body DROP NOT NULL;

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'completed'
    CHECK (state IN ('processing', 'completed', 'failed', 'expired'));

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS error_code TEXT;

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS original_correlation_id TEXT;

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS response_headers JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE idempotency_records
  ADD COLUMN IF NOT EXISTS generation INTEGER NOT NULL DEFAULT 1 CHECK (generation >= 1);

-- Backfill existing rows as completed
UPDATE idempotency_records
SET state = 'completed',
    completed_at = COALESCE(completed_at, created_at),
    updated_at = COALESCE(updated_at, created_at)
WHERE response_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_idempotency_state
  ON idempotency_records (state);

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at
  ON idempotency_records (created_at DESC);
