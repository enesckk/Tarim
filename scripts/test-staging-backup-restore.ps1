param(
    [string]$DockerExe = "docker",
    [string]$EnvFile = "deployment/compose/.env.staging",
    [string]$BackupRoot = "backups/staging",
    [string]$SqlContainer = "agriculture-staging-sqlserver-1",
    [string]$PostgresContainer = "agriculture-staging-postgres-1",
    [string]$MinioContainer = "agriculture-staging-minio-1"
)

$ErrorActionPreference = "Stop"

function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & $DockerExe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker komutu başarısız oldu; hassas argümanlar güvenlik nedeniyle gösterilmedi."
    }
}

function New-RandomSecret {
    $bytes = New-Object byte[] 48
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw "Staging env dosyası bulunamadı: $EnvFile"
}

$workspace = (Resolve-Path -LiteralPath ".").Path.TrimEnd('\')
$backupRootFull = [System.IO.Path]::GetFullPath((Join-Path $workspace $BackupRoot))
$allowedRoot = [System.IO.Path]::GetFullPath((Join-Path $workspace "backups"))
if (-not $backupRootFull.StartsWith($allowedRoot + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "BackupRoot çalışma alanındaki backups/ dizini altında olmalıdır."
}

$settings = @{}
Get-Content -LiteralPath $EnvFile -Encoding utf8 | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $settings[$matches[1].Trim()] = $matches[2].Trim()
    }
}
foreach ($required in @("MSSQL_SA_PASSWORD", "POSTGRES_PASSWORD", "MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD")) {
    if ([string]::IsNullOrWhiteSpace($settings[$required])) {
        throw "$required staging env dosyasında eksik."
    }
}

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$artifactDir = Join-Path $backupRootFull $stamp
$minioMirror = Join-Path $artifactDir "minio/tarim-uploads"
New-Item -ItemType Directory -Path $minioMirror -Force | Out-Null

$sqlBackupName = "AgricultureDb-$stamp.bak"
$sqlContainerPath = "/var/opt/mssql/backup/$sqlBackupName"
$sqlHostPath = Join-Path $artifactDir $sqlBackupName
$restoreDatabase = "AgricultureRestore_$($stamp.Replace('-', '_'))"
$postgresBackupName = "tarim-ai-$stamp.dump"
$postgresContainerPath = "/tmp/$postgresBackupName"
$postgresHostPath = Join-Path $artifactDir $postgresBackupName
$postgresRestoreDatabase = "tarim_ai_restore_$($stamp.Replace('-', '_'))"
$restoreContainer = "agriculture-minio-restore-$($stamp.ToLowerInvariant())"
$canaryKey = "backup-canary/$stamp.bin"
$canaryPath = Join-Path $artifactDir "canary.bin"
$restoredCanaryPath = Join-Path $artifactDir "restored-canary.bin"
$objectListPath = Join-Path $artifactDir "restored-objects.jsonl"
$restoreStarted = $false
$sourceCanaryUploaded = $false
$dataNetwork = $null

$canaryBytes = New-Object byte[] 4096
$canaryGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $canaryGenerator.GetBytes($canaryBytes) } finally { $canaryGenerator.Dispose() }
[System.IO.File]::WriteAllBytes($canaryPath, $canaryBytes)

