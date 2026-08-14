# Staging deployment

1. Copy `.env.staging.example` to `.env.staging` and replace every placeholder.
2. Terminate TLS at the host reverse proxy and forward only HTTPS traffic to `127.0.0.1:8080`.
3. Run `powershell -ExecutionPolicy Bypass -File scripts/verify-staging.ps1` from the repository root.

The data network is internal and SQL Server, PostgreSQL, MinIO, and Redis publish no host ports. Demo seeding and startup migrations are disabled. Migrations run as one-shot jobs before the API starts. The real `.env.staging` file is ignored by Git.

The API trusts `X-Forwarded-For` and `X-Forwarded-Proto` only in the supported topology where it has no published host port and is reachable solely through the frontend reverse proxy. Do not publish `tarim-api:8080` directly. The frontend adds HSTS, CSP, clickjacking, MIME-sniffing, referrer, and permissions-policy headers to every response.

Rotate the application-layer staging secrets with `scripts/rotate-staging-app-secrets.ps1`. This changes only JWT signing and Tarım AI integration keys; restart `tarim-api` and `tarim-ai` immediately afterward. Existing sessions are intentionally invalidated.

Run the paired staging data-protection drill with `scripts/test-staging-backup-restore.ps1`. It creates a checksum SQL backup, restores it to a temporary database and runs `DBCC CHECKDB`; it creates and validates a Tarım AI PostgreSQL custom archive and restores it into a separate temporary database; it mirrors the private MinIO bucket to the same ignored artifact folder, restores it into a clean temporary MinIO container, and compares a SHA-256 canary. Successful artifacts and `manifest.json` remain under ignored `backups/staging/`; temporary databases, containers, and source canaries are removed.

## Observability and service alerts (4A-3)

Seq is available only on the deployment host at `http://127.0.0.1:5341` and requires the `SEQ_ADMIN_PASSWORD` value from the ignored staging environment file. The API sends structured request and application events to Seq through the internal app network. Container stdout/stderr remains the fallback for every service.

Run `scripts/test-staging-observability.ps1` after a deployment and during acceptance. It verifies all long-running containers, restart counts, public health endpoints, Seq reachability, and recent fatal/error signatures. It writes a machine-readable report under ignored `backups/staging-observability/` and returns a non-zero exit code when an alert condition is present.

For continuous host-level alerts, schedule the script every five minutes with the municipal monitoring runner and alert on a non-zero process exit. Keep the JSON report as the incident attachment. Production must additionally probe the HTTPS `/health/live` endpoint from outside the host.

## Physical-device acceptance (3C)

1. Generate a local ignored staging secret file with `scripts/new-staging-env.ps1`.
2. Run `scripts/start-device-acceptance.ps1` only for the supervised Android/iPhone acceptance session.
3. Use the printed HTTPS URL and record results in `docs/PWA_DEVICE_ACCEPTANCE.md`.
4. Run `scripts/stop-device-acceptance.ps1` immediately after the session.

The device profile creates an outbound Cloudflare Quick Tunnel. Its temporary URL is publicly reachable while the tunnel container runs, so it is never enabled by the normal staging command. The acceptance seed is synthetic, explicit, idempotent, and runs in a short-lived container; the long-running API remains in Staging mode with automatic demo seeding disabled.
