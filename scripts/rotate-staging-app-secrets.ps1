param(
    [string]$EnvFile = "deployment/compose/.env.staging"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw "Staging env dosyası bulunamadı: $EnvFile"
}

function New-RandomSecret {
    param([int]$ByteCount = 64)
    $bytes = New-Object byte[] $ByteCount
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$replacements = @{
    JWT_SECRET = New-RandomSecret
    TARIM_AI_INTEGRATION_KEY = New-RandomSecret
}

$seen = @{}
$lines = Get-Content -LiteralPath $EnvFile -Encoding utf8
$updated = foreach ($line in $lines) {
    if ($line -match '^([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        if ($replacements.ContainsKey($name)) {
            $seen[$name] = $true
            "$name=$($replacements[$name])"
            continue
        }
    }
    $line
}

$missing = @($replacements.Keys | Where-Object { -not $seen.ContainsKey($_) })
if ($missing.Count -gt 0) {
    throw "Eksik staging değişkenleri: $($missing -join ', ')"
}

[System.IO.File]::WriteAllLines(
    (Resolve-Path -LiteralPath $EnvFile),
    $updated,
    [System.Text.UTF8Encoding]::new($false))

Write-Host "JWT ve Tarım AI entegrasyon anahtarları güvenli biçimde yenilendi; değerler ekrana yazdırılmadı."
