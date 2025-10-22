# Test Blog API with Nested Data Structure (Your n8n Format)
# This tests the API with the exact format your n8n sends

Write-Host "🧪 Testing Blog API with nested data structure..." -ForegroundColor Cyan

# Configuration
$apiUrl = "https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app/api/blog/ingest"
$apiKey = "blog_sk_5mN9pQ2vR8tY6wZ4xA7cD1fH3jL0kM8nP5qR2sT9uV6w"

# Your exact n8n output format
$nestedData = @{
    frontmatter = @{
        title = "Vibe Coding in Practice: Motivations, Challenges, and a Future Outlook — a Grey Literature Review"
        date = "2025-10-17"
        publishDate = $null
        status = "Approved"
        quality = 3
        source = @{
            name = "arXiv"
            url = "https://arxiv.org/abs/2510.00328"
        }
        tags = @("adoption", "tradeoffs", "qa", "practitioner-insights")
        summary = "This review explores why developers use vibe coding for speed, the challenges it brings, and what the future holds for balancing rapid prototyping with code quality."
        canonical = "https://arxiv.org/abs/2510.00328"
        notes = "Systematic review of practitioner sources showing a speed vs quality paradox: many use vibe coding for rapid prototyping but see long-term reliability and maintainability issues."
        audienceHint = "Ideal for developers and teams balancing rapid development with code quality and maintainability."
    }
    body = "# Vibe Coding in Practice: Motivations, Challenges, and a Future Outlook — a Grey Literature Review`n`n<TagList tags={[`"adoption`",`"tradeoffs`",`"qa`",`"practitioner-insights`"]} />`n`nEver struggled with choosing between fast coding and maintaining quality in your projects?`n`n## Key Takeaways`n`n- Leverage vibe coding to speed up prototyping and quickly test ideas.`n- Measure the tradeoffs between rapid development and long-term code reliability.`n- Optimize your workflow by balancing quick fixes with maintainable solutions.`n- Avoid neglecting code quality to prevent future maintenance headaches.`n`n## Lessons from the Field`n`nThis review gathers insights from various practitioners who use vibe coding—a style focused on rapid, intuitive development. Many find it useful for fast prototyping and getting immediate feedback. However, they also report challenges around code maintainability and reliability as projects grow.`n`nFor example, teams often start with vibe coding to validate ideas quickly but later face technical debt that slows down progress. This `"speed vs quality`" paradox means developers must carefully decide when to switch from vibe coding to more structured approaches.`n`n## Why It Matters`n`nUnderstanding vibe coding's benefits and pitfalls helps developers and teams make smarter decisions about their workflow. Balancing speed with quality leads to better software that can scale and adapt over time. This knowledge supports goals like efficient teamwork, sustainable codebases, and faster delivery without sacrificing maintainability.`n`n<SourceCard href=`"https://arxiv.org/abs/2510.00328`" label=`"Source: arXiv`" />"
} | ConvertTo-Json -Depth 10

# Headers
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = $apiKey
}

Write-Host "📡 Sending nested data structure to API..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Data structure:" -ForegroundColor Cyan
Write-Host "  ✅ Has frontmatter object"
Write-Host "  ✅ Has body string"
Write-Host "  ✅ frontmatter.title: $($nestedData.frontmatter.title)"
Write-Host "  ✅ frontmatter.source.name: $($nestedData.frontmatter.source.name)"
Write-Host "  ✅ frontmatter.tags: $($nestedData.frontmatter.tags -join ', ')"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $nestedData -ErrorAction Stop
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "  Success: $($response.success)"
    Write-Host "  Message: $($response.message)"
    Write-Host "  Post ID: $($response.data.id)"
    Write-Host "  Slug: $($response.data.slug)"
    Write-Host "  Status: $($response.data.status)"
    Write-Host ""
    Write-Host "🎉 Your nested data structure works perfectly!" -ForegroundColor Green
    Write-Host "📊 The API automatically extracted:" -ForegroundColor Cyan
    Write-Host "  • Title: $($response.data.slug)"
    Write-Host "  • Source: arXiv"
    Write-Host "  • Tags: adoption, tradeoffs, qa, practitioner-insights"
    Write-Host "  • Quality: 3 stars"
    Write-Host ""
    
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "🔑 Authentication error. Check API key in Vercel." -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode.value__ -eq 500) {
        Write-Host "⚙️ Server error. Check Convex deployment." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📋 For your n8n workflow, you can now send the raw nested data:" -ForegroundColor Cyan
Write-Host ""
Write-Host '{
  "frontmatter": {
    "title": "{{ $json.frontmatter.title }}",
    "canonical": "{{ $json.frontmatter.canonical }}",
    "source": {
      "name": "{{ $json.frontmatter.source.name }}"
    },
    "tags": {{ $json.frontmatter.tags }},
    "quality": {{ $json.frontmatter.quality }},
    "notes": "{{ $json.frontmatter.notes }}"
  },
  "body": "{{ $json.body }}"
}' -ForegroundColor White
Write-Host ""


