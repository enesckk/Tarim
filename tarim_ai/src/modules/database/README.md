# Database Persistence

PostgreSQL-backed durable storage for Field Survey and Calibration Management.

## Technology

**node-postgres (`pg`)** with plain SQL migrations.

Why not Prisma/Drizzle/TypeORM:
- Project has no existing ORM
- Repository interfaces already isolate persistence
- Lightweight transactions and pooling are enough
- Migrations stay explicit and reviewable

## Providers

| `PERSISTENCE_PROVIDER` | `DATABASE_ENABLED` | Behavior |
|---|---|---|
| `in-memory` | false (default) | Process memory (non-durable) |
| `postgresql` | true | PostgreSQL (durable) |

Do **not** silently fall back from PostgreSQL to memory on connection failure. Writes fail with `503 DATABASE_UNAVAILABLE`.

## Environment

```bash
DATABASE_ENABLED=true
PERSISTENCE_PROVIDER=postgresql
DATABASE_URL=postgresql://tarim:tarim@localhost:5433/tarim_ai
DATABASE_CONNECTION_TIMEOUT_MS=5000
DATABASE_STATEMENT_TIMEOUT_MS=15000
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=10
DATABASE_SSL=false
DATABASE_AUTO_MIGRATE=false
```

Never log or return `DATABASE_URL` in API responses.

## Local PostgreSQL (Docker)

```bash
npm run db:up
npm run db:migrate
```

`docker-compose.yml` starts Postgres 16 with volume `tarim_ai_pgdata`.

## Migrations

Forward-only SQL files in `src/modules/database/migrations/`.

```bash
npm run db:migrate
```

Production default: `DATABASE_AUTO_MIGRATE=false` (run migrations explicitly).

## Health

- `GET /health` — includes persistence provider metadata
- `GET /api/health/database` — connectivity, latency, migration status, pool stats

## Graceful shutdown

`SIGINT` / `SIGTERM` close the HTTP server and drain the PG pool.

## Tests

Default unit/integration suite uses **in-memory**.

PostgreSQL integration tests run when:

```bash
DATABASE_URL=postgresql://tarim:tarim@localhost:5433/tarim_ai \
DATABASE_ENABLED=true \
PERSISTENCE_PROVIDER=postgresql \
npm test -- src/modules/database/tests
```

## Known limitations

- No production auth
- No photo binary/S3 storage
- No automated backups
- No PostGIS spatial queries
- Calibration values remain unvalidated
- Recommendations remain preliminary
