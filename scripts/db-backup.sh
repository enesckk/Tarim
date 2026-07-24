#!/usr/bin/env bash
# Backup Agriculture SQL Server data volume (Docker).
# Usage: ./scripts/db-backup.sh [output-dir]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx 'agriculture-sql'; then
  echo "agriculture-sql container is not running." >&2
  exit 1
fi

# Load SA password from .env when present
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT/.env"
  set +a
fi
: "${MSSQL_SA_PASSWORD:?Set MSSQL_SA_PASSWORD in .env}"

FILE="$OUT_DIR/AgricultureDb-$STAMP.bak"
echo "Creating backup → $FILE"
docker exec agriculture-sql mkdir -p /var/opt/mssql/backup
docker exec agriculture-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C \
  -Q "BACKUP DATABASE [AgricultureDb] TO DISK = N'/var/opt/mssql/backup/AgricultureDb.bak' WITH INIT"

docker cp agriculture-sql:/var/opt/mssql/backup/AgricultureDb.bak "$FILE"
echo "OK: $FILE"
