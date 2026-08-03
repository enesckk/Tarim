-- 025_scientific_reference_library
-- Phase 2.1I: ScientificReference library + crop many-to-many links

CREATE TABLE IF NOT EXISTS ck_scientific_reference (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  organization TEXT,
  publication_year INTEGER,
  country TEXT,
  doi TEXT,
  isbn TEXT,
  issn TEXT,
  url TEXT,
  reference_type TEXT NOT NULL
    CHECK (reference_type IN (
      'FAO','TAGEM','MINISTRY','UNIVERSITY','JOURNAL','BOOK','THESIS','STANDARD'
    )),
  language TEXT,
  reliability_score DOUBLE PRECISION
    CHECK (reliability_score IS NULL OR (reliability_score >= 0 AND reliability_score <= 100)),
  notes TEXT,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_ck_scientific_reference_active
  ON ck_scientific_reference (is_active, reference_type)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_scientific_reference_title
  ON ck_scientific_reference (title)
  WHERE is_active = TRUE;

-- Many-to-many: crop knowledge ↔ scientific reference
CREATE TABLE IF NOT EXISTS ck_crop_scientific_reference (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  scientific_reference_id UUID NOT NULL REFERENCES ck_scientific_reference(id),
  references_section_id UUID NOT NULL REFERENCES ck_references(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_crop_scientific_reference_active
  ON ck_crop_scientific_reference (crop_knowledge_id, scientific_reference_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_crop_scientific_reference_crop
  ON ck_crop_scientific_reference (crop_knowledge_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_crop_scientific_reference_ref
  ON ck_crop_scientific_reference (scientific_reference_id)
  WHERE is_active = TRUE;
