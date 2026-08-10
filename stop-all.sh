#!/usr/bin/env bash
# Tek komut: repo kökünden başlatılan app süreçlerini durdurur.
# Docker DB / MinIO / Redis bırakılır (veri korunur).
# Kullanım: ./stop-all.sh   |   npm stop
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT/.run"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  !${NC} $*"; }

kill_port() {
  local port="$1" label="$2"
  local pids
  pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    ok "$label :$port zaten kapalı"
    return 0
  fi
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1
  pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
  ok "$label :$port durduruldu"
}

kill_pidfile() {
  local file="$1" label="$2"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      # process group / children
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
      ok "$label pid $pid sinyali gönderildi"
    fi
    rm -f "$file"
  fi
}

echo -e "${GREEN}Tarım uygulama süreçleri durduruluyor…${NC}"

kill_pidfile "$RUN_DIR/frontend.pid" "Frontend"
kill_pidfile "$RUN_DIR/tarim-ai.pid" "Tarım AI"
kill_pidfile "$RUN_DIR/backend.pid" "Backend"

# tsx/vite/dotnet bazen pidfile dışı kalır
kill_port 5173 "Frontend"
kill_port 4000 "Tarım AI"
kill_port 5109 "Backend"

# İsimle kalan watch süreçleri
pkill -f "tsx watch src/server.ts" 2>/dev/null || true
pkill -f "vite --host 127.0.0.1 --port 5173" 2>/dev/null || true
pkill -f "Agriculture.Api" 2>/dev/null || true

echo ""
echo "Uygulamalar kapandı. Docker (SQL/Redis/MinIO/Postgres) açık bırakıldı."
echo "Hepsini kapatmak için: docker stop agriculture-redis agriculture-minio tarim-ai-postgres"
