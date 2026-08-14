param(
    [string]$BaseUrl = "http://127.0.0.1:8080",
    [string]$ComposeFile = "deployment/compose/docker-compose.staging.yml",
    [string]$EnvFile = "deployment/compose/.env.staging"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI bulunamadı. Docker Desktop/Engine kurup PATH'e ekleyin."
}
if (-not (Test-Path $EnvFile)) {
    throw "$EnvFile bulunamadı. .env.staging.example dosyasını kopyalayıp CHANGE_ME değerlerini değiştirin."
}
if (Select-String -Path $EnvFile -Pattern "CHANGE_ME" -Quiet) {
    throw "$EnvFile hâlâ CHANGE_ME değeri içeriyor."
}

docker compose --env-file $EnvFile -f $ComposeFile config --quiet
if ($LASTEXITCODE -ne 0) { throw "Compose yapılandırması geçersiz." }

docker compose --env-file $EnvFile -f $ComposeFile up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw "Staging servisleri sağlıklı duruma gelemedi." }

# Docker can recreate the API while leaving Nginx alive with the old container IP.
# Restart the proxy after convergence so its upstream DNS entry is refreshed.
docker compose --env-file $EnvFile -f $ComposeFile restart frontend
if ($LASTEXITCODE -ne 0) { throw "Frontend proxy restart failed." }

$checks = @(
    @{ Name = "frontend"; Url = "$BaseUrl/healthz" },
    @{ Name = "api-live"; Url = "$BaseUrl/health/live" },
    @{ Name = "api-ready"; Url = "$BaseUrl/health/ready" },
    @{ Name = "pwa-manifest"; Url = "$BaseUrl/manifest.webmanifest" },
    @{ Name = "service-worker"; Url = "$BaseUrl/sw.js" },
    @{ Name = "tarim-ai"; Url = "$BaseUrl/tarim-ai-api/health" }
)

foreach ($check in $checks) {
    $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -ne 200) {
        throw "$($check.Name) başarısız: HTTP $($response.StatusCode)"
    }
    Write-Host "OK $($check.Name)"
}

docker compose --env-file $EnvFile -f $ComposeFile ps
Write-Host "Staging smoke kontrolleri başarılı."
