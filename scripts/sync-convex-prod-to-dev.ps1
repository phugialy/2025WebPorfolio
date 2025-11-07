# Sync Convex Production to Dev
# This script exports data from production and imports it to dev

Write-Host "🔄 Syncing Convex Production to Dev..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Export from production
Write-Host "Step 1: Exporting data from production..." -ForegroundColor Cyan
$exportFile = "convex-prod-export-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"

Write-Host "Exporting to: $exportFile" -ForegroundColor Yellow
pnpm convex export --prod --path $exportFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Export failed!" -ForegroundColor Red
    Write-Host "Make sure you're logged in and have access to production deployment" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Export complete!" -ForegroundColor Green
Write-Host ""

# Step 2: Import to dev
Write-Host "Step 2: Importing data to dev..." -ForegroundColor Cyan
Write-Host "⚠️  WARNING: This will REPLACE existing data in dev!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel, or wait 5 seconds to continue..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Importing from: $exportFile" -ForegroundColor Yellow
pnpm convex import $exportFile --replace-all --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Import failed!" -ForegroundColor Red
    Write-Host "Export file saved as: $exportFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Import complete!" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy schema/functions to dev
Write-Host "Step 3: Deploying schema and functions to dev..." -ForegroundColor Cyan
pnpm convex dev --once

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Schema deployment had issues, but data was imported" -ForegroundColor Yellow
    Write-Host "You may need to run 'pnpm convex dev' manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Sync complete!" -ForegroundColor Green
Write-Host "Your dev deployment should now match production." -ForegroundColor Green
Write-Host ""
Write-Host "📝 Note: Environment variables are NOT synced." -ForegroundColor Yellow
Write-Host "   Set ADMIN_EMAILS and other env vars separately in each deployment." -ForegroundColor Yellow

