# Test Blog API Script
# Run this after you've added BLOG_INGEST_API_KEY to Vercel

Write-Host "🧪 Testing Blog API..." -ForegroundColor Cyan

# Configuration
$apiUrl = "https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app/api/blog/ingest"
$apiKey = "blog_sk_5mN9pQ2vR8tY6wZ4xA7cD1fH3jL0kM8nP5qR2sT9uV6w"

# Test data
$testPost = @{
    title = "Test Post from PowerShell $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    content = "This is a test blog post sent via PowerShell script. If you see this in Convex, the API is working! 🎉"
    canonicalUrl = "https://example.com/test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    source = "PowerShell Test Script"
    author = "Test Bot"
    tags = @("test", "automation")
} | ConvertTo-Json

# Headers
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = $apiKey
}

Write-Host "📡 Sending POST request to: $apiUrl" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $testPost -ErrorAction Stop
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "  Success: $($response.success)"
    Write-Host "  Message: $($response.message)"
    Write-Host "  Post ID: $($response.data.id)"
    Write-Host "  Slug: $($response.data.slug)"
    Write-Host "  Status: $($response.data.status)"
    Write-Host ""
    Write-Host "🎉 Your API is working! Check Convex dashboard for the data." -ForegroundColor Green
    
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "🔑 This is an authentication error. Make sure:" -ForegroundColor Yellow
        Write-Host "   1. You added BLOG_INGEST_API_KEY to Vercel environment variables"
        Write-Host "   2. You redeployed your site after adding the variable"
        Write-Host "   3. The API key in this script matches the one in Vercel"
    } elseif ($_.Exception.Response.StatusCode.value__ -eq 500) {
        Write-Host "⚙️ This is a server error. Make sure:" -ForegroundColor Yellow
        Write-Host "   1. Convex is deployed to production (npx convex deploy --prod)"
        Write-Host "   2. NEXT_PUBLIC_CONVEX_URL is set in Vercel"
    }
}

Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check Convex dashboard: https://dashboard.convex.dev"
Write-Host "   2. Look for 'blogDrafts' table"
Write-Host "   3. Your test post should have status='new'"
Write-Host ""


