-- 034_seasonal_crop_analyses
-- Seasonal Crop Analysis V1: per-parcel, per-season multi-crop suitability
-- pipeline result store. Full result payload is stored as JSONB (request,
-- result, steps) since the shape is composed from several upstream services
-- and is versioned by engine_version / calibration_version rather than by
-- a relational schema. No suitability scores are computed or invented here;
-- this table only persists what the pipeline already produced.

CREATE TABLE IF NOT EXISTS seasonal_crop_analyses (
  id UUID PRIMARY KEY,
  parcel_key TEXT,
  parcel_id TEXT,
  request JSONB NOT NULL,
  result JSONB,
  status TEXT NOT NULL
    CHECK (status IN ('queued', 'processing', 'completed', 'partial_completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  steps JSONB NOT NULL DEFAULT '[]',
  engine_version TEXT NOT NULL,
  calibration_version TEXT NOT NULL,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_seasonal_crop_analyses_parcel_key
  ON seasonal_crop_analyses (parcel_key);

CREATE INDEX IF NOT EXISTS idx_seasonal_crop_analyses_parcel_id
  ON seasonal_crop_analyses (parcel_id);

CREATE INDEX IF NOT EXISTS idx_seasonal_crop_analyses_status
  ON seasonal_crop_analyses (status);

CREATE INDEX IF NOT EXISTS idx_seasonal_crop_analyses_created_at
  ON seasonal_crop_analyses (created_at DESC);
