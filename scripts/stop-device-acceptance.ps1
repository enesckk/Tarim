param(
    [string]$ComposeFile = "deployment/compose/docker-compose.staging.yml",
    [string]$EnvFile = "deployment/compose/.env.staging",
    [string]$DockerExe = "docker"
)

$ErrorActionPreference = "Stop"
& $DockerExe compose -p agriculture-staging --env-file $EnvFile -f $ComposeFile --profile device-acceptance stop device-tunnel
if ($LASTEXITCODE -ne 0) { throw "Cihaz tüneli durdurulamadı." }
Write-Host "Cihaz kabul HTTPS tüneli durduruldu."
