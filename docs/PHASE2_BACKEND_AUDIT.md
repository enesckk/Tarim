# Phase 2 Backend, Database and API Audit

Date: 2026-08-12

## Verified controls

- JWT authentication, role authorization and producer/officer data isolation are enforced on protected APIs and SignalR.
- Login and refresh endpoints are rate limited; failed login lockout is enabled.
- Refresh tokens are stored as SHA-256 hashes, rotated on use and rejected on replay.
- File access is authenticated and ownership checked. Uploads validate actual JPEG/PNG/WebP signatures, not only names or MIME headers.
- MinIO buckets are private. Failed database writes compensate by deleting the uploaded object.
- API failures use RFC Problem Details with semantic 400/401/403/404/409 statuses. Unhandled exceptions use the platform exception handler.
- `/health/live` checks the process. `/health/ready` verifies both EF contexts, real tables, pending SQL Server migrations and MinIO when enabled.
- Non-development startup rejects missing/default database, JWT, MinIO, Tarım AI and Web Push secrets, demo seeding and non-HTTPS CORS origins.
- Tarım AI integration keys use fixed-time hash comparison.
- SQL Server design-time factories prevent SQLite from corrupting production migration snapshots.
- Repository-local `dotnet-ef` is pinned. CI fails on pending Agriculture or Identity model changes.
- CI builds/tests .NET and Tarım AI, and lints/builds the PWA.

## Database result

`AlignProductionModel` captures the previously missing production changes: task/workflow evidence fields, land assignment, harvest commercial fields, communication additions, device push tokens, land/producer notes and related indexes. Both contexts report no pending model changes after the migration.

## Automated evidence

- .NET Release build: zero warnings, zero errors.
- API integration tests: 8 passed, 0 failed.
- Agriculture pending-model check: clean.
- Identity pending-model check: clean.
- PWA lint: passed with non-blocking cleanup warnings.
- PWA production build: passed; manifest and service worker generated; 98 precache entries.
- Tarım AI tests: 377 passed, 22 environment-dependent tests skipped, 1 todo.
- Tarım AI production TypeScript build: passed.

## Production release gates

The repository is code-ready, but a production claim still requires environment evidence. Before live traffic:

1. Take and verify paired SQL Server and MinIO backups.
2. Apply migrations as an explicit release step; do not enable demo seeding.
3. Supply strong secrets and HTTPS-only CORS origins through the deployment secret store.
4. Verify `/health/live` and `/health/ready` behind the TLS reverse proxy.
5. Run a real-device PWA install, offline-start, Web Push, SignalR reconnect, upload and authenticated download smoke test.
6. Execute the PostgreSQL-dependent Tarım AI tests against the staging database; these are intentionally skipped without that service.
7. Record a restore drill. A backup that has never been restored is not accepted as verified.

No audit can prove that a future infrastructure, browser or dependency failure is impossible. The correct release standard is that all automated gates pass and the environment-specific gates above have recorded evidence.
