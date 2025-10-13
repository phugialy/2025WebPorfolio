# 📝 Blog Ingest API Setup Guide

Complete guide to setting up n8n → Convex blog ingestion pipeline.

---

## 🎯 **What This Does**

```
n8n Workflow → HTTP POST → /api/blog/ingest → Convex Database → Blog Page
```

**Benefits:**
- ✅ Real-time blog updates (no rebuild)
- ✅ Single HTTP request from n8n
- ✅ Automatic draft management
- ✅ Admin panel to review/approve
- ✅ No MDX files needed

---

## 🔧 **Step 1: Environment Setup**

### **Add to `.env.local`:**

```bash
# Convex (already have this)
CONVEX_DEPLOYMENT=anonymous:your-deployment
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210

# NEW: Blog Ingest API Key
BLOG_INGEST_API_KEY=your-secret-key-here
```

### **Generate a secure API key:**

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online
# https://generate-random.org/api-key-generator
```

**Example output:**
```
8xK3mN2pQ5vR9tY6wZ4sA7cD1fH0jL3mN8pQ2vR5tY9w
```

---

## 📊 **Step 2: Update Convex Schema**

Already done! The schema includes:

```typescript
blogDrafts: {
  title: string
  slug: string
  content: string
  canonicalUrl: string
  source: string
  tags: string[]
  quality?: number (1-5 stars)
  status: "new" | "reviewed" | "approved" | "rejected" | "published"
  publishDate?: timestamp
  metadata: {
    views, readTime, aiSummary, aiScore
  }
}
```

---

## 🔌 **Step 3: n8n Workflow Configuration**

### **n8n Workflow: RSS → Convex**

```json
[
  {
    // Node 1: Cron Trigger
    "name": "Daily RSS Check",
    "type": "n8n-nodes-base.cron",
    "parameters": {
      "triggerTimes": {
        "hour": 8,
        "minute": 0
      }
    }
  },
  {
    // Node 2: HTTP Request - Fetch RSS
    "name": "Fetch RSS Feed",
    "type": "n8n-nodes-base.httpRequest",
    "parameters": {
      "url": "https://overreacted.io/rss.xml",
      "responseFormat": "xml"
    }
  },
  {
    // Node 3: Parse RSS
    "name": "Parse RSS Items",
    "type": "n8n-nodes-base.function",
    "parameters": {
      "functionCode": `
        const items = [];
        const feed = $input.all()[0].json;
        
        for (const item of feed.rss.channel.item) {
          items.push({
            title: item.title,
            content: item.description || item['content:encoded'] || '',
            canonicalUrl: item.link,
            source: feed.rss.channel.title || "RSS Feed",
            author: item['dc:creator'] || item.author || '',
            tags: Array.isArray(item.category) ? item.category : [item.category].filter(Boolean),
            pubDate: item.pubDate
          });
        }
        
        return items.map(item => ({ json: item }));
      `
    }
  },
  {
    // Node 4: HTTP Request - Send to Your API
    "name": "Send to Convex",
    "type": "n8n-nodes-base.httpRequest",
    "parameters": {
      "method": "POST",
      "url": "https://your-portfolio.vercel.app/api/blog/ingest",
      "authentication": "none",
      "sendHeaders": true,
      "headerParameters": {
        "parameters": [
          {
            "name": "Content-Type",
            "value": "application/json"
          },
          {
            "name": "x-api-key",
            "value": "={{$env.BLOG_API_KEY}}"
          }
        ]
      },
      "sendBody": true,
      "bodyParameters": {
        "parameters": [
          {
            "name": "title",
            "value": "={{$json.title}}"
          },
          {
            "name": "content",
            "value": "={{$json.content}}"
          },
          {
            "name": "canonicalUrl",
            "value": "={{$json.canonicalUrl}}"
          },
          {
            "name": "source",
            "value": "={{$json.source}}"
          },
          {
            "name": "author",
            "value": "={{$json.author}}"
          },
          {
            "name": "tags",
            "value": "={{$json.tags}}"
          }
        ]
      },
      "options": {}
    }
  }
]
```

### **Set n8n Environment Variable:**

In n8n:
1. Settings → Variables
2. Add: `BLOG_API_KEY` = `your-secret-key-here`
3. Use in workflow: `{{$env.BLOG_API_KEY}}`

---

## 📡 **Step 4: Test the API**

### **Test with cURL:**

```bash
curl -X POST http://localhost:3001/api/blog/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key-here" \
  -d '{
    "title": "Test Blog Post",
    "content": "This is a test post from n8n.",
    "canonicalUrl": "https://example.com/test",
    "source": "Test Source",
    "tags": ["test", "demo"]
  }'
