#!/usr/bin/env bash
set -euo pipefail

echo "================================================"
echo "  Smart Connects - Full Docker Rebuild"
echo "================================================"

cd "$(dirname "$0")"

# Step 1: Stop containers gracefully (preserve database volume)
echo ""
echo "[1/7] Stopping containers (preserving database volume)..."
docker compose -f docker-compose.local.yml down --remove-orphans 2>/dev/null || true
echo "  Done."

# Step 2: Build with no cache
echo ""
echo "[2/7] Building images with --no-cache... (this may take a few minutes)"
docker compose -f docker-compose.local.yml build --no-cache
echo "  Build complete."

# Step 3: Start full stack
echo ""
echo "[3/7] Starting the full stack..."
docker compose -f docker-compose.local.yml up -d
echo "  Stack started."

# Step 4: Wait for DB health check
echo ""
echo "[4/7] Waiting for database to be healthy..."
for i in $(seq 1 20); do
  if docker exec smartconnects-db pg_isready -U postgres 2>/dev/null; then
    echo "  Database is healthy!"
    break
  fi
  echo "  Waiting... ($i/20)"
  sleep 3
done

# Step 5: Run ALL migrations (idempotent)
echo ""
echo "[5/7] Running database migrations..."
for f in backend/migration.sql backend/migration-v2.sql backend/migration-v3.sql backend/migration-v4.sql backend/migration-v5.sql backend/migration-v6.sql backend/migration-v7.sql backend/migration-v8.sql backend/migration-v9.sql backend/migration-v10.sql backend/migration-v11.sql backend/migration-v12.sql backend/migration-v13.sql backend/migration-v14.sql backend/migration-v15.sql; do
  if [ -f "$f" ]; then
    docker exec -i smartconnects-db psql -U postgres -d smart_connects < "$f" 2>&1 | grep -v NOTICE && echo "  [OK] $f" || echo "  [skip] $f"
  fi
done

# Step 6: Seed sample data
echo ""
echo "[6/7] Seeding sample data..."
docker compose -f docker-compose.local.yml run --rm seed 2>&1 && \
  echo "  Seed complete" || \
  echo "  Seed already applied"

# Step 7: Wait for backend to be ready
echo ""
echo "[7/7] Waiting for backend API to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
    echo "  Backend is ready!"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 2
done

# Verify
echo ""
echo "================================================"
echo "  Verification"
echo "================================================"
echo ""
echo "Running containers:"
docker ps --format "table {{.Names}}	{{.Status}}	{{.Ports}}"
echo ""
echo "Backend health: $(curl -s http://localhost:4000/api/health 2>/dev/null || echo 'Not ready')"
echo "Docker Frontend: $(curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000 2>/dev/null || echo 'Not ready') (port 3000)"
echo ""
echo "================================================"
echo "  Rebuild complete!"
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:3000 (Docker) / http://localhost:3001 (local dev)"
echo "================================================"
