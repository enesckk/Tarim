-- 024_crop_production_calendar
-- Phase 2.1H: ProductionCalendar entities (region-scoped; windows deferred)
-- Designed for future Province (il) and District (ilçe) hierarchy via region_scope / parent_region_id.

CREATE TABLE IF NOT EXISTS ck_production_calendar_entry (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  production_calendar_section_id UUID NOT NULL REFERENCES ck_production_calendar(id),
  region_id TEXT NOT NULL,
  region_scope TEXT NOT NULL
    CHECK (region_scope IN ('Country','Province','District','AgroClimatic','Custom')),
  region_code TEXT,
  parent_region_id TEXT,
  planting_start TEXT,
  planting_end TEXT,
  harvest_start TEXT,
  harvest_end TEXT,
  second_crop_supported BOOLEAN NOT NULL DEFAULT FALSE,
  greenhouse_supported BOOLEAN NOT NULL DEFAULT FALSE,
  rainfed_supported BOOLEAN NOT NULL DEFAULT FALSE,
  irrigated_supported BOOLEAN NOT NULL DEFAULT FALSE,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_knowledge_id, region_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_production_calendar_region_active
  ON ck_production_calendar_entry (crop_knowledge_id, region_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_production_calendar_entry_crop
  ON ck_production_calendar_entry (crop_knowledge_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_production_calendar_entry_scope
  ON ck_production_calendar_entry (crop_knowledge_id, region_scope)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_production_calendar_entry_parent
  ON ck_production_calendar_entry (parent_region_id)
  WHERE parent_region_id IS NOT NULL AND is_active = TRUE;
