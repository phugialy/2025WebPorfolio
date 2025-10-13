# 📂 Project Management System Guide

Your portfolio now supports **4 types of projects** with a unified, flexible architecture:

1. **Case Studies** - Full MDX case studies with detailed write-ups
2. **GitHub Repositories** - Open source projects with repo links
3. **Live Apps** - Interactive demos visitors can try
4. **Side Projects** - Simple mentions with optional links

---

## 🎯 Quick Start

All projects are managed in **`lib/projects.ts`**. This is your single source of truth for the portfolio.

### Adding a New Project

Open `lib/projects.ts` and add to the `projects` array:

```typescript
export const projects: Project[] = [
  // Your new project here
  {
    id: "my-awesome-app",
    type: "repository", // or "case-study", "live-app", "side-project"
    status: "featured", // or "active", "archived", "in-progress"
    title: "My Awesome App",
    description: "A cool thing I built",
    tags: ["Next.js", "TypeScript"],
    year: "2025",
    githubUrl: "https://github.com/yourusername/awesome-app",
    featured: true, // Shows in "Featured Projects" section
  },
  // ... other projects
];
```

---

## 📋 Project Types Explained

### 1. **Case Study** (Full Write-Up)

**Best for**: Major projects you want to showcase in detail

```typescript
{
  id: "portfolio-v2",
  type: "case-study",
  status: "featured",
  title: "Portfolio v2",
  description: "Modern portfolio with Next.js 15...",
  tags: ["Next.js", "TypeScript", "Tailwind"],
  year: "2025",
  slug: "portfolio-v2", // Must match file in content/work/
  role: "Full-Stack Development",
  duration: "2 weeks",
  metrics: ["Lighthouse 98", "LCP < 2.0s"], // Optional success metrics
  featured: true,
  image: "/projects/portfolio-v2.jpg", // Optional screenshot
}
```

**Also requires**: Create `content/work/portfolio-v2.mdx` with full case study

**Shows**:
- ✅ Detailed case study page at `/work/portfolio-v2`
- ✅ Project metrics in card
- ✅ "View Case Study" button
- ✅ Blue "Case Study" badge

---

### 2. **GitHub Repository** (Open Source)

**Best for**: Open source projects, libraries, tools

```typescript
{
  id: "react-hooks-library",
  type: "repository",
  status: "active",
  title: "React Hooks Library",
  description: "Collection of custom React hooks",
  tags: ["React", "TypeScript", "Hooks"],
  year: "2024",
  githubUrl: "https://github.com/yourusername/react-hooks",
  stars: 245, // Optional: GitHub star count
  language: "TypeScript", // Optional: Primary language
  demo: "https://react-hooks-demo.vercel.app", // Optional: Live demo
  featured: false,
}
```

**Shows**:
- ✅ Links to GitHub repository
- ✅ Star count and language
- ✅ Purple "Open Source" badge
- ✅ GitHub icon
- ✅ "View Repository →" button

---

### 3. **Live App** (Interactive Demo)

**Best for**: Projects users can try immediately

```typescript
{
  id: "weather-app-live",
  type: "live-app",
  status: "active",
  title: "Weather Dashboard (Live)",
  description: "Try the weather dashboard with real-time data",
  tags: ["Demo", "Interactive"],
  year: "2025",
  appUrl: "/weather", // Can be internal or external
  githubUrl: "https://github.com/yourusername/weather", // Optional
  screenshots: ["/weather-1.jpg", "/weather-2.jpg"], // Optional
  featured: false,
}
```

**Shows**:
- ✅ Links to live app
- ✅ Green "Live" badge
- ✅ Play icon
- ✅ "Try Live Demo →" button

---

### 4. **Side Project** (Simple Mention)

**Best for**: Experiments, weekend projects, hackathon projects

```typescript
{
  id: "color-palette-generator",
  type: "side-project",
  status: "archived",
  title: "AI Color Palette Generator",
  description: "Generate beautiful color palettes using ML",
  tags: ["Python", "ML", "Design"],
  year: "2023",
  link: "https://colors.example.com", // Optional external link
  note: "Weekend experiment with OpenAI API", // Optional note
  featured: false,
}
```

