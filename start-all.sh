#!/usr/bin/env bash
# Tek komut: tüm Tarım yığınını aynı repo kökünden ayağa kaldırır.
# Kullanım: ./start-all.sh   |   npm start
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT/.run"
LOG_DIR="$RUN_DIR/logs"
mkdir -p "$LOG_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  !${NC} $*"; }
fail() { echo -e "${RED}  ✗${NC} $*"; }

port_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

wait_http() {
  local url="$1" name="$2" seconds="${3:-45}"
  local i
  for i in $(seq 1 "$seconds"); do
    if curl -sf -o /dev/null --max-time 2 "$url"; then
      ok "$name hazır ($url)"
      return 0
    fi
    sleep 1
  done
  fail "$name zaman aşımı: $url"
  return 1
}

start_bg() {
  local name="$1" pidfile="$2" logfile="$3"
  shift 3
  nohup bash -lc "$*" >"$logfile" 2>&1 &
  local pid=$!
  echo "$pid" >"$pidfile"
  disown "$pid" 2>/dev/null || true
  ok "$name başlatıldı (pid $pid) → $logfile"
}

echo -e "${GREEN}Tarım sistemi başlatılıyor…${NC}"
echo "  kök: $ROOT"

# ─── 1) Docker altyapı ───────────────────────────────────────────────
echo ""
echo "[1/5] Docker altyapı (Redis, MinIO, AI Postgres)"

if ! command -v docker >/dev/null 2>&1; then
  fail "docker yok — Redis/MinIO/Postgres elle çalışmalı"
else
  (
    cd "$ROOT"
    docker compose up -d redis minio minio-setup 2>/dev/null \
      || docker compose up -d redis minio 2>/dev/null \
      || true
  )
  (
    cd "$ROOT/tarim_ai"
    docker compose up -d 2>/dev/null || true
  )
  # Eski isimler / zaten ayakta
  docker start agriculture-redis agriculture-minio tarim-ai-postgres 2>/dev/null || true
  ok "docker servisleri istendi"
fi

# SQL Server (AMS) — compose veya mevcut container
if port_listening 1433; then
  ok "SQL Server :1433 dinliyor"
else
  docker start agriculture-sql personel-sql 2>/dev/null || true
  sleep 2
  if port_listening 1433; then
    ok "SQL Server :1433 açıldı"
  else
    warn "SQL Server :1433 yok — AMS login/DB hata verebilir"
  fi
fi

# ─── 2) AMS Backend :5109 ────────────────────────────────────────────
echo ""
echo "[2/5] AMS Backend :5109"
if port_listening 5109; then
  ok "Backend zaten çalışıyor :5109"
else
  start_bg "Backend" "$RUN_DIR/backend.pid" "$LOG_DIR/backend.log" \
    "cd \"$ROOT\" && dotnet run --project src/Hosts/Agriculture.Api/Agriculture.Api.csproj --launch-profile http --environment Development"
fi

# ─── 3) Tarım AI :4000 ───────────────────────────────────────────────
echo ""
echo "[3/5] Tarım AI :4000"
if port_listening 4000; then
  ok "Tarım AI zaten çalışıyor :4000"
else
  start_bg "Tarım AI" "$RUN_DIR/tarim-ai.pid" "$LOG_DIR/tarim-ai.log" \
    "cd \"$ROOT/tarim_ai\" && npm run dev"
fi

# ─── 4) Frontend :5173 ───────────────────────────────────────────────
echo ""
echo "[4/5] Frontend :5173"
if port_listening 5173; then
  ok "Frontend zaten çalışıyor :5173"
else
  start_bg "Frontend" "$RUN_DIR/frontend.pid" "$LOG_DIR/frontend.log" \
    "cd \"$ROOT/frontend\" && npm run dev -- --host 127.0.0.1 --port 5173"
fi

# ─── 5) Sağlık ───────────────────────────────────────────────────────
echo ""
echo "[5/5] Sağlık kontrolleri"
wait_http "http://127.0.0.1:5109/swagger/index.html" "AMS" 60 || wait_http "http://127.0.0.1:5109/health" "AMS" 10 || true
wait_http "http://127.0.0.1:4000/health" "Tarım AI" 45 || true
wait_http "http://127.0.0.1:5173/" "Frontend" 30 || true
if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:9000/minio/health/live"; then
  ok "MinIO :9000"
else
  warn "MinIO yanıt vermiyor (drone CDN etkilenebilir)"
fi

echo ""
echo "===== TARIM SİSTEMİ HAZIR ====="
echo "  Panel     → http://127.0.0.1:5173/login"
echo "  Uygulama  → http://127.0.0.1:5173/app"
echo "  AMS API   → http://127.0.0.1:5109"
echo "  Tarım AI  → http://127.0.0.1:4000"
echo "  MinIO     → http://127.0.0.1:9001"
echo "  Loglar    → $LOG_DIR"
echo "  Durdur    → npm stop  |  ./stop-all.sh"
echo "==============================="
