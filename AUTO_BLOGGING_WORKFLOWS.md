# 🤖 Auto-Blogging Workflow Guide

Complete guide to managing your auto-blogging system with **n8n**, **Google Workspace**, and **GitHub Actions**.

---

## 📊 Current Setup (GitHub Actions Only)

**What you have now:**

```
RSS Feeds → GitHub Actions (Daily Cron) → Parse RSS → Create MDX → Open PR
```

**Limitations:**
- ❌ No content review before PR
- ❌ No quality filtering
- ❌ No categorization
- ❌ No human-in-the-loop
- ❌ Can't save drafts for later
- ❌ No content calendar management

---

## 🚀 Enhanced Workflows with n8n + Google

### **Workflow 1: Content Curation Pipeline** (Recommended)

```
RSS Feeds → n8n → Google Sheets (Review) → Approved? → GitHub PR
```

#### Benefits:
- ✅ Review all content before publishing
- ✅ Score articles by quality
- ✅ Schedule publish dates
- ✅ Collaborate with others
- ✅ Track source performance

---

### **Workflow 2: Google Docs Writing Studio**

```
RSS Inspiration → n8n → Google Docs (Draft) → Edit/Enhance → GitHub PR
```

#### Benefits:
- ✅ Write/edit in familiar Google Docs
- ✅ Use Docs commenting for feedback
- ✅ Rich text editing
- ✅ Collaborative writing
- ✅ Auto-convert to MDX

---

### **Workflow 3: AI-Enhanced Curation**

```
RSS Feeds → n8n → OpenAI (Summarize) → Google Sheets (Review) → GitHub PR
```

#### Benefits:
- ✅ AI-generated summaries
- ✅ Quality scoring
- ✅ Tag suggestions
- ✅ SEO optimization
- ✅ Human final approval

---

## 📋 Workflow 1: Content Curation Pipeline (Detailed)

### Step-by-Step Setup

#### **1. Create Google Sheet: "Blog Content Queue"**

**Columns:**
```
| Title | Source | URL | Date | Quality | Status | Publish Date | Tags | Notes |
|-------|--------|-----|------|---------|--------|--------------|------|-------|
```

**Quality**: 1-5 stars  
**Status**: `New`, `Approved`, `Rejected`, `Published`, `Scheduled`

#### **2. n8n Workflow**

```javascript
// n8n Workflow: RSS to Google Sheets
[
  {
    // Node 1: Cron Trigger (Daily at 8 AM)
    "name": "Schedule Trigger",
    "type": "n8n-nodes-base.cron",
    "parameters": {
      "triggerTimes": {
        "hour": 8,
        "minute": 0
      }
    }
  },
  {
    // Node 2: HTTP Request - Fetch RSS Feeds
    "name": "Fetch RSS Feeds",
    "type": "n8n-nodes-base.httpRequest",
    "parameters": {
      "url": "https://overreacted.io/rss.xml",
      "responseFormat": "xml"
    }
  },
  {
    // Node 3: Parse RSS XML
    "name": "Parse RSS",
    "type": "n8n-nodes-base.function",
    "parameters": {
      "functionCode": `
        const items = [];
        const rss = $input.all()[0].json;
        
        // Extract items from RSS
        for (const item of rss.rss.channel.item) {
          items.push({
            title: item.title,
            url: item.link,
            source: "Overreacted",
            date: new Date(item.pubDate).toISOString(),
            description: item.description,
            status: "New",
            quality: null,
            tags: item.category || []
          });
        }
        
        return items.map(item => ({ json: item }));
      `
    }
  },
  {
    // Node 4: Check if already exists in Sheet
    "name": "Google Sheets - Check Exists",
    "type": "n8n-nodes-base.googleSheets",
    "parameters": {
      "operation": "read",
      "sheetId": "YOUR_SHEET_ID",
      "range": "A:C"
    }
  },
  {
    // Node 5: Filter new items only
    "name": "Filter New Items",
    "type": "n8n-nodes-base.if",
    "parameters": {
      "conditions": {
        "string": [
          {
            "value1": "={{$json.url}}",
            "operation": "notContains",
            "value2": "={{$node['Google Sheets - Check Exists'].json.values}}"
          }
        ]
      }
    }
  },
  {
    // Node 6: Add to Google Sheets
    "name": "Google Sheets - Add Row",
    "type": "n8n-nodes-base.googleSheets",
    "parameters": {
      "operation": "append",
      "sheetId": "YOUR_SHEET_ID",
      "range": "A:I",
      "values": [
        "={{$json.title}}",
        "={{$json.source}}",
        "={{$json.url}}",
        "={{$json.date}}",
        "", // Quality (you fill later)
        "New", // Status
        "", // Publish Date (you fill later)
        "={{$json.tags.join(', ')}}",
        "" // Notes
      ]
    }
  },
  {
    // Node 7: Send Slack/Email notification
    "name": "Notify New Content",
    "type": "n8n-nodes-base.slack",
    "parameters": {
      "channel": "#blog-content",
      "text": "🆕 New blog content available for review!\n{{$json.title}}"
    }
  }
]
```

