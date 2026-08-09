-- 036_ecocrop_import_schema.sql

-- Drop tables if they exist to allow clean recreation during development
DROP TABLE IF EXISTS ck_field_traces;
DROP TABLE IF EXISTS ck_crop_snapshots;

-- 1. Create ck_crop_snapshots table
-- This table stores versioned snapshots of crop profiles (e.g., from ECOCROP import)
CREATE TABLE ck_crop_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id) ON DELETE CASCADE,
    internal_crop_code TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('draft', 'reviewed', 'approved', 'rejected')),
    completeness_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by TEXT,
    approved_by TEXT,
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    UNIQUE(crop_knowledge_id, version_number)
);

CREATE INDEX idx_ck_crop_snapshots_crop_id ON ck_crop_snapshots(crop_knowledge_id);

-- 2. Create ck_field_traces table
-- This table stores the field-level traceability for imported scientific data
CREATE TABLE ck_field_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES ck_crop_snapshots(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g., 'climate', 'soil', 'identity'
    field_name TEXT NOT NULL, -- e.g., 'tmin', 'phmin'
    provider TEXT NOT NULL, -- e.g., 'ECOCROP'
    provider_version TEXT,
    provider_field TEXT, -- e.g., 'TMIN'
    original_value TEXT,
    normalized_value TEXT,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ck_field_traces_snapshot_id ON ck_field_traces(snapshot_id);