```

### **Expected Response:**

```json
{
  "success": true,
  "message": "Draft created",
  "data": {
    "id": "jh7w8x9y0z1a2b3c4d5e6f7g",
    "slug": "test-blog-post",
    "status": "created"
  }
}
```

### **Test GET endpoint:**

```bash
curl http://localhost:3001/api/blog/ingest
```

Response shows API documentation.

---

## 🖥️ **Step 5: View Drafts (Admin Panel)**

Create `/app/admin/drafts/page.tsx`:

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDraftsPage() {
  const drafts = useQuery(api.blog.listDrafts, { status: "new" });
  const updateStatus = useMutation(api.blog.updateStatus);
  const updateQuality = useMutation(api.blog.updateQuality);

  const handleApprove = async (id: any) => {
    await updateStatus({ id, status: "approved" });
  };

  const handleReject = async (id: any) => {
    await updateStatus({ id, status: "rejected" });
  };

  const handlePublish = async (id: any) => {
    await updateStatus({ id, status: "published" });
  };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Blog Drafts</h1>

        {drafts === undefined && <p>Loading...</p>}

        {drafts && drafts.length === 0 && (
          <p className="text-muted-foreground">No drafts yet. Check n8n workflow.</p>
        )}

        <div className="space-y-6">
          {drafts?.map((draft) => (
            <Card key={draft._id}>
              <CardHeader>
                <CardTitle>{draft.title}</CardTitle>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span>Source: {draft.source}</span>
                  <span>•</span>
                  <span>Status: {draft.status}</span>
                  {draft.quality && <span>• Quality: {draft.quality}⭐</span>}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 line-clamp-3">{draft.content}</p>
                
                <div className="flex gap-4 mb-4">
                  {draft.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handlePublish(draft._id)} size="sm">
                    Publish
                  </Button>
                  <Button onClick={() => handleApprove(draft._id)} variant="outline" size="sm">
                    Approve
                  </Button>
                  <Button onClick={() => handleReject(draft._id)} variant="destructive" size="sm">
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
```

---

## 📰 **Step 6: Display Published Posts**

