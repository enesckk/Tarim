param(
    [string]$BaseUrl = "http://127.0.0.1:8080",
    [string]$SeqUrl = "http://127.0.0.1:5341",
    [string]$ComposeFile = "deployment/compose/docker-compose.staging.yml",
    [string]$EnvFile = "deployment/compose/.env.staging",
    [string]$DockerExe = "docker",
    [int]$RecentLogMinutes = 5,
    [int]$MaximumRestartCount = 0,
    [string]$OutputDirectory = "backups/staging-observability"
)

$ErrorActionPreference = "Stop"
$startedAt = [DateTimeOffset]::UtcNow
$failures = [System.Collections.Generic.List[string]]::new()

if (-not (Get-Command $DockerExe -ErrorAction SilentlyContinue)) { throw "Docker CLI bulunamadı: $DockerExe" }
if (-not (Test-Path $EnvFile)) { throw "$EnvFile bulunamadı." }
if (Select-String -Path $EnvFile -Pattern "CHANGE_ME" -Quiet) { throw "$EnvFile hâlâ CHANGE_ME değeri içeriyor." }

$composeArgs = @("compose", "--env-file", $EnvFile, "-f", $ComposeFile)
$serviceNames = @(& $DockerExe @composeArgs config --services)
if ($LASTEXITCODE -ne 0) { throw "Compose servis listesi okunamadı." }
& $DockerExe info --format '{{.ServerVersion}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker daemon erişilemiyor. Docker Desktop/Engine çalıştırılmalı." }

$oneShotServices = @("minio-setup", "tarim-ai-migrate", "api-migrate", "device-tunnel")
$expectedServices = @($serviceNames | Where-Object { $_ -notin $oneShotServices })
$containers = @()

foreach ($service in $expectedServices) {
    $containerIdOutput = & $DockerExe @composeArgs ps -q $service
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon servis durumu okunurken erişilemez oldu." }
    $containerId = [string]$containerIdOutput
    if ([string]::IsNullOrWhiteSpace($containerId)) {
        $failures.Add("$service container çalışmıyor")
        continue
    }
    $inspectionJson = & $DockerExe inspect $containerId
    if ($LASTEXITCODE -ne 0) { $failures.Add("$service inspect başarısız"); continue }
    $inspection = ($inspectionJson | ConvertFrom-Json)[0]
    $health = if ($null -ne $inspection.State.Health) { [string]$inspection.State.Health.Status } else { "not-configured" }
    $restartCount = [int]$inspection.RestartCount
    $running = [bool]$inspection.State.Running
    if (-not $running) { $failures.Add("$service running=false") }
    if ($health -notin @("healthy", "not-configured")) { $failures.Add("$service health=$health") }
    if ($restartCount -gt $MaximumRestartCount) { $failures.Add("$service restartCount=$restartCount sınır=$MaximumRestartCount") }
    $containers += [ordered]@{ service = $service; running = $running; health = $health; restartCount = $restartCount }
}

$endpointDefinitions = @(
    @{ name = "frontend"; url = "$BaseUrl/healthz" },
    @{ name = "api-live"; url = "$BaseUrl/health/live" },
    @{ name = "api-ready"; url = "$BaseUrl/health/ready" },
    @{ name = "tarim-ai"; url = "$BaseUrl/tarim-ai-api/health" },
    @{ name = "seq"; url = "$SeqUrl/health" }
)
$endpoints = @()
foreach ($definition in $endpointDefinitions) {
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest -Uri $definition.url -UseBasicParsing -TimeoutSec 15
        $watch.Stop()
        $statusCode = [int]$response.StatusCode
        if ($statusCode -ne 200) { $failures.Add("$($definition.name) HTTP $statusCode") }
        $endpoints += [ordered]@{ name = $definition.name; url = $definition.url; statusCode = $statusCode; latencyMs = $watch.ElapsedMilliseconds }
    } catch {
        $watch.Stop()
        $failures.Add("$($definition.name) erişilemedi: $($_.Exception.Message)")
        $endpoints += [ordered]@{ name = $definition.name; url = $definition.url; statusCode = $null; latencyMs = $watch.ElapsedMilliseconds }
    }
}

$since = "${RecentLogMinutes}m"
$fatalPattern = '(?i)\b(fatal|unhandled exception|uncaught exception|out of memory|stack overflow)\b'
$logAlerts = @()
foreach ($service in $expectedServices) {
    $recentLogs = @(& $DockerExe @composeArgs logs --no-color --since $since $service 2>&1)
    $matches = @($recentLogs | Select-String -Pattern $fatalPattern)
    if ($matches.Count -gt 0) {
        $failures.Add("$service son ${RecentLogMinutes} dakikada $($matches.Count) kritik log")
        $logAlerts += [ordered]@{ service = $service; matchCount = $matches.Count }
    }
}

$report = [ordered]@{
    schemaVersion = 1
    startedAtUtc = $startedAt.ToString("O")
    completedAtUtc = [DateTimeOffset]::UtcNow.ToString("O")
    passed = ($failures.Count -eq 0)
    thresholds = [ordered]@{ recentLogMinutes = $RecentLogMinutes; maximumRestartCount = $MaximumRestartCount }
    containers = $containers
    endpoints = $endpoints
    logAlerts = $logAlerts
    failures = @($failures)
}

$stamp = $startedAt.ToString("yyyyMMdd-HHmmss")
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$reportPath = Join-Path $OutputDirectory "$stamp.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $reportPath -Encoding utf8
if ($failures.Count -gt 0) { Write-Error "4A-3 kontrolü başarısız. Rapor: $reportPath`n$($failures -join [Environment]::NewLine)" }
Write-Host "4A-3 gözlemlenebilirlik kontrolü geçti. Rapor: $reportPath"
