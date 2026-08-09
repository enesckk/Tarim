#!/bin/bash
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${GREEN}Tarim Sistemi Baslatiliyor...${NC}"

# Redis
if docker ps --format '{{.Names}}' | grep -q '^agriculture-redis$'; then
  echo -e "  [1/4] Redis zaten calisiyor"
else
  docker run -d --name agriculture-redis -p 6379:6379 redis:alpine 2>/dev/null || docker start agriculture-redis 2>/dev/null || true
  sleep 1; echo -e "  [1/4] Redis basladi :6379"
fi

# Backend
if lsof -i :5109 -sTCP:LISTEN -n -P 2>/dev/null | grep -q LISTEN; then
  echo -e "  [2/4] Backend zaten calisiyor :5109"
else
  cd "$SCRIPT_DIR"
  dotnet run --project src/Hosts/Agriculture.Api/Agriculture.Api.csproj --environment Development > /tmp/tarim-backend.log 2>&1 &
  echo $! > /tmp/tarim-backend.pid; sleep 6
  echo -e "  [2/4] Backend basladi -> http://localhost:5109"
fi

# AI
if lsof -i :4000 -sTCP:LISTEN -n -P 2>/dev/null | grep -q LISTEN; then
  echo -e "  [3/4] Tarim AI zaten calisiyor :4000"
else
  cd "$SCRIPT_DIR/tarim_ai"
  npm run dev > /tmp/tarim-ai.log 2>&1 &
  echo $! > /tmp/tarim-ai.pid; sleep 3
  echo -e "  [3/4] Tarim AI basladi -> http://localhost:4000"
fi

# Frontend
if lsof -i :5173 -sTCP:LISTEN -n -P 2>/dev/null | grep -q LISTEN; then
  echo -e "  [4/4] Frontend zaten calisiyor :5173"
else
  cd "$SCRIPT_DIR/frontend"
  npm run dev > /tmp/tarim-frontend.log 2>&1 &
  echo $! > /tmp/tarim-frontend.pid; sleep 3
  echo -e "  [4/4] Frontend basladi -> http://localhost:5173"
fi

echo ""
echo "===== TARIM SISTEMI HAZIR ====="
echo "  Ana Site  -> http://localhost:5173"
echo "  Giris     -> http://localhost:5173/login"
echo "  Sistem    -> http://localhost:5173/app"
echo "  API       -> http://localhost:5109"
echo "  Swagger   -> http://localhost:5109/swagger"
echo "  Tarim AI  -> http://localhost:4000"
echo "  MinIO     -> http://localhost:9001"
echo "==============================="
