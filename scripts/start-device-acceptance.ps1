param(
    [string]$ComposeFile = "deployment/compose/docker-compose.staging.yml",
    [string]$EnvFile = "deployment/compose/.env.staging",
    [string]$DockerExe = "docker"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $EnvFile)) {
    throw "$EnvFile bulunamadı. Önce scripts/new-staging-env.ps1 çalıştırın."
}

& $DockerExe compose -p agriculture-staging --env-file $EnvFile -f $ComposeFile up -d --no-build --wait
if ($LASTEXITCODE -ne 0) { throw "Staging servisleri sağlıklı duruma gelemedi." }

# Synthetic acceptance personas are seeded explicitly and idempotently. The
# long-running staging API remains in Staging mode with automatic seeding off.
$seedName = "agriculture-staging-device-seed"
& $DockerExe rm -f $seedName 2>$null | Out-Null
& $DockerExe compose -p agriculture-staging --env-file $EnvFile -f $ComposeFile run -d --no-deps --name $seedName `
    -e ASPNETCORE_ENVIRONMENT=Development `
    -e Database__ApplyMigrationsOnStartup=false `
    -e Database__SeedDemoData=true `
    -e Database__SeedVerifiedParcelData=true `
    tarim-api | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Cihaz kabul verisi başlatılamadı." }

$seedReady = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    & $DockerExe exec $seedName curl --fail --silent http://127.0.0.1:8080/health/live 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $seedReady = $true; break }
    Start-Sleep -Seconds 1
}
& $DockerExe rm -f $seedName | Out-Null
if (-not $seedReady) { throw "Cihaz kabul verisi zamanında tamamlanamadı." }

& $DockerExe compose -p agriculture-staging --env-file $EnvFile -f $ComposeFile --profile device-acceptance up -d device-tunnel
if ($LASTEXITCODE -ne 0) { throw "HTTPS cihaz tüneli başlatılamadı." }

$deviceUrl = $null
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $logs = & $DockerExe compose -p agriculture-staging --env-file $EnvFile -f $ComposeFile logs --no-color device-tunnel
    $match = [regex]::Match(($logs -join "`n"), 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) { $deviceUrl = $match.Value; break }
    Start-Sleep -Seconds 1
}
if (-not $deviceUrl) { throw "HTTPS cihaz URL'si alınamadı." }

Write-Host "Cihaz kabul URL'si: $deviceUrl"
Write-Host "Bu adres tünel çalıştığı sürece internete açıktır. Test bitince scripts/stop-device-acceptance.ps1 çalıştırın."
