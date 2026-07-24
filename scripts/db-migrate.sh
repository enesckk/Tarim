#!/usr/bin/env bash
# Apply EF migrations (Identity + Agriculture). Use for Staging/Production migrator job.
# Dev normally migrates on API startup (Database:ApplyMigrationsOnStartup=true).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PROJ="$ROOT/src/Hosts/Agriculture.Api/Agriculture.Api.csproj"
INFRA="$ROOT/src/BuildingBlocks/Agriculture.Infrastructure"
IDENTITY="$ROOT/src/Modules/Identity/Agriculture.Modules.Identity.Infrastructure"

: "${ConnectionStrings__DefaultConnection:?Set ConnectionStrings__DefaultConnection}"

echo "Migrating Identity..."
dotnet ef database update \
  --project "$IDENTITY" \
  --startup-project "$API_PROJ" \
  --context IdentityDbContext

echo "Migrating Agriculture..."
dotnet ef database update \
  --project "$INFRA" \
  --startup-project "$API_PROJ" \
  --context AgricultureDbContext

echo "Migrations applied."
