# Clean Next.js build directory
# This script helps resolve Windows file locking issues

Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Waiting 2 seconds for processes to release files..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

if (Test-Path .next) {
    Write-Host "Attempting to remove .next directory..." -ForegroundColor Yellow
    
    # Try to remove files individually first
    Get-ChildItem -Path .next -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "Could not remove: $($_.FullName)" -ForegroundColor Red
        }
    }
    
    # Try to remove the directory
    try {
        Remove-Item -Path .next -Recurse -Force -ErrorAction Stop
        Write-Host "Successfully removed .next directory!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to remove .next directory. Please:" -ForegroundColor Red
        Write-Host "1. Close File Explorer if it has the .next folder open" -ForegroundColor Yellow
        Write-Host "2. Close your IDE/editor" -ForegroundColor Yellow
        Write-Host "3. Check if antivirus is scanning the folder" -ForegroundColor Yellow
        Write-Host "4. Manually delete the .next folder" -ForegroundColor Yellow
        Write-Host "5. Or restart your computer" -ForegroundColor Yellow
    }
} else {
    Write-Host ".next directory does not exist." -ForegroundColor Green
}

Write-Host "Done!" -ForegroundColor Green


