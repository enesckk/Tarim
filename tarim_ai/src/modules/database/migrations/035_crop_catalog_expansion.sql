-- 035_crop_catalog_expansion
-- Expands the Crop Knowledge Base to support the Gaziantep Master List and Profile Tracking

-- 1. Add new tracking and identity fields to ck_general_information
ALTER TABLE ck_general_information ADD COLUMN IF NOT EXISTS internal_crop_code TEXT;
ALTER TABLE ck_general_information ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE ck_general_information ADD COLUMN IF NOT EXISTS seasonal_or_perennial TEXT;
ALTER TABLE ck_general_information ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'identity_only';
ALTER TABLE ck_general_information ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Add check constraint for profile_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_general_information_profile_status_check'
    ) THEN
        ALTER TABLE ck_general_information
        ADD CONSTRAINT ck_general_information_profile_status_check
        CHECK (profile_status IN (
            'identity_only',
            'imported_unreviewed',
            'source_verified',
            'expert_reviewed',
            'approved_for_analysis',
            'incomplete',
            'rejected'
        ));
    END IF;
END $$;

-- Update existing data safely if internal_crop_code is null
UPDATE ck_general_information SET internal_crop_code = identity_code WHERE internal_crop_code IS NULL;
UPDATE ck_general_information SET slug = identity_code WHERE slug IS NULL;
UPDATE ck_general_information SET seasonal_or_perennial = CASE 
    WHEN lifecycle = 'Seasonal' THEN 'seasonal' 
    WHEN lifecycle = 'Perennial' THEN 'perennial' 
    ELSE 'seasonal' 
END WHERE seasonal_or_perennial IS NULL;

-- Now that we have populated the required fields, we can add NOT NULL constraints if we want,
-- but to be safe with existing codebase, we'll keep them nullable for now or just set default.

-- 2. Create Sources Table
CREATE TABLE IF NOT EXISTS ck_crop_sources (
    id UUID PRIMARY KEY,
    crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
    source_name TEXT NOT NULL,
    version TEXT NOT NULL,
    retrieved_at TIMESTAMPTZ,
    review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'reviewed', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for sources
CREATE INDEX IF NOT EXISTS idx_ck_crop_sources_knowledge_id ON ck_crop_sources(crop_knowledge_id);
