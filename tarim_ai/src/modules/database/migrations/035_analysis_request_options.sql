-- 035: Persist optional manual soil / irrigation inputs with each analysis request.

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS request_options JSONB;

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS land_id TEXT;

CREATE INDEX IF NOT EXISTS idx_analyses_land_id
  ON analyses (land_id)
  WHERE land_id IS NOT NULL;