try {
    $saPassword = $settings["MSSQL_SA_PASSWORD"]
    $env:SQLCMDPASSWORD = $saPassword
    $backupQuery = "BACKUP DATABASE [AgricultureDb] TO DISK=N'$sqlContainerPath' WITH COPY_ONLY, INIT, CHECKSUM, COMPRESSION, STATS=10"
    Invoke-Docker -Arguments @("exec", "-e", "SQLCMDPASSWORD", $SqlContainer, "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-C", "-b", "-Q", $backupQuery)

    $verifyQuery = "RESTORE VERIFYONLY FROM DISK=N'$sqlContainerPath' WITH CHECKSUM"
    Invoke-Docker -Arguments @("exec", "-e", "SQLCMDPASSWORD", $SqlContainer, "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-C", "-b", "-Q", $verifyQuery)
    Invoke-Docker -Arguments @("cp", "${SqlContainer}:$sqlContainerPath", $sqlHostPath)

    $dataLogicalQuery = "SET NOCOUNT ON; SELECT TOP (1) name FROM sys.master_files WHERE database_id=DB_ID('AgricultureDb') AND type=0 ORDER BY file_id"
    $dataLogicalOutput = @(& $DockerExe exec -e SQLCMDPASSWORD $SqlContainer /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -h -1 -W -Q $dataLogicalQuery)
    if ($LASTEXITCODE -ne 0) { throw "SQL data logical file adı okunamadı." }
    $dataLogical = (($dataLogicalOutput | Where-Object { $_.Trim() } | Select-Object -First 1) -as [string]).Trim()
    $logLogicalQuery = "SET NOCOUNT ON; SELECT TOP (1) name FROM sys.master_files WHERE database_id=DB_ID('AgricultureDb') AND type=1 ORDER BY file_id"
    $logLogicalOutput = @(& $DockerExe exec -e SQLCMDPASSWORD $SqlContainer /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -h -1 -W -Q $logLogicalQuery)
    if ($LASTEXITCODE -ne 0) { throw "SQL log logical file adı okunamadı." }
    $logLogical = (($logLogicalOutput | Where-Object { $_.Trim() } | Select-Object -First 1) -as [string]).Trim()
    if ([string]::IsNullOrWhiteSpace($dataLogical) -or [string]::IsNullOrWhiteSpace($logLogical)) {
        throw "SQL data/log logical file adları ayrıştırılamadı."
    }

    $restoreQuery = "RESTORE DATABASE [$restoreDatabase] FROM DISK=N'$sqlContainerPath' WITH MOVE N'$dataLogical' TO N'/var/opt/mssql/data/$restoreDatabase.mdf', MOVE N'$logLogical' TO N'/var/opt/mssql/data/${restoreDatabase}_log.ldf', RECOVERY; DBCC CHECKDB ([$restoreDatabase]) WITH NO_INFOMSGS, ALL_ERRORMSGS; IF NOT EXISTS (SELECT 1 FROM [$restoreDatabase].sys.tables WHERE is_ms_shipped=0) THROW 51000, 'Restored database has no user tables.', 1; SELECT COUNT_BIG(*) AS UserTables FROM [$restoreDatabase].sys.tables WHERE is_ms_shipped=0;"
    Invoke-Docker -Arguments @("exec", "-e", "SQLCMDPASSWORD", $SqlContainer, "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-C", "-b", "-Q", $restoreQuery)

    $env:PGPASSWORD = $settings["POSTGRES_PASSWORD"]
    Invoke-Docker -Arguments @("exec", "-e", "PGPASSWORD", $PostgresContainer,
        "pg_dump", "-U", "tarim", "-d", "tarim_ai", "-Fc", "--no-owner", "--no-privileges", "-f", $postgresContainerPath)
    Invoke-Docker -Arguments @("exec", "-e", "PGPASSWORD", $PostgresContainer,
        "pg_restore", "--list", $postgresContainerPath) | Out-Null
    Invoke-Docker -Arguments @("cp", "${PostgresContainer}:$postgresContainerPath", $postgresHostPath)
    Invoke-Docker -Arguments @("exec", "-e", "PGPASSWORD", $PostgresContainer,
        "psql", "-U", "tarim", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "CREATE DATABASE $postgresRestoreDatabase OWNER tarim")
    Invoke-Docker -Arguments @("exec", "-e", "PGPASSWORD", $PostgresContainer,
        "pg_restore", "-U", "tarim", "-d", $postgresRestoreDatabase, "--no-owner", "--no-privileges", $postgresContainerPath)
    $postgresCountOutput = @(& $DockerExe exec -e PGPASSWORD $PostgresContainer psql -U tarim -d $postgresRestoreDatabase -At -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL restore tablo sayımı başarısız." }
    $postgresTableCount = [int](($postgresCountOutput | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1))
    if ($postgresTableCount -lt 1) { throw "PostgreSQL restore hedefinde kullanıcı tablosu yok." }

    $networkJson = Invoke-Docker -Arguments @("inspect", $MinioContainer, "--format", "{{json .NetworkSettings.Networks}}")
    $networkNames = @((ConvertFrom-Json $networkJson).PSObject.Properties.Name)
    $dataNetwork = $networkNames | Where-Object { $_ -like "*_data" } | Select-Object -First 1
    if (-not $dataNetwork) { throw "MinIO data ağı bulunamadı." }

    $env:SOURCE_USER = $settings["MINIO_ROOT_USER"]
    $env:SOURCE_PASSWORD = $settings["MINIO_ROOT_PASSWORD"]
    $env:MINIO_ROOT_USER = "restore-admin"
    $env:MINIO_ROOT_PASSWORD = New-RandomSecret
    $env:RESTORE_USER = $env:MINIO_ROOT_USER
    $env:RESTORE_PASSWORD = $env:MINIO_ROOT_PASSWORD
    $env:RESTORE_HOST = $restoreContainer
    $env:BACKUP_STAMP = $stamp

    Invoke-Docker -Arguments @(
        "run", "-d", "--rm", "--name", $restoreContainer, "--network", $dataNetwork,
        "-e", "MINIO_ROOT_USER", "-e", "MINIO_ROOT_PASSWORD",
        "minio/minio:latest", "server", "/data")
    $restoreStarted = $true

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        & $DockerExe exec $restoreContainer mc ready local 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw "İzole MinIO restore hedefi hazır olmadı." }

    $mount = "type=bind,source=$artifactDir,target=/backup"
    $mcScript = @'
set -eu
mc alias set source http://minio:9000 "$SOURCE_USER" "$SOURCE_PASSWORD" >/dev/null
mc alias set restored "http://$RESTORE_HOST:9000" "$RESTORE_USER" "$RESTORE_PASSWORD" >/dev/null
mc cp /backup/canary.bin "source/tarim-uploads/backup-canary/$BACKUP_STAMP.bin" >/dev/null
mc mirror --overwrite source/tarim-uploads /backup/minio/tarim-uploads
mc mb restored/tarim-uploads >/dev/null
mc anonymous set none restored/tarim-uploads >/dev/null
mc mirror --overwrite /backup/minio/tarim-uploads restored/tarim-uploads
mc cp "restored/tarim-uploads/backup-canary/$BACKUP_STAMP.bin" /backup/restored-canary.bin >/dev/null
mc ls --recursive --json restored/tarim-uploads > /backup/restored-objects.jsonl
mc rm "source/tarim-uploads/backup-canary/$BACKUP_STAMP.bin" >/dev/null
'@
    $sourceCanaryUploaded = $true
    Invoke-Docker -Arguments @(
        "run", "--rm", "--network", $dataNetwork, "--mount", $mount,
        "-e", "SOURCE_USER", "-e", "SOURCE_PASSWORD", "-e", "RESTORE_USER", "-e", "RESTORE_PASSWORD",
        "-e", "RESTORE_HOST", "-e", "BACKUP_STAMP",
        "--entrypoint", "/bin/sh", "minio/mc:latest", "-c", $mcScript)

    $sourceCanaryHash = (Get-FileHash -LiteralPath $canaryPath -Algorithm SHA256).Hash
    $restoredCanaryHash = (Get-FileHash -LiteralPath $restoredCanaryPath -Algorithm SHA256).Hash
    if ($sourceCanaryHash -ne $restoredCanaryHash) {
        throw "MinIO restore canary SHA-256 eşleşmedi."
    }

    $objectCount = @(Get-Content -LiteralPath $objectListPath -Encoding utf8 | Where-Object { $_.Trim() }).Count
    if ($objectCount -lt 1) { throw "İzole MinIO restore hedefinde nesne bulunamadı." }

    $sqlHash = (Get-FileHash -LiteralPath $sqlHostPath -Algorithm SHA256).Hash
    $postgresHash = (Get-FileHash -LiteralPath $postgresHostPath -Algorithm SHA256).Hash
    $manifest = [ordered]@{
        createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
        database = "AgricultureDb"
        sqlBackupFile = $sqlBackupName
        sqlBackupSha256 = $sqlHash
        sqlVerifyOnly = "passed"
        sqlIsolatedRestore = "passed"
        sqlDbccCheckDb = "passed"
        postgresBackupFile = $postgresBackupName
        postgresBackupSha256 = $postgresHash
        postgresArchiveList = "passed"
        postgresIsolatedRestore = "passed"
        postgresRestoredTableCount = $postgresTableCount
        minioBucket = "tarim-uploads"
        minioRestoredObjectCount = $objectCount
        minioCanarySha256 = $sourceCanaryHash
        minioIsolatedRestore = "passed"
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $artifactDir "manifest.json") -Encoding utf8

    Write-Host "BACKUP_RESTORE_OK SQL_VERIFY=passed SQL_RESTORE=passed SQL_DBCC=passed POSTGRES_RESTORE=passed POSTGRES_TABLES=$postgresTableCount MINIO_OBJECTS=$objectCount MINIO_SHA256=matched"
    Write-Host "Artifact: $artifactDir"
}
finally {
    $dropQuery = "IF DB_ID(N'$restoreDatabase') IS NOT NULL BEGIN ALTER DATABASE [$restoreDatabase] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$restoreDatabase]; END"
    & $DockerExe exec -e SQLCMDPASSWORD $SqlContainer /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q $dropQuery 2>$null | Out-Null
    & $DockerExe exec $SqlContainer rm -f $sqlContainerPath 2>$null | Out-Null
    try {
        $postgresTerminate = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$postgresRestoreDatabase'"
        & $DockerExe exec -e PGPASSWORD $PostgresContainer psql -U tarim -d postgres -v ON_ERROR_STOP=1 -c $postgresTerminate 2>$null | Out-Null
    } catch { }
    try {
        & $DockerExe exec -e PGPASSWORD $PostgresContainer psql -U tarim -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $postgresRestoreDatabase" 2>$null | Out-Null
    } catch { }
    try { & $DockerExe exec $PostgresContainer rm -f $postgresContainerPath 2>$null | Out-Null } catch { }
    if ($sourceCanaryUploaded -and $dataNetwork) {
        $cleanupScript = 'mc alias set source http://minio:9000 "$SOURCE_USER" "$SOURCE_PASSWORD" >/dev/null && mc rm --force "source/tarim-uploads/backup-canary/$BACKUP_STAMP.bin" >/dev/null 2>&1 || true'
        & $DockerExe run --rm --network $dataNetwork -e SOURCE_USER -e SOURCE_PASSWORD -e BACKUP_STAMP `
            --entrypoint /bin/sh minio/mc:latest -c $cleanupScript 2>$null | Out-Null
    }
    if ($restoreStarted) {
        & $DockerExe stop $restoreContainer 2>$null | Out-Null
    }
    Remove-Item Env:SQLCMDPASSWORD,Env:PGPASSWORD,Env:SOURCE_USER,Env:SOURCE_PASSWORD,Env:RESTORE_USER,Env:RESTORE_PASSWORD,Env:RESTORE_HOST,Env:BACKUP_STAMP,Env:MINIO_ROOT_USER,Env:MINIO_ROOT_PASSWORD -ErrorAction SilentlyContinue
}
