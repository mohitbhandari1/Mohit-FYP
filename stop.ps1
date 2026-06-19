Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Smart Connects - Docker Stop & Cleanup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/2] Stopping containers (preserving database volume)..." -ForegroundColor Yellow
docker compose -f docker-compose.local.yml down --remove-orphans
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Done. Containers stopped. Database data preserved." -ForegroundColor Green
} else {
    Write-Host "  Done (no running containers to stop)." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/2] Pruning unused Docker resources (keeping volumes)..." -ForegroundColor Yellow
docker system prune -f
Write-Host "  Prune complete." -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  All Docker resources cleaned up!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
