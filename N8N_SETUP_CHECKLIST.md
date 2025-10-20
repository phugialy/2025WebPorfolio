# ✅ n8n Blog API Setup Checklist

## 🎯 Goal
Connect your n8n workflow to send blog posts to: `https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app`

---

## 📋 Setup Steps

### ☐ 1. Add Environment Variable to Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add:
```
Name:  BLOG_INGEST_API_KEY
Value: blog_sk_5mN9pQ2vR8tY6wZ4xA7cD1fH3jL0kM8nP5qR2sT9uV6w
```

✅ Select: **Production**, **Preview**, **Development**  
✅ Click **Save**

---

### ☐ 2. Redeploy Your Site

After adding the environment variable:
- Vercel → Deployments → Click "Redeploy" on latest deployment
- **OR** push a small change to trigger new deployment

This ensures the `BLOG_INGEST_API_KEY` is available in your API route.

---

### ☐ 3. Verify Convex is Running

Check that Convex is deployed to production:

```bash
npx convex deploy --prod
```

Or check Convex dashboard: https://dashboard.convex.dev

---

### ☐ 4. Configure n8n HTTP Request Node

**In your n8n workflow:**

**Method:** `POST`

**URL:**
```
https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app/api/blog/ingest
```

**Headers:**
```
Content-Type: application/json
x-api-key: blog_sk_5mN9pQ2vR8tY6wZ4xA7cD1fH3jL0kM8nP5qR2sT9uV6w
```

**Body (JSON):**
```json
{
  "title": "{{ $json.title }}",
  "content": "{{ $json.content }}",
  "canonicalUrl": "{{ $json.link }}",
  "source": "n8n Bot",
  "author": "{{ $json.author || 'Unknown' }}",
  "tags": {{ $json.tags || [] }}
}
```

**Note:** Adjust `{{ $json.xxx }}` based on your workflow's data structure.

---

### ☐ 5. Test n8n Workflow

Run your n8n workflow manually and check:

✅ **n8n execution succeeds** (green checkmark)  
✅ **HTTP response is 200**  
✅ **Response body shows:**
```json
{
  "success": true,
  "message": "Draft created",
  "data": { ... }
}
```

---

### ☐ 6. Verify Data in Convex

Go to Convex Dashboard → `blogDrafts` table

You should see new entries with:
- `status: "new"`
- Your blog post data

---

## 🧪 Test Manually (Optional)

**PowerShell test:**
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "blog_sk_5mN9pQ2vR8tY6wZ4xA7cD1fH3jL0kM8nP5qR2sT9uV6w"
}

$body = @{
    title = "Test Post"
    content = "This is a test from PowerShell"
    canonicalUrl = "https://example.com/test"
    source = "Manual Test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app/api/blog/ingest" -Method POST -Headers $headers -Body $body
```

**Expected response:**
```
success : True
message : Draft created
data    : @{id=...; slug=test-post; status=created}
```

---

## 🐛 Common Issues

### ❌ 401 Unauthorized
**Fix:** API key doesn't match
- Check Vercel environment variable
- Check n8n header value
- Redeploy Vercel after adding env var

### ❌ 500 Internal Server Error
**Fix:** Convex not connected
- Run: `npx convex deploy --prod`
- Check `NEXT_PUBLIC_CONVEX_URL` in Vercel env vars

### ❌ n8n shows "success" but no data in Convex
**Fix:** Wrong URL or API endpoint
- Verify URL: `.../api/blog/ingest` (not `.../api/blog`)
- Check Convex is deployed to prod (not local dev)

---

## ✨ Success!

Once working, your n8n workflow will:
1. Send blog posts to your API
2. API saves to Convex `blogDrafts` table
3. Posts appear in Convex with `status: "new"`
4. You can create admin panel to review/publish

**API is ready—just add the env var and configure n8n! 🚀**


