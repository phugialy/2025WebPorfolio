# Check Convex Deployment Status
Write-Host "Checking Convex Status..." -ForegroundColor Yellow
Write-Host ""

# Check if .env.local exists
if (Test-Path .env.local) {
    Write-Host "✓ .env.local exists" -ForegroundColor Green
    $convexUrl = Get-Content .env.local | Select-String -Pattern "NEXT_PUBLIC_CONVEX_URL"
    if ($convexUrl) {
        Write-Host "✓ Convex URL configured: $($convexUrl.ToString().Split('=')[1])" -ForegroundColor Green
    } else {
        Write-Host "✗ NEXT_PUBLIC_CONVEX_URL not found in .env.local" -ForegroundColor Red
    }
} else {
    Write-Host "✗ .env.local not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "To fix schema conflicts:" -ForegroundColor Yellow
Write-Host "1. Go to https://dashboard.convex.dev" -ForegroundColor Cyan
Write-Host "2. Select your project (pilresume)" -ForegroundColor Cyan
Write-Host "3. Go to 'Data' tab" -ForegroundColor Cyan
Write-Host "4. Check if 'projects' table exists" -ForegroundColor Cyan
Write-Host "5. If it exists and is empty, you can delete it" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then run: pnpm convex dev" -ForegroundColor Green

