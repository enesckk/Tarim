-- 023_crop_risk_profile
-- Phase 2.1G: CropRisk entities (risk-type shells; levels/mitigation deferred)

CREATE TABLE IF NOT EXISTS ck_crop_risk (
  id UUID PRIMARY KEY,
  crop_id UUID NOT NULL,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  risk_profile_id UUID NOT NULL REFERENCES ck_risk_profile(id),
  risk_type TEXT NOT NULL
    CHECK (risk_type IN (
      'FROST','DROUGHT','HEAT','EXCESS_RAIN','FLOOD','SALINITY',
      'SODICITY','EROSION','DISEASE','PEST','WIND','HAIL'
    )),
  risk_level TEXT NOT NULL
    CHECK (risk_level IN ('Unknown','Low','Moderate','High','Critical')),
  sensitivity TEXT NOT NULL
    CHECK (sensitivity IN ('Unknown','Low','Moderate','High')),
  description TEXT,
  mitigation_suggestion TEXT,
  source_reference_id UUID,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('Draft','SourceVerified','ExpertReviewed','Approved','Deprecated')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (crop_knowledge_id, risk_type, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ck_crop_risk_type_active
  ON ck_crop_risk (crop_knowledge_id, risk_type)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ck_crop_risk_crop
  ON ck_crop_risk (crop_knowledge_id)
  WHERE is_active = TRUE;