Update `/app/blog/page.tsx` to read from Convex:

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function BlogPage() {
  const posts = useQuery(api.blog.listPublished, { limit: 20 });

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold mb-8">Blog</h1>

        {posts === undefined && <p>Loading...</p>}

        {posts && posts.length === 0 && (
          <p className="text-muted-foreground">No published posts yet.</p>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts?.map((post) => (
            <Link key={post._id} href={`/blog/${post.slug}`}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                  <CardDescription>
                    {post.source} • {post.metadata?.readTime || 5} min read
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {post.content}
                  </p>
                  <div className="flex gap-2 mt-4">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
```

---

## 🔄 **Complete Workflow**

### **Daily Workflow:**

1. **8:00 AM**: n8n cron triggers
2. **8:00-8:05 AM**: n8n fetches RSS feeds
3. **8:05 AM**: n8n posts to `/api/blog/ingest`
4. **8:05 AM**: API saves to Convex with status=`new`
5. **8:30 AM**: You visit `/admin/drafts`
6. **8:35 AM**: You review, approve, publish
7. **8:35 AM**: Post appears on `/blog` immediately
8. **Done!**: No rebuild, no PR, instant publish

---

## 🔐 **Security Considerations**

### **1. API Key Protection**

```typescript
// API checks key on every request
if (apiKey !== process.env.BLOG_INGEST_API_KEY) {
  return 401 Unauthorized
}
```

### **2. Rate Limiting** (Optional)

Add to API route:

```typescript
// Check rate limit (max 60/hour from n8n)
const identifier = request.headers.get("x-forwarded-for") || "n8n";
const rateLimit = await checkRateLimit(identifier, "blog-ingest", 60);
if (!rateLimit.allowed) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

### **3. Input Validation**

```typescript
// Validate content length
if (body.content.length > 50000) {
  return NextResponse.json({ error: "Content too long" }, { status: 400 });
}

// Sanitize HTML
const cleanContent = sanitizeHtml(body.content);
```

---

## 📊 **Monitoring**

### **Check Convex Dashboard:**

Visit: `http://127.0.0.1:6790` (or your Convex prod URL)

**Check:**
- `blogDrafts` table row count
- Recent inserts
- Query logs

### **Check n8n Executions:**

n8n → Executions tab

**Look for:**
- ✅ Successful executions
- ❌ Failed HTTP requests
- Response codes (200 = success, 401 = auth fail)

---

## 🐛 **Troubleshooting**

### **Issue: 401 Unauthorized**

**Cause**: Wrong API key

**Fix**:
```bash
# Check .env.local
cat .env.local | grep BLOG_INGEST_API_KEY

# Check n8n variable
# Settings → Variables → BLOG_API_KEY

# Make sure they match!
```

### **Issue: Drafts not appearing in Convex**

**Check:**
1. n8n execution succeeded?
2. API returned 200?
3. Convex dev server running? (`npx convex dev`)
4. Schema deployed? (check Convex dashboard)

### **Issue: Duplicate posts**

**Not a problem!** API automatically updates existing post by slug.

---

## 📈 **Advanced Features**

### **1. AI Quality Scoring**

Add OpenAI node in n8n before API call:

```javascript
// n8n OpenAI node
{
  "model": "gpt-4",
  "prompt": "Rate this article quality 1-5: {{$json.title}}\n{{$json.content}}"
}

// Then pass score to API
{
  "quality": "={{$json.aiScore}}",
  "aiSummary": "={{$json.aiSummary}}"
}
```

### **2. Auto-Publish High Quality**

In API route:

```typescript
// Auto-publish 5-star content
if (body.quality === 5) {
  draftData.status = "published";
}
```

### **3. Scheduled Publishing**

```typescript
// n8n sends future date
{
  "publishDate": "2025-02-01T10:00:00Z"
}

// Add cron to check and publish
// convex/crons.ts
export default {
  publishScheduled: {
    schedule: "*/10 * * * *", // Every 10 minutes
    handler: async (ctx) => {
      const ready = await ctx.db
        .query("blogDrafts")
        .filter(q => 
          q.eq(q.field("status"), "approved") &&
          q.lt(q.field("publishDate"), Date.now())
        )
        .collect();
      
      for (const post of ready) {
        await ctx.db.patch(post._id, { status: "published" });
      }
    }
  }
}
```

---

## ✅ **Setup Checklist**

- [ ] Add `BLOG_INGEST_API_KEY` to `.env.local`
- [ ] Restart Next.js dev server
- [ ] Convex dev server running (`npx convex dev`)
- [ ] Test API with cURL
- [ ] Configure n8n workflow
- [ ] Add API key to n8n variables
- [ ] Test n8n execution
- [ ] Check Convex dashboard for data
- [ ] Create `/admin/drafts` page
- [ ] Update `/blog` page to read from Convex
- [ ] Test end-to-end flow

---

## 🚀 **Quick Start Commands**

```bash
# 1. Generate API key
openssl rand -base64 32

# 2. Add to .env.local
echo "BLOG_INGEST_API_KEY=your-key-here" >> .env.local

# 3. Restart servers
# Kill and restart: pnpm dev
# Kill and restart: npx convex dev

# 4. Test API
curl -X POST http://localhost:3001/api/blog/ingest \
  -H "x-api-key: your-key-here" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content","canonicalUrl":"https://test.com","source":"Test"}'

# 5. Check Convex
# Open: http://127.0.0.1:6790
# Look in blogDrafts table
```

---

**You're all set!** Now n8n can send blog posts directly to your Convex database via HTTP POST. 🎉

