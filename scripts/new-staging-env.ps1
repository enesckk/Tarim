param(
    [string]$OutputPath = "deployment/compose/.env.staging",
    [string]$DockerExe = "docker"
)

$ErrorActionPreference = "Stop"

if (Test-Path $OutputPath) {
    throw "$OutputPath zaten var. Mevcut sırları yanlışlıkla değiştirmemek için dosya üzerine yazılmadı."
}

if (-not (Get-Command $DockerExe -ErrorAction SilentlyContinue)) {
    throw "Docker CLI bulunamadı: $DockerExe"
}

function New-Base64Url([int]$ByteCount) {
    $bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes($ByteCount)
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Get-ContainerEnvironment([string]$ContainerName) {
    $raw = & $DockerExe inspect --format '{{range .Config.Env}}{{println .}}{{end}}' $ContainerName 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    $result = @{}
    foreach ($entry in $raw) {
        $separator = $entry.IndexOf('=')
        if ($separator -gt 0) {
            $result[$entry.Substring(0, $separator)] = $entry.Substring($separator + 1)
        }
    }
    return $result
}

$vapidScript = @'
const { generateKeyPairSync } = require('node:crypto');
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });
const decode = value => Buffer.from(value, 'base64url');
const uncompressed = Buffer.concat([Buffer.from([4]), decode(pub.x), decode(pub.y)]);
process.stdout.write(JSON.stringify({ publicKey: uncompressed.toString('base64url'), privateKey: priv.d }));
'@

$vapidJson = & $DockerExe run --rm agriculture-staging-tarim-ai node -e $vapidScript
if ($LASTEXITCODE -ne 0) { throw "VAPID anahtarları üretilemedi." }
$vapid = $vapidJson | ConvertFrom-Json

$sqlEnv = Get-ContainerEnvironment "agriculture-staging-sqlserver-1"
$postgresEnv = Get-ContainerEnvironment "agriculture-staging-postgres-1"
$minioEnv = Get-ContainerEnvironment "agriculture-staging-minio-1"
$apiEnv = Get-ContainerEnvironment "agriculture-staging-tarim-api-1"
$reuseRunning = $null -ne $sqlEnv -and $null -ne $postgresEnv -and $null -ne $minioEnv -and $null -ne $apiEnv

if ($reuseRunning) {
    $stagingHost = ($apiEnv['Cors__Origins__0'] -replace '^https://', '')
    $mssqlPassword = $sqlEnv['MSSQL_SA_PASSWORD']
    $minioUser = $minioEnv['MINIO_ROOT_USER']
    $minioPassword = $minioEnv['MINIO_ROOT_PASSWORD']
    $postgresPassword = $postgresEnv['POSTGRES_PASSWORD']
    $jwtSecret = $apiEnv['Jwt__Secret']
    $integrationKey = $apiEnv['TarimAi__IntegrationApiKey']
    $seqPassword = New-Base64Url 32
    $webPushSubject = $apiEnv['WebPush__Subject']
} else {
    $stagingHost = "localhost"
    $mssqlPassword = "Aa1!$(New-Base64Url 30)"
    $minioUser = "stageadmin_$(New-Base64Url 9)"
    $minioPassword = "Aa1!$(New-Base64Url 30)"
    $postgresPassword = New-Base64Url 32
    $jwtSecret = New-Base64Url 48
    $integrationKey = New-Base64Url 48
    $seqPassword = New-Base64Url 32
    $webPushSubject = "mailto:admin@localhost"
}

$lines = @(
    "STAGING_HOST=$stagingHost",
    "MSSQL_SA_PASSWORD=$mssqlPassword",
    "MINIO_ROOT_USER=$minioUser",
    "MINIO_ROOT_PASSWORD=$minioPassword",
    "POSTGRES_PASSWORD=$postgresPassword",
    "JWT_SECRET=$jwtSecret",
    "TARIM_AI_INTEGRATION_KEY=$integrationKey",
    "SEQ_ADMIN_PASSWORD=$seqPassword",
    "WEB_PUSH_SUBJECT=$webPushSubject",
    "WEB_PUSH_PUBLIC_KEY=$($vapid.publicKey)",
    "WEB_PUSH_PRIVATE_KEY=$($vapid.privateKey)"
)

$directory = Split-Path -Parent $OutputPath
if ($directory) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
[System.IO.File]::WriteAllLines((Join-Path (Get-Location) $OutputPath), $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "$OutputPath oluşturuldu. Anahtar değerleri güvenlik nedeniyle ekrana yazdırılmadı."
if ($reuseRunning) { Write-Host "Çalışan staging veri birimlerinin mevcut kimlik bilgileri korundu." }
