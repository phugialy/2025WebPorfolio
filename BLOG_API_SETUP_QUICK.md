# 🚀 Blog API Setup for n8n (Quick Start)

Your blog API is **already coded and ready**. You just need to configure environment variables and n8n.

---

## ✅ Step 1: Add API Key to Vercel

1. **Go to your Vercel project**: https://vercel.com/phulys-projects/your-project
2. **Settings** → **Environment Variables**
3. **Add this variable**:

   ```
   Name:  BLOG_INGEST_API_KEY
   Value: (Generate below or use any secure random string)
   ```

### Generate API Key:

**Online**: Visit https://generate-random.org/api-key-generator

**Or use this secure key** (save it!):
```
blog_sk_5mN9pQ2vR8tY6wZ4xA7cD1fH3jL0kM8nP5qR2sT9uV6w
```

**Important**: 
- Save this key somewhere safe!
- Add it to Vercel environment variables
- Select: **Production**, **Preview**, and **Development**
- Click "Save"

---

## ✅ Step 2: Verify Convex is Deployed

Make sure your Convex database is deployed to production:

```bash
npx convex deploy --prod
```

---

## ✅ Step 3: Configure n8n Workflow

### **API Endpoint URL:**
```
https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app/api/blog/ingest
```

### **n8n HTTP Request Node Settings:**

**Method**: `POST`

**URL**: `https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app/api/blog/ingest`

**Authentication**: None

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-api-key": "YOUR_API_KEY_FROM_STEP_1"
}
```

**Body (JSON)**:
```json
{
  "title": "{{$json.title}}",
  "content": "{{$json.content}}",
  "canonicalUrl": "{{$json.url}}",
  "source": "n8n Blog Bot",
  "author": "{{$json.author}}",
  "tags": {{$json.tags}}
}
```

---

## ✅ Step 4: Test the API

### Test with cURL (after deploying to Vercel):

```bash
curl -X POST https://2025-web-porfolio-qyfsp0rya-phulys-projects.vercel.app/api/blog/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "title": "Test Post from n8n",
    "content": "This is my test blog post content. It will be stored in Convex!",
    "canonicalUrl": "https://example.com/test",
    "source": "n8n"
  }'
```

### Expected Success Response:
```json
{
  "success": true,
  "message": "Draft created",
  "data": {
    "id": "jh7w8x9y0z1a2b3c4d5e6f7g",
    "slug": "test-post-from-n8n",
    "status": "created"
  }
}
```

---

## ✅ Step 5: View Your Posts

Once n8n sends posts, you can:

1. **View in Convex Dashboard**: Check `blogDrafts` table
2. **Create Admin Page**: `/app/admin/drafts/page.tsx` (see BLOG_INGEST_SETUP.md)
3. **View on Blog Page**: Posts with status="published" will appear

---

## 📋 Quick Reference

| Item | Value |
|------|-------|
| **API Endpoint** | `/api/blog/ingest` |
| **Method** | POST |
| **Auth Header** | `x-api-key` |
| **Required Fields** | `title`, `content`, `canonicalUrl`, `source` |
| **Optional Fields** | `author`, `tags`, `slug`, `quality`, `notes` |

---

## 🐛 Troubleshooting

### Error: 401 Unauthorized
- Check API key matches in Vercel and n8n
- Make sure you redeployed after adding environment variable

### Error: 500 Internal Server Error
- Check Convex is deployed: `npx convex deploy --prod`
- Check Convex URL is set: `NEXT_PUBLIC_CONVEX_URL` in Vercel

### Posts not showing up
- Check Convex dashboard for data
- Make sure posts have `status: "published"` to appear on blog page
- New drafts have `status: "new"` by default (need admin approval)

---

## 🎯 Next Steps

1. ✅ Add API key to Vercel
2. ✅ Deploy Convex to production
3. ✅ Configure n8n workflow
4. ✅ Test with n8n
5. 📝 Create admin panel to approve/publish posts (optional)

**Your API is ready to receive blog posts! 🚀**