#### **3. Review Process (Manual)**

1. Open Google Sheet
2. Read articles, rate quality (1-5 stars)
3. Set status to `Approved` or `Rejected`
4. Set `Publish Date` if scheduling
5. Add tags, notes

#### **4. n8n Workflow: Approved → GitHub PR**

```javascript
// n8n Workflow: Google Sheets to GitHub PR
[
  {
    // Node 1: Webhook Trigger (or Poll every hour)
    "name": "Check for Approved",
    "type": "n8n-nodes-base.cron",
    "parameters": {
      "triggerTimes": {
        "hour": "*/1" // Every hour
      }
    }
  },
  {
    // Node 2: Get approved items from Sheet
    "name": "Google Sheets - Read Approved",
    "type": "n8n-nodes-base.googleSheets",
    "parameters": {
      "operation": "read",
      "sheetId": "YOUR_SHEET_ID",
      "range": "A:I",
      "filters": {
        "status": "Approved"
      }
    }
  },
  {
    // Node 3: Check if publish date has passed
    "name": "Check Publish Date",
    "type": "n8n-nodes-base.if",
    "parameters": {
      "conditions": {
        "dateTime": [
          {
            "value1": "={{$json.publishDate}}",
            "operation": "before",
            "value2": "={{new Date().toISOString()}}"
          }
        ]
      }
    }
  },
  {
    // Node 4: Create MDX content
    "name": "Generate MDX",
    "type": "n8n-nodes-base.function",
    "parameters": {
      "functionCode": `
        const slug = $json.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        const mdx = \`---
title: "\${$json.title}"
date: "\${$json.date}"
canonical_link: "\${$json.url}"
source: "\${$json.source}"
tags: [\${$json.tags.split(',').map(t => '"' + t.trim() + '"').join(', ')}]
summary: "Curated content from \${$json.source}"
---

# \${$json.title}

*Originally published at [\${$json.source}](\${$json.url})*

\${$json.description || 'Read the full article at the link above.'}

## Read More

[Continue reading on \${$json.source} →](\${$json.url})

---

*This post was curated from an external source.*
\`;
        
        return {
          json: {
            ...$ json,
            slug,
            mdx
          }
        };
      `
    }
  },
  {
    // Node 5: Create GitHub file
    "name": "GitHub - Create File",
    "type": "n8n-nodes-base.github",
    "parameters": {
      "operation": "create",
      "owner": "phugialy",
      "repository": "2025WebPorfolio",
      "filePath": "content/blog/{{$json.slug}}.mdx",
      "fileContent": "={{$json.mdx}}",
      "commitMessage": "blog: add {{$json.title}}",
      "branch": "auto-blog-{{$now.format('YYYY-MM-DD')}}"
    }
  },
  {
    // Node 6: Create Pull Request
    "name": "GitHub - Create PR",
    "type": "n8n-nodes-base.github",
    "parameters": {
      "operation": "createPullRequest",
      "owner": "phugialy",
      "repository": "2025WebPorfolio",
      "title": "Auto-blog: {{$json.title}}",
      "body": "Approved content from Google Sheets\n\nSource: {{$json.source}}\nQuality: {{$json.quality}}⭐",
      "head": "auto-blog-{{$now.format('YYYY-MM-DD')}}",
      "base": "main"
    }
  },
  {
    // Node 7: Update Sheet status to "Published"
    "name": "Google Sheets - Update Status",
    "type": "n8n-nodes-base.googleSheets",
    "parameters": {
      "operation": "update",
      "sheetId": "YOUR_SHEET_ID",
      "range": "F{{$json.rowNumber}}",
      "values": [["Published"]]
    }
  }
]
```

---

## 📝 Workflow 2: Google Docs Writing Studio

### Use Case
You want to write original content or heavily edit curated content in Google Docs.

### Setup

#### **1. Create Google Drive Folder Structure**
```
Blog Drafts/
├── Inbox/          (New ideas)
├── In Progress/    (Currently writing)
├── Ready/          (Ready to publish)
└── Published/      (Archive)
```

#### **2. n8n Workflow: RSS → Google Docs**

```javascript
[
  {
    // Node 1: Fetch RSS (same as before)
    "name": "Fetch RSS"
  },
  {
    // Node 2: For each item, create Google Doc
    "name": "Google Docs - Create Draft",
    "type": "n8n-nodes-base.googleDocs",
    "parameters": {
      "operation": "create",
      "folderId": "INBOX_FOLDER_ID",
      "title": "{{$json.title}}",
      "content": `
# {{$json.title}}

**Source**: {{$json.url}}
**Date**: {{$json.date}}

---

## Summary
${description}

## Your Take
[Write your thoughts here]

## Key Points
- 
- 
- 

## Conclusion
[Your conclusion]
      `
    }
  },
  {
    // Node 3: Add comment with action items
    "name": "Google Docs - Add Comment",
    "type": "n8n-nodes-base.googleDocs",
    "parameters": {
      "operation": "addComment",
      "documentId": "={{$json.documentId}}",
      "text": "TODO:\n- Review source\n- Add personal insights\n- Add code examples\n- Choose tags\n- Set publish date"
    }
  }
]
```

#### **3. n8n Workflow: Google Docs → GitHub**

```javascript
[
  {
    // Node 1: Watch "Ready" folder
    "name": "Google Drive - Watch Folder",
    "type": "n8n-nodes-base.googleDrive",
    "parameters": {
      "operation": "list",
      "folderId": "READY_FOLDER_ID"
    }
  },
  {
    // Node 2: For each new file, read content
    "name": "Google Docs - Get Content",
    "type": "n8n-nodes-base.googleDocs",
    "parameters": {
      "operation": "get",
      "documentId": "={{$json.id}}"
    }
  },
  {
    // Node 3: Convert Google Docs to Markdown
    "name": "Convert to MDX",
    "type": "n8n-nodes-base.function",
    "parameters": {
      "functionCode": `
        // Use library like 'turndown' or custom conversion
        const content = $json.content;
        
        // Extract frontmatter from doc metadata
        const frontmatter = {
          title: $json.title,
          date: new Date().toISOString(),
          tags: extractTags($json.content), // Custom function
          summary: extractSummary($json.content)
        };
        
        const mdx = \`---
\${Object.entries(frontmatter).map(([k,v]) => \`\${k}: "\${v}"\`).join('\\n')}
---

\${convertToMarkdown(content)}
\`;
        
        return { json: { ...frontmatter, mdx } };
      `
    }
  },
  {
    // Node 4: Create GitHub PR (same as before)
    "name": "GitHub - Create PR"
  },
  {
    // Node 5: Move doc to "Published" folder
    "name": "Google Drive - Move File",
    "type": "n8n-nodes-base.googleDrive",
    "parameters": {
      "operation": "move",
      "fileId": "={{$json.documentId}}",
      "folderId": "PUBLISHED_FOLDER_ID"
    }
  }
]
```

---

## 🧠 Workflow 3: AI-Enhanced Curation

### Use Case
Automatically generate summaries, score quality, suggest tags.

### Setup

#### **1. n8n Workflow with OpenAI**

```javascript
[
  {
    // Node 1: Fetch RSS
    "name": "Fetch RSS"
  },
  {
    // Node 2: Send to OpenAI for analysis
    "name": "OpenAI - Analyze Article",
    "type": "n8n-nodes-base.openAi",
    "parameters": {
      "operation": "message",
      "model": "gpt-4",
      "prompt": `
Analyze this article and return JSON:

Title: {{$json.title}}
Description: {{$json.description}}
URL: {{$json.url}}

Return:
{
  "summary": "2-sentence summary",
  "quality_score": 1-5,
  "relevance_score": 1-5,
  "tags": ["tag1", "tag2", "tag3"],
  "sentiment": "positive|neutral|negative",
  "key_points": ["point1", "point2"],
  "recommendation": "publish|review|skip",
  "reasoning": "why this recommendation"
}
      `
    }
  },
  {
    // Node 3: Parse OpenAI response
    "name": "Parse AI Response",
    "type": "n8n-nodes-base.function",
    "parameters": {
      "functionCode": `
        const aiAnalysis = JSON.parse($json.choices[0].message.content);
        return {
          json: {
            ...$json,
            ...aiAnalysis
          }
        };
      `
    }
  },
  {
    // Node 4: Auto-approve high-quality content
    "name": "Check Quality Threshold",
    "type": "n8n-nodes-base.if",
    "parameters": {
      "conditions": {
        "number": [
          {
            "value1": "={{$json.quality_score}}",
            "operation": "largerEqual",
            "value2": 4
          },
          {
            "value1": "={{$json.relevance_score}}",
            "operation": "largerEqual",
            "value2": 4
          }
        ]
      }
    }
  },
  {
    // Node 5a: High quality → Auto-publish
    "name": "Auto-Publish",
    "type": "n8n-nodes-base.github"
  },
  {
    // Node 5b: Medium quality → Send to Sheet for review
    "name": "Send to Review Sheet",
    "type": "n8n-nodes-base.googleSheets"
  },
  {
    // Node 5c: Low quality → Skip (log only)
    "name": "Log Skipped",
    "type": "n8n-nodes-base.googleSheets",
    "parameters": {
      "sheetName": "Skipped Content"
    }
  }
]
```

---

## 📅 Content Calendar Management

### Google Sheets: "Content Calendar"

**Structure:**
```
| Week | Publish Date | Title | Status | Type | Tags | Priority | Notes |
|------|--------------|-------|--------|------|------|----------|-------|
```

### n8n Workflow: Schedule Publishing

```javascript
[
  {
    // Node 1: Daily check at 9 AM
    "name": "Daily Scheduler",
    "type": "n8n-nodes-base.cron",
    "parameters": {
      "triggerTimes": {
        "hour": 9,
        "minute": 0
      }
    }
  },
  {
    // Node 2: Get today's scheduled posts
    "name": "Get Scheduled Posts",
    "type": "n8n-nodes-base.googleSheets",
    "parameters": {
      "operation": "read",
      "filters": {
        "publishDate": "={{$now.format('YYYY-MM-DD')}}",
        "status": "Ready"
      }
    }
  },
  {
    // Node 3: Create GitHub PR for each
    "name": "Publish Content"
  }
]
```

---

## 🔄 Complete Content Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     Content Sources                          │
│  • RSS Feeds • Google Alerts • Twitter • Reddit • HN        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  n8n: Content Ingestion                      │
│  • Fetch sources • Deduplicate • Extract metadata           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  AI Analysis (Optional)                      │
│  • Quality score • Summarize • Tag suggestions              │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
         ┌──────────▼──────┐  ┌────▼─────────┐
         │ Google Sheets    │  │ Google Docs  │
         │ (Quick Review)   │  │ (Full Edit)  │
         └──────────┬───────┘  └────┬─────────┘
                    │               │
                    └───────┬───────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Human Review & Enhancement                    │
│  • Rate quality • Add insights • Schedule • Tag             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              n8n: GitHub PR Creation                         │
│  • Generate MDX • Create branch • Open PR                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Review & Merge                      │
│  • Check formatting • Preview • Merge to main               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Vercel Auto-Deploy                          │
│  • Build • Deploy • Live on phugialy.com                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Steps

### Phase 1: Basic n8n Setup (Day 1)

1. **Install n8n**
   ```bash
   # Docker (recommended)
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     n8nio/n8n
   
   # Or npm
   npm install n8n -g
   n8n start
   ```

2. **Connect Google Workspace**
   - Create Google Cloud project
   - Enable APIs: Sheets, Docs, Drive
   - Create OAuth credentials
   - Add to n8n credentials

3. **Connect GitHub**
   - Create GitHub Personal Access Token
   - Add to n8n credentials

### Phase 2: Create Content Queue Sheet (Day 1)

1. Create Google Sheet: "Blog Content Queue"
2. Add columns as specified above
3. Share with your Google account
4. Get Sheet ID from URL

### Phase 3: Build First Workflow (Day 2)

1. Start with **Workflow 1** (simplest)
2. Create n8n workflow: RSS → Sheet
3. Test with one RSS feed
4. Verify data appears in Sheet

### Phase 4: Add Approval Flow (Day 3)

1. Create n8n workflow: Sheet → GitHub
2. Test manually approving one item
3. Verify PR created correctly
4. Merge and check live site

### Phase 5: Enhance with AI (Optional, Day 4+)

1. Sign up for OpenAI API
2. Add AI analysis node
3. Test quality scoring
4. Tune thresholds

---

## 📊 Example Google Sheet Templates

### Template 1: Content Queue
```
| A: Title | B: Source | C: URL | D: Date | E: Quality | F: Status | G: Publish | H: Tags | I: Notes |
|----------|-----------|--------|---------|------------|-----------|------------|---------|----------|
| [Example]| Dan's Blog| http...| 2025-01 | ⭐⭐⭐⭐⭐    | Approved  | 2025-01-15 | react,js| Great! |
```

### Template 2: Content Calendar
```
| Week | Mon | Tue | Wed | Thu | Fri | Sat | Sun | Notes |
|------|-----|-----|-----|-----|-----|-----|-----|-------|
| W1   | Post A | - | Post B | - | Post C | - | - | Focus: React |
| W2   | Post D | - | Post E | - | Post F | - | - | Focus: TypeScript |
```

### Template 3: Source Performance
```
| Source | Total | Approved | Rejected | Avg Quality | Last Checked | Active |
|--------|-------|----------|----------|-------------|--------------|--------|
| Blog A | 45    | 32       | 13       | 4.2⭐       | 2025-01-10   | ✅     |
| Blog B | 23    | 15       | 8        | 3.8⭐       | 2025-01-09   | ✅     |
```

---

## 🎯 Recommended Approach for You

Based on your setup, I recommend:

### **Start with Workflow 1** (Content Curation Pipeline)

**Why:**
- ✅ Simple to set up
- ✅ Full control over quality
- ✅ Easy to collaborate
- ✅ Can schedule posts
- ✅ Track source performance

**Timeline:**
- Day 1: Set up n8n + Google Sheet
- Day 2: Build RSS → Sheet workflow
- Day 3: Build Sheet → GitHub workflow
- Day 4: Test end-to-end
- Day 5: Add more RSS sources

**Then enhance with:**
- Workflow 3 (AI scoring) - once you have baseline
- Workflow 2 (Google Docs) - for original content

---

## 📝 Quick Start Checklist

- [ ] Install n8n (Docker or npm)
- [ ] Create Google Sheet "Blog Content Queue"
- [ ] Set up Google OAuth in n8n
- [ ] Set up GitHub token in n8n
- [ ] Copy `rss.json` feeds to n8n workflow
- [ ] Create first workflow: RSS → Sheet
- [ ] Test with one feed
- [ ] Create second workflow: Sheet → GitHub
- [ ] Test with one approved item
- [ ] Verify PR created correctly
- [ ] Merge and check live site
- [ ] Add more RSS sources
- [ ] Invite collaborators to Sheet

---

## 🔗 Resources

- **n8n Docs**: https://docs.n8n.io/
- **Google Sheets API**: https://developers.google.com/sheets/api
- **GitHub API**: https://docs.github.com/en/rest
- **n8n Templates**: https://n8n.io/workflows/

---

**Ready to build?** Start with the simple Sheet-based workflow and iterate from there! 🚀

