-- 012: Analysis orchestrator tables

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  block TEXT NOT NULL,
  parcel TEXT NOT NULL,
  parcel_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'partial_completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  result JSONB,
  result_version INTEGER NOT NULL DEFAULT 1,
  correlation_id TEXT,
  error_code TEXT,
  error_summary TEXT,
  data_mode TEXT NOT NULL DEFAULT 'live' CHECK (data_mode IN ('live', 'golden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses (status);
CREATE INDEX IF NOT EXISTS idx_analyses_parcel ON analyses (province, district, neighborhood, block, parcel);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_correlation_id ON analyses (correlation_id) WHERE correlation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS analysis_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'missing', 'failed', 'skipped')),
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (analysis_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_analysis_steps_analysis_id ON analysis_steps (analysis_id);

CREATE TABLE IF NOT EXISTS analysis_provider_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  step_key TEXT NOT NULL,
  request_metadata JSONB,
  response_hash TEXT,
  response_summary JSONB,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_date TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial', 'cached')),
  cache_key TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_provider_snapshots_analysis_id ON analysis_provider_snapshots (analysis_id);
