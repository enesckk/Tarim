# Field Log & Daily Operations Module

This module (Phase 16) provides a robust tracking mechanism for agricultural field logs. Producers can log any operation (Sowing, Irrigation, Fertilization, Pesticide Application, Machinery Usage, etc.) associated with a specific parcel.

## Key Features
- **Lifecycle Management**: DRAFT -> SUBMITTED -> VERIFIED/REVISION_REQUIRED/REJECTED.
- **Auditing**: Every state transition is audited in `fld_log_audit_events`.
- **Versioning**: Changes require a new row_version. Revisions are tracked.
- **Evidence Collection**: File hashes detect duplicate evidence uploads. Internal storage paths are obfuscated from the client.
- **Integration**: Can be linked to a `productionTaskId`. If marked `completeLinkedTask = true`, verifying the log completes the task via the event bus.

## APIs

### `POST /api/field-logs`
Creates a new DRAFT log.

### `POST /api/field-logs/:id/submit`
Submits a DRAFT log for expert review. Emits `FIELD_LOG_SUBMITTED`.

### `POST /api/field-logs/:id/verify`
Expert verifies the log. Emits `FIELD_LOG_VERIFIED`. Optionally emits `LINKED_TASK_COMPLETION_REQUESTED`.

### `POST /api/field-logs/:id/evidence`
Attaches file evidence to a log.
