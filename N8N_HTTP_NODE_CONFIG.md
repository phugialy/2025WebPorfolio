# 🔧 n8n HTTP Request Node Configuration

## 📋 Exact Settings for Your n8n HTTP Request Node

### **Basic Settings**
- **Method**: `POST`
- **URL**: `https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app/api/blog/ingest`
- **Authentication**: `None`

### **Headers**
```
Content-Type: application/json
x-api-key: blog_sk_5mN9pQ2vR8tY6wZ4xA7cD1fH3jL0kM8nP5qR2sT9uV6w
```

### **Body (JSON)**
```json
{
  "title": "{{ $json.frontmatter.title }}",
  "content": "{{ $json.body }}",
  "canonicalUrl": "{{ $json.frontmatter.canonical }}",
  "source": "{{ $json.frontmatter.source.name }}",
  "author": "n8n Bot",
  "tags": {{ $json.frontmatter.tags }},
  "quality": {{ $json.frontmatter.quality }},
  "notes": "{{ $json.frontmatter.notes }}"
}
```

---

## 🎯 Field Mapping

| n8n Field | API Field | Example |
|-----------|-----------|---------|
| `$json.frontmatter.title` | `title` | "Vibe Coding in Practice..." |
| `$json.body` | `content` | "# Vibe Coding..." |
| `$json.frontmatter.canonical` | `canonicalUrl` | "https://arxiv.org/abs/2510.00328" |
| `$json.frontmatter.source.name` | `source` | "arXiv" |
| `$json.frontmatter.tags` | `tags` | ["adoption", "tradeoffs", "qa"] |
| `$json.frontmatter.quality` | `quality` | 3 |
| `$json.frontmatter.notes` | `notes` | "Systematic review..." |

---

## ✅ Expected Response

When successful, you'll get:
```json
{
  "success": true,
  "message": "Draft created",
  "data": {
    "id": "jh7w8x9y0z1a2b3c4d5e6f7g",
    "slug": "vibe-coding-in-practice-motivations-challenges",
    "status": "created"
  }
}
```

---

## 🐛 Common Issues

### ❌ "Missing required fields" error
**Cause**: Wrong field names in JSON body
**Fix**: Use exact field names: `title`, `content`, `canonicalUrl`, `source`

### ❌ "401 Unauthorized" error  
**Cause**: Wrong API key
**Fix**: Check `x-api-key` header matches Vercel environment variable

### ❌ "500 Internal Server Error"
**Cause**: Convex not deployed or wrong URL
**Fix**: Run `npx convex deploy --prod` and check Vercel env vars

---

## 🧪 Test Your n8n Workflow

1. **Run the test script**: `.\test-n8n-data.ps1`
2. **Check Convex dashboard**: Look for new entry in `blogDrafts` table
3. **Verify n8n execution**: Should show green success status

---

## 📊 What Happens Next

1. ✅ n8n sends data → API receives it
2. ✅ API validates and saves to Convex `blogDrafts` table  
3. ✅ Post gets `status: "new"` (needs admin approval)
4. ✅ You can create admin panel to review/publish posts
5. ✅ Published posts appear on your blog page

**Your n8n workflow will work perfectly with this configuration! 🚀**


