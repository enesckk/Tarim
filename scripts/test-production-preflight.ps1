param(
    [string]$ComposeFile = "deployment/compose/docker-compose.production.yml",
    [string]$EnvFile = "deployment/compose/.env.production",
    [string]$DockerExe = "docker"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ComposeFile)) { throw "Production Compose file not found: $ComposeFile" }
if (-not (Test-Path -LiteralPath $EnvFile)) { throw "Production environment file not found: $EnvFile" }

$settings = @{}
foreach ($line in Get-Content -LiteralPath $EnvFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    $separator = $trimmed.IndexOf('=')
    if ($separator -lt 1) { throw "Invalid environment line (key only is shown): $($trimmed.Split('=')[0])" }
    $settings[$trimmed.Substring(0, $separator)] = $trimmed.Substring($separator + 1)
}

$required = @(
    'PRODUCTION_HOST', 'SQLSERVER_IMAGE', 'POSTGRES_IMAGE', 'MINIO_IMAGE', 'MINIO_MC_IMAGE',
    'REDIS_IMAGE', 'SEQ_IMAGE', 'API_MIGRATION_IMAGE', 'API_IMAGE',
    'TARIM_AI_MIGRATION_IMAGE', 'TARIM_AI_IMAGE', 'FRONTEND_IMAGE',
    'MSSQL_SA_PASSWORD', 'POSTGRES_PASSWORD', 'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD',
    'JWT_SECRET', 'TARIM_AI_INTEGRATION_KEY', 'SEQ_ADMIN_PASSWORD',
    'WEB_PUSH_SUBJECT', 'WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY'
)

foreach ($key in $required) {
    if (-not $settings.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($settings[$key])) {
        throw "Required production setting is missing: $key"
    }
    if ($settings[$key] -match 'CHANGE_ME') { throw "Production setting still contains a placeholder: $key" }
}

if ($settings['PRODUCTION_HOST'] -match '[:/]') {
    throw 'PRODUCTION_HOST must be a hostname only, without scheme, port, or path.'
}

$imageKeys = $required | Where-Object { $_ -like '*_IMAGE' }
foreach ($key in $imageKeys) {
    if ($settings[$key] -notmatch '@sha256:[0-9a-fA-F]{64}$') {
        throw "$key must end with an immutable @sha256 digest."
    }
}

foreach ($key in @('MSSQL_SA_PASSWORD', 'POSTGRES_PASSWORD', 'MINIO_ROOT_PASSWORD', 'SEQ_ADMIN_PASSWORD')) {
    if ($settings[$key].Length -lt 32) { throw "$key must contain at least 32 characters." }
}
foreach ($key in @('JWT_SECRET', 'TARIM_AI_INTEGRATION_KEY')) {
    if ($settings[$key].Length -lt 64) { throw "$key must contain at least 64 characters." }
}
if ($settings['JWT_SECRET'] -eq $settings['TARIM_AI_INTEGRATION_KEY']) {
    throw 'JWT_SECRET and TARIM_AI_INTEGRATION_KEY must be different.'
}

if ($settings['BOOTSTRAP_ADMIN_ENABLED'] -eq 'true') {
    if ($settings['BOOTSTRAP_ADMIN_EMAIL'] -notmatch '@' -or
        $settings['BOOTSTRAP_ADMIN_EMAIL'] -match '@agriculture\.local$' -or
        $settings['BOOTSTRAP_ADMIN_PASSWORD'].Length -lt 14 -or
        $settings['BOOTSTRAP_ADMIN_PASSWORD'] -match 'CHANGE_ME') {
        throw 'Bootstrap administrator settings are incomplete or unsafe.'
    }
}

& $DockerExe compose --env-file $EnvFile -f $ComposeFile config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Production Compose configuration is invalid.' }

Write-Host 'Production preflight passed: secrets, immutable images, host and Compose structure are valid.'
