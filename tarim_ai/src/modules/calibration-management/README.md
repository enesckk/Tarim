# Calibration Management

Expert-validated, versioned crop physical requirement profiles and calibration publication workflow.

## Persistence

Supports two providers:

| Provider | Env | Durable |
|---|---|---|
| `in-memory` (default) | `PERSISTENCE_PROVIDER=in-memory` | No |
| `postgresql` | `DATABASE_ENABLED=true` + `PERSISTENCE_PROVIDER=postgresql` | Yes |

Response metadata:

```json
{
  "persistence": {
    "provider": "postgresql",
    "durable": true,
    "type": "postgresql"
  }
}
```

See `src/modules/database/README.md` for migrations, Docker, and health checks.

## Feature flag

`CALIBRATION_MANAGEMENT_ENABLED=true|false`

When disabled, management endpoints return `503 CALIBRATION_MANAGEMENT_DISABLED`. Crop physical compatibility continues with static knowledge-base requirements.
