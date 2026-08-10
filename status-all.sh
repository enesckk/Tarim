#!/usr/bin/env bash
# Hızlı durum: hangi portlar ayakta?
set -euo pipefail

check() {
  local port="$1" name="$2" url="${3:-}"
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    local code="—"
    if [[ -n "$url" ]]; then
      code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$url" || echo err)"
    fi
    echo "  OK  :$port  $name  (http $code)"
  else
    echo "  --  :$port  $name  kapalı"
  fi
}

echo "Tarım servis durumu"
check 1433 "SQL Server"
check 5433 "AI Postgres"
check 6379 "Redis"
check 9000 "MinIO" "http://127.0.0.1:9000/minio/health/live"
check 5109 "AMS Backend" "http://127.0.0.1:5109/swagger/index.html"
check 4000 "Tarım AI" "http://127.0.0.1:4000/health"
check 5173 "Frontend" "http://127.0.0.1:5173/"
