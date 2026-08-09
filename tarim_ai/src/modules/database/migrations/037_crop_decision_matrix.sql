-- 037_crop_decision_matrix
-- Phase 3: Scientific Decision Matrix and Criteria Catalog (Additive)

CREATE TABLE IF NOT EXISTS ck_criteria_catalog (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Climate', 'Soil', 'Water', 'Terrain', 'Management', 'Production')),
  data_type TEXT NOT NULL CHECK (data_type IN ('numeric', 'boolean', 'categorical')),
  unit TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS ck_decision_rules (
  id UUID PRIMARY KEY,
  crop_knowledge_id UUID NOT NULL REFERENCES ck_crop_knowledge(id),
  criterion_id UUID NOT NULL REFERENCES ck_criteria_catalog(id),
  decision_role TEXT NOT NULL CHECK (decision_role IN ('critical_barrier', 'major_constraint', 'scoring', 'supporting', 'informational')),
  importance TEXT NOT NULL CHECK (importance IN ('required', 'high', 'medium', 'low')),
  missing_data_behavior TEXT NOT NULL CHECK (missing_data_behavior IN ('stop_analysis', 'continue_with_warning', 'continue_using_fallback', 'exclude_from_score', 'required_user_input')),
  
  -- Scientific Thresholds (Reserved for future numerical injection)
  min_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  optimal_min DOUBLE PRECISION,
  optimal_max DOUBLE PRECISION,
  tolerance DOUBLE PRECISION,
  
  condition_expression TEXT,
  explanation_template TEXT,
  
  version INTEGER NOT NULL DEFAULT 1,
  source TEXT,
  review_status TEXT NOT NULL CHECK (review_status IN ('Draft', 'Reviewing', 'Approved', 'Rejected')),
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  
  UNIQUE (crop_knowledge_id, criterion_id, version)
);

CREATE INDEX IF NOT EXISTS idx_ck_decision_rules_crop ON ck_decision_rules (crop_knowledge_id);
CREATE INDEX IF NOT EXISTS idx_ck_decision_rules_criterion ON ck_decision_rules (criterion_id);

CREATE TABLE IF NOT EXISTS ck_data_source_priorities (
  id UUID PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES ck_decision_rules(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  priority_rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (rule_id, source_name),
  UNIQUE (rule_id, priority_rank)
);

-- Explainability mapping is intrinsically supported via mapping: (Analysis) -> ck_data_source_priorities (Source) -> ck_decision_rules (Rule) -> result + explanation_template
