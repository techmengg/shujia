# Backup the production Prisma Postgres database to a local file via pg_dump.
#
# Usage (PowerShell, run from repo root or web/):
#   $env:BACKUP_DATABASE_URL = "postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
#   ./web/scripts/backup-prod.ps1
#
# Why a separate env var:
#   We deliberately avoid reusing DATABASE_URL so this script can never
#   accidentally point at the local dev database. You must paste the prod
#   *direct* connection URL (postgres://, NOT prisma://) explicitly.
#
# Output:
#   <repo-root>/backups/shujia-prod-YYYYMMDD-HHMMSS.dump
#
# Restore later with:
#   pg_restore --clean --if-exists --no-owner --no-acl --dbname="$URL" <file>
#
# Notes:
#   - pg_dump must be installed and on PATH. On Windows: `choco install
#     postgresql` or use the postgresql.org installer with "Command Line
#     Tools" selected.
#   - Use a pg_dump version >= the server major version. Prisma Postgres is
#     currently Postgres 17.x; pg_dump 16 will warn, pg_dump 17 is clean.
#   - The .dump file contains all your prod data in plaintext on disk.
#     Treat it like a credential. /backups/ is gitignored.

$ErrorActionPreference = "Stop"

if (-not $env:BACKUP_DATABASE_URL) {
    Write-Error "BACKUP_DATABASE_URL is not set. Paste the Prisma Postgres *direct* connection URL into that env var first."
    exit 1
}

if ($env:BACKUP_DATABASE_URL -like "prisma://*") {
    Write-Error "BACKUP_DATABASE_URL looks like a Prisma Accelerate URL (prisma://). pg_dump needs the raw postgres:// direct connection URL — find it in the Prisma console under the connection / setup section."
    exit 1
}

if ($env:BACKUP_DATABASE_URL -like "*localhost*" -or $env:BACKUP_DATABASE_URL -like "*127.0.0.1*") {
    Write-Error "BACKUP_DATABASE_URL points at localhost. This script is for backing up *production*, not the local dev DB."
    exit 1
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    # Fall back to standard PostgreSQL install location on Windows. Chocolatey's
    # postgresql package installs the binaries here but doesn't add bin/ to PATH.
    $candidates = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
        Sort-Object { [int]($_.Directory.Parent.Name) } -Descending
    if ($candidates) {
        $pgDumpPath = $candidates[0].FullName
        Write-Host "pg_dump not on PATH; found at $pgDumpPath"
        $pgDump = [PSCustomObject]@{ Source = $pgDumpPath }
    } else {
        Write-Error "pg_dump not found. Install PostgreSQL client tools first (e.g., 'choco install postgresql')."
        exit 1
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backupDir = Join-Path $repoRoot "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $backupDir "shujia-prod-$timestamp.dump"

Write-Host "pg_dump: $($pgDump.Source)"
Write-Host "Output:  $outFile"
Write-Host "Starting dump (custom format, compressed)..."

# --format=custom: pg_restore-friendly, compressed
# --no-owner / --no-acl: portable across DBs (prod -> staging restore works)
# --verbose: progress to stderr; redirect to keep stdout clean
& $pgDump.Source `
    --format=custom `
    --no-owner `
    --no-acl `
    --verbose `
    --file=$outFile `
    --dbname=$env:BACKUP_DATABASE_URL 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump exited with code $LASTEXITCODE. Check the URL and that pg_dump's major version >= the server's."
    exit 1
}

if (-not (Test-Path $outFile)) {
    Write-Error "pg_dump returned 0 but no output file was produced. Aborting."
    exit 1
}

$size = (Get-Item $outFile).Length
if ($size -lt 1024) {
    Write-Error "Output file is suspiciously small ($size bytes). Treat as failed and investigate before deploying."
    exit 1
}

$sizeMb = [math]::Round($size / 1MB, 2)
Write-Host ""
Write-Host "Backup complete." -ForegroundColor Green
Write-Host "  File: $outFile"
Write-Host "  Size: $sizeMb MB"
Write-Host ""
Write-Host "Restore later with:"
Write-Host "  pg_restore --clean --if-exists --no-owner --no-acl --dbname=`"`$URL`" `"$outFile`""