**Shows**:
- ✅ Simple card with description
- ✅ Optional external link
- ✅ Minimal styling
- ✅ "Learn More →" button (if link provided)

---

## 🏷️ Project Properties

### Required for All Types:
- `id` (string) - Unique identifier
- `type` (string) - "case-study" | "repository" | "live-app" | "side-project"
- `status` (string) - "featured" | "active" | "archived" | "in-progress"
- `title` (string) - Project name
- `description` (string) - Short description
- `tags` (string[]) - Technologies/categories
- `year` (string) - Year completed

### Type-Specific Properties:

**Case Study:**
- `slug` (string) **REQUIRED** - URL slug for `/work/[slug]`
- `role` (string) - Your role (e.g., "Full-Stack Development")
- `duration` (string) - Time spent (e.g., "2 weeks")
- `metrics` (string[]) - Success metrics (e.g., ["90% faster", "10k users"])

**Repository:**
- `githubUrl` (string) **REQUIRED** - GitHub repo URL
- `stars` (number) - GitHub stars
- `language` (string) - Primary language
- `demo` (string) - Live demo URL

**Live App:**
- `appUrl` (string) **REQUIRED** - App URL (internal or external)
- `githubUrl` (string) - Optional GitHub link
- `screenshots` (string[]) - Screenshot paths

**Side Project:**
- `link` (string) - External link
- `note` (string) - Brief note

---

## 🎨 Controlling Display

### Featured Projects
Set `featured: true` to show in the "Featured Projects" section on homepage and top of work page.

```typescript
featured: true // Shows prominently
featured: false // Shows in type-specific sections
```

### Project Status
Controls visibility and filtering:

- `"featured"` - Your best work
- `"active"` - Currently maintained
- `"in-progress"` - Work in progress
- `"archived"` - No longer maintained (still shows)

---

## 📁 File Structure

```
portfolio/
├── lib/
│   └── projects.ts          ← Central project configuration
├── content/
│   └── work/
│       ├── portfolio-v2.mdx     ← Case study MDX files
│       ├── weather-dashboard.mdx
│       └── auto-blogging-system.mdx
├── public/
│   └── projects/
│       ├── portfolio-v2.jpg     ← Optional project screenshots
│       ├── weather-dashboard.jpg
│       └── auto-blogging.jpg
└── app/
    └── work/
        ├── page.tsx             ← Reads from lib/projects.ts
        └── [slug]/
            └── page.tsx         ← Reads from content/work/*.mdx
```

---

## 🔄 Workflow Examples

### Adding a GitHub Repository

1. **Open `lib/projects.ts`**
2. **Add to `projects` array:**

```typescript
{
  id: "my-npm-package",
  type: "repository",
  status: "active",
  title: "My NPM Package",
  description: "Useful utility for X",
  tags: ["TypeScript", "npm", "Library"],
  year: "2025",
  githubUrl: "https://github.com/yourusername/my-package",
  stars: 42,
  language: "TypeScript",
  demo: "https://my-package-demo.vercel.app",
  featured: false,
}
```

3. **Save and refresh** - That's it! No MDX file needed.

---

### Adding a Full Case Study

1. **Open `lib/projects.ts`**
2. **Add to `projects` array:**

```typescript
{
  id: "ecommerce-platform",
  type: "case-study",
  status: "featured",
  title: "E-commerce Platform",
  description: "Scalable e-commerce built with Next.js",
  tags: ["Next.js", "Stripe", "PostgreSQL"],
  year: "2024",
  slug: "ecommerce-platform", // Important!
  role: "Lead Developer",
  duration: "3 months",
  metrics: ["$500k GMV", "10k users", "99.9% uptime"],
  featured: true,
}
```

3. **Create `content/work/ecommerce-platform.mdx`:**

```markdown
---
title: "E-commerce Platform"
description: "Scalable e-commerce built with Next.js"
date: "2024-06-15"
tags: ["Next.js", "Stripe", "PostgreSQL"]
year: "2024"
role: "Lead Developer"
duration: "3 months"
---

# E-commerce Platform

## Overview
[Your case study content here...]

## Tech Stack
[Details...]

## Results
[Outcomes...]
```

4. **Save and refresh** - Case study is live!

---

### Adding a Live Demo

