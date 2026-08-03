# Field Survey Review (Phase 2.2H)

## Lifecycle

| From | To |
|------|-----|
| PLANNED | IN_PROGRESS, CANCELLED |
| IN_PROGRESS | COMPLETED, CANCELLED |
| COMPLETED | UNDER_REVIEW, IN_PROGRESS |
| UNDER_REVIEW | APPROVED, REJECTED, IN_PROGRESS |
| APPROVED | (immutable; revision forces IN_PROGRESS) |
| REJECTED | IN_PROGRESS |

Submit for review only after COMPLETED. Critical parameters (`requiresExpertVerification`) must be VERIFIED before survey approve.

## API

`POST .../submit-review`, `POST .../review`, `POST .../approve`, `POST .../request-revision`, `POST .../reject`, `GET .../review`

Audit entries written for create/update/status/verify/reject/revision via Physical Suitability audit log.
