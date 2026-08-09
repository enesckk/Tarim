-- 043_production_planning.sql
-- Phase 14: Dynamic Production Planning Engine

CREATE TABLE IF NOT EXISTS pp_production_plans (
  id UUID PRIMARY KEY,
  crop_code TEXT NOT NULL,
  parcel_id UUID,
  planting_date DATE NOT NULL,
  production_scenario TEXT,
  rainfed_irrigated TEXT,
  region TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('Active', 'Completed', 'Cancelled', 'Paused')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS pp_production_tasks (
  id UUID PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES pp_production_plans(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL
    CHECK (priority IN ('High', 'Medium', 'Low', 'Critical')),
  estimated_duration INTEGER,
  status TEXT NOT NULL
    CHECK (status IN ('Planned', 'Waiting', 'Ready', 'In Progress', 'Completed', 'Skipped', 'Cancelled')),
  dependencies JSONB, -- list of task IDs
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS pp_task_audits (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES pp_production_tasks(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT,
  previous_start_date DATE,
  new_start_date DATE,
  previous_due_date DATE,
  new_due_date DATE,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pp_production_tasks_plan
  ON pp_production_tasks (plan_id, start_date);

CREATE INDEX IF NOT EXISTS idx_pp_task_audits_task
  ON pp_task_audits (task_id, changed_at DESC);
