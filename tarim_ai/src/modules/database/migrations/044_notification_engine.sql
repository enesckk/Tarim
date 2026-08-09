-- 044_notification_engine.sql
-- Phase 15: Notification and Reminder Engine

CREATE TABLE IF NOT EXISTS ntf_notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  language TEXT NOT NULL DEFAULT 'tr',
  task_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  expert_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  weather_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  system_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, channel)
);

CREATE TABLE IF NOT EXISTS ntf_reminder_rules (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  days_before INTEGER,
  hours_before INTEGER,
  repeat_interval_hours INTEGER,
  maximum_repeat_count INTEGER,
  supported_channels TEXT[] NOT NULL DEFAULT '{"IN_APP"}',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ntf_notifications (
  id UUID PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  producer_id UUID,
  parcel_id UUID,
  production_plan_id UUID,
  task_id UUID,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL
    CHECK (status IN ('DRAFT', 'SCHEDULED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED', 'EXPIRED')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  source TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ntf_delivery_attempts (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES ntf_notifications(id) ON DELETE CASCADE,
  provider_message_id TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  safe_error_message TEXT,
  retryable BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ntf_audit_events (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES ntf_notifications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  correlation_id TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_ntf_notifications_scheduled_at ON ntf_notifications(scheduled_at);
CREATE INDEX idx_ntf_notifications_user_read ON ntf_notifications(user_id, read_at);
CREATE INDEX idx_ntf_notifications_task ON ntf_notifications(task_id);
CREATE INDEX idx_ntf_notifications_plan ON ntf_notifications(production_plan_id);

-- Initial Reminder Rules
INSERT INTO ntf_reminder_rules (id, code, name, notification_type, trigger_type, days_before, priority, source) VALUES
  (gen_random_uuid(), 'TASK_READY_3D', '3 Days Before Task', 'TASK_DUE_SOON', 'BEFORE_DUE_DATE', 3, 'NORMAL', 'SYSTEM'),
  (gen_random_uuid(), 'TASK_READY_1D', '1 Day Before Task', 'TASK_DUE_SOON', 'BEFORE_DUE_DATE', 1, 'HIGH', 'SYSTEM'),
  (gen_random_uuid(), 'TASK_DUE_TODAY', 'On Task Due Date', 'TASK_DUE_TODAY', 'ON_DUE_DATE', 0, 'HIGH', 'SYSTEM'),
  (gen_random_uuid(), 'TASK_OVERDUE_1D', '1 Day Overdue', 'TASK_OVERDUE', 'AFTER_DUE_DATE', -1, 'CRITICAL', 'SYSTEM');