1. **Deploy your app** (e.g., Vercel, Netlify)
2. **Open `lib/projects.ts`**
3. **Add to `projects` array:**

```typescript
{
  id: "task-manager",
  type: "live-app",
  status: "active",
  title: "Task Manager",
  description: "Simple task management app",
  tags: ["React", "Firebase"],
  year: "2025",
  appUrl: "https://my-task-manager.vercel.app",
  githubUrl: "https://github.com/yourusername/task-manager",
  featured: false,
}
```

4. **Save and refresh** - Live demo link is active!

---

## 🎯 Helper Functions

The system provides utility functions in `lib/projects.ts`:

```typescript
import {
  getFeaturedProjects,   // Get only featured projects
  getCaseStudies,        // Get all case studies
  getRepositories,       // Get all GitHub repos
  getLiveApps,          // Get all live apps
  getProjectsByType,     // Get projects by type
  getProjectsByStatus,   // Get projects by status
  getProjectById,        // Get specific project
} from "@/lib/projects";

// Usage examples:
const featured = getFeaturedProjects();
const repos = getRepositories();
const archived = getProjectsByStatus("archived");
```

---

## 🎨 Customizing Card Appearance

Each project type has different styling:

**Case Study:**
- Blue "Case Study" badge
- Metrics displayed
- Gradient header animation
- "View Case Study →" button

**Repository:**
- Purple "Open Source" badge
- GitHub icon
- Star count & language
- "View Repository →" button

**Live App:**
- Green "Live" badge
- Play icon
- "Try Live Demo →" button

**Side Project:**
- No special badge
- External link icon (if link provided)
- "Learn More →" button

---

## 📊 Best Practices

### 1. **Featured Projects** (3-5 items)
Your absolute best work. Shows on homepage and top of work page.

### 2. **Case Studies** (3-8 items)
Major projects worth explaining in depth. Each needs an MDX file.

### 3. **Repositories** (5-15 items)
Your open source contributions. Quick to add, great for showing breadth.

### 4. **Live Apps** (2-5 items)
Interactive projects visitors can try immediately.

### 5. **Side Projects** (As many as you want)
Fill out your portfolio with experiments and smaller projects.

---

## 🚀 Quick Reference

| Want to... | Do this... |
|-----------|------------|
| Showcase major project | Add case study + MDX file |
| Show GitHub repo | Add repository type with `githubUrl` |
| Add interactive demo | Add live-app type with `appUrl` |
| Mention side project | Add side-project type |
| Feature on homepage | Set `featured: true` |
| Add star count | Add `stars` to repository type |
| Show metrics | Add `metrics` array to case study |
| Add screenshot | Add `image` path to project |

---

## 🔍 Example: Complete Portfolio Setup

```typescript
export const projects: Project[] = [
  // 3 Featured Case Studies
  { id: "project-1", type: "case-study", featured: true, ... },
  { id: "project-2", type: "case-study", featured: true, ... },
  { id: "project-3", type: "case-study", featured: true, ... },
  
  // 2 More Case Studies
  { id: "project-4", type: "case-study", featured: false, ... },
  { id: "project-5", type: "case-study", featured: false, ... },
  
  // 5 GitHub Repositories
  { id: "repo-1", type: "repository", ... },
  { id: "repo-2", type: "repository", ... },
  { id: "repo-3", type: "repository", ... },
  { id: "repo-4", type: "repository", ... },
  { id: "repo-5", type: "repository", ... },
  
  // 2 Live Demos
  { id: "demo-1", type: "live-app", ... },
  { id: "demo-2", type: "live-app", ... },
  
  // 3 Side Projects
  { id: "side-1", type: "side-project", ... },
  { id: "side-2", type: "side-project", ... },
  { id: "side-3", type: "side-project", ... },
];
```

**Result**: 15 projects total, well-organized by type, with 3 featured on homepage.

---

## 💡 Tips

1. **Start with featured case studies** - Your best 3-5 projects
2. **Add GitHub repos** - Quick wins, shows breadth
3. **Include 1-2 live demos** - Let recruiters try your work
4. **Fill gaps with side projects** - Shows curiosity and experimentation

---

**Ready to add your projects?** Just edit `lib/projects.ts` and the system handles the rest! 🚀

