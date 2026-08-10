param(
    [switch]$SkipBuild
)

# Always run from the script's own folder so all relative paths
# (compose file, migrations) work no matter where the script is invoked from
Set-Location $PSScriptRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Smart Connects - Docker Restart" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Step 1: Stop containers gracefully (data volume preserved)
Write-Host ""
Write-Host "[1/7] Stopping containers (preserving database volume)..." -ForegroundColor Yellow
docker compose -f docker-compose.local.yml down --remove-orphans 2>$null
Write-Host "  Done." -ForegroundColor Green

# Step 2: Build images (uses layer cache so base images are NOT re-downloaded)
if ($SkipBuild) {
    Write-Host ""
    Write-Host "[2/7] Skipping image build (-SkipBuild) - reusing existing images..." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[2/7] Building images (cached)... (this may take a few minutes)" -ForegroundColor Yellow
    docker compose -f docker-compose.local.yml build
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  [FAIL] BUILD FAILED - images were NOT rebuilt." -ForegroundColor Red
        Write-Host "  The stack was NOT started to avoid running stale images." -ForegroundColor Red
        Write-Host ""
        Write-Host "  This is almost always a Docker Hub connectivity / DNS issue," -ForegroundColor Yellow
        Write-Host "  e.g. 'lookup registry-1.docker.io: no such host'." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Things to try:" -ForegroundColor Yellow
        Write-Host "    1. Check your internet connection, then re-run this script." -ForegroundColor White
        Write-Host "    2. Restart Docker Desktop (right-click tray icon -> Restart)." -ForegroundColor White
        Write-Host "    3. Test the registry:  docker pull node:20-alpine" -ForegroundColor White
        Write-Host "    4. If the network is down but you still want to start," -ForegroundColor White
        Write-Host "       re-run with existing images:  .\start.ps1 -SkipBuild" -ForegroundColor White
        exit 1
    }
    Write-Host "  Build complete." -ForegroundColor Green
}

# Step 3: Start full stack
Write-Host ""
Write-Host "[3/7] Starting the full stack..." -ForegroundColor Yellow
docker compose -f docker-compose.local.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Failed to start containers." -ForegroundColor Red
    exit 1
}
Write-Host "  Stack started." -ForegroundColor Green

# Step 4: Wait for DB health check
Write-Host ""
Write-Host "[4/7] Waiting for database to be healthy..." -ForegroundColor Yellow
$dbReady = $false
for ($i = 1; $i -le 20; $i++) {
    docker exec smartconnects-db pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Database is healthy!" -ForegroundColor Green
        $dbReady = $true
        break
    }
    Write-Host "  Waiting... ($i/20)" -ForegroundColor Gray
    Start-Sleep -Seconds 3
}
if (-not $dbReady) {
    Write-Host "  [FAIL] Database did not become healthy." -ForegroundColor Red
    exit 1
}

# Step 5: Apply ALL migrations in order (idempotent - safe to re-run)
Write-Host ""
Write-Host "[5/7] Running database migrations..." -ForegroundColor Yellow
$migrations = @(
    "backend/migration.sql",
    "backend/migration-v2.sql",
    "backend/migration-v3.sql",
    "backend/migration-v4.sql",
    "backend/migration-v5.sql",
    "backend/migration-v6.sql",
    "backend/migration-v7.sql"
)
$migrationFailed = $false
foreach ($file in $migrations) {
    if (-not (Test-Path $file)) {
        Write-Host "  (skip - $file not found)" -ForegroundColor Gray
        continue
    }
    # cmd /c merges psql stderr (NOTICEs) into stdout so PowerShell doesn't print red errors
    $out = cmd /c "type $file | docker exec -i smartconnects-db psql -U postgres -d smart_connects 2>&1"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] ${file}:" -ForegroundColor Red
        $migrationFailed = $true
    }
    $out | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkGray }
}
if ($migrationFailed) {
    Write-Host "  [FAIL] One or more migrations failed. Check the messages above." -ForegroundColor Red
    exit 1
}
Write-Host "  All migrations applied." -ForegroundColor Green

# Step 6: Seed sample data (idempotent - safe to re-run)
Write-Host ""
Write-Host "[6/7] Seeding sample data..." -ForegroundColor Yellow
$seedOut = cmd /c "docker compose -f docker-compose.local.yml run --rm seed 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Seed complete" -ForegroundColor Green
} elseif ($seedOut -match 'Seeding failed') {
    Write-Host "  [FAIL] Seed failed:" -ForegroundColor Red
    $seedOut | Where-Object { $_ -match 'Seeding failed|duplicate key|error:' } | ForEach-Object { Write-Host "     $_" -ForegroundColor Red }
    Write-Host "  Re-run manually:  docker compose -f docker-compose.local.yml run --rm seed" -ForegroundColor Yellow
} else {
    Write-Host "  Seed already applied or skipped" -ForegroundColor Yellow
}
$seedOut | Where-Object { $_ -notmatch '^\s*(Container|Seeding|\[INFO\]|>)' } | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }

# Final verification (with retries - services can take a while to boot)
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Running containers:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

Write-Host ""
Write-Host "  Waiting for backend on http://localhost:4000/api/health ..." -ForegroundColor Gray
$backendReady = $false
for ($i = 1; $i -le 40; $i++) {
    try {
        $apiHealth = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  Backend health: $($apiHealth | ConvertTo-Json -Compress)" -ForegroundColor Green
        $backendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 3
    }
}
if (-not $backendReady) {
    Write-Host "  Backend health: Not ready (after ~4 min)" -ForegroundColor Red
    Write-Host "  Check logs:  docker compose -f docker-compose.local.yml logs backend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Waiting for frontend on http://localhost:3000 ..." -ForegroundColor Gray
$frontendReady = $false
for ($i = 1; $i -le 60; $i++) {
    try {
        $frontendStatus = (Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop).StatusCode
        Write-Host "  Docker Frontend: HTTP $frontendStatus (port 3000)" -ForegroundColor Green
        $frontendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 3
    }
}
if (-not $frontendReady) {
    Write-Host "  Docker Frontend: Not ready (after ~6 min)" -ForegroundColor Red
    Write-Host "  Check logs:  docker compose -f docker-compose.local.yml logs frontend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Restart complete!" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Tips:" -ForegroundColor White
Write-Host "    - View logs:  docker compose -f docker-compose.local.yml logs -f" -ForegroundColor White
Write-Host "    - Fast restart (no rebuild):  .\start.ps1 -SkipBuild" -ForegroundColor White
Write-Host "    - Stop:  .\stop.ps1" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Cyan
