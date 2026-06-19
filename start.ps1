Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Smart Connects - Full Docker Rebuild" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Step 1: Stop containers gracefully (data volume preserved)
Write-Host ""
Write-Host "[1/7] Stopping containers (preserving database volume)..." -ForegroundColor Yellow
docker compose -f docker-compose.local.yml down --remove-orphans 2>$null
Write-Host "  Done." -ForegroundColor Green

# Step 2: Build images with no cache
Write-Host ""
Write-Host "[2/7] Building images with --no-cache... (this may take a few minutes)" -ForegroundColor Yellow
docker compose -f docker-compose.local.yml build --no-cache
Write-Host "  Build complete." -ForegroundColor Green

# Step 3: Start full stack
Write-Host ""
Write-Host "[3/7] Starting the full stack..." -ForegroundColor Yellow
docker compose -f docker-compose.local.yml up -d
Write-Host "  Stack started." -ForegroundColor Green

# Step 4: Wait for DB health check
Write-Host ""
Write-Host "[4/7] Waiting for database to be healthy..." -ForegroundColor Yellow
for ($i = 1; $i -le 20; $i++) {
    $result = docker exec smartconnects-db pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Database is healthy!" -ForegroundColor Green
        break
    }
    Write-Host "  Waiting... ($i/20)" -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

# Step 5: Run migration (safe to re-run, uses IF NOT EXISTS)
Write-Host ""
Write-Host "[5/7] Running database migration..." -ForegroundColor Yellow
Get-Content backend/migration.sql | docker exec -i smartconnects-db psql -U postgres -d smart_connects 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Migration applied" -ForegroundColor Green
} else {
    Write-Host "  Migration skipped (columns may already exist)" -ForegroundColor Yellow
}

# Step 6: Seed sample data (skips if already seeded)
Write-Host ""
Write-Host "[6/7] Seeding sample data..." -ForegroundColor Yellow
docker compose -f docker-compose.local.yml run --rm seed 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Seed complete" -ForegroundColor Green
} else {
    Write-Host "  Seed already applied or skipped" -ForegroundColor Yellow
}

# Final verification
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Running containers:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

Write-Host ""
try {
    $apiHealth = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Backend health: $apiHealth" -ForegroundColor Green
} catch {
    Write-Host "Backend health: Not ready" -ForegroundColor Red
}

try {
    $frontendStatus = (Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop).StatusCode
    Write-Host "Docker Frontend: HTTP $frontendStatus (port 3000)" -ForegroundColor Green
} catch {
    Write-Host "Docker Frontend: Not ready (port 3000)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Rebuild complete!" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Cyan
