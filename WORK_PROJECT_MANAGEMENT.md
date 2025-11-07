# 🚀 Work/Projects Management System

## Overview

This system provides a complete project showcase with admin controls, repository access management, and email collection for private repos.

## Features

### ✅ Public Features
- **Enhanced Project Cards** with multiple action buttons:
  - "View Case Study" - Links to detailed case study pages
  - "View Demo" - Opens live demo URLs
  - "View Repo" - Direct link to public GitHub repositories
  - "Request Access" - Email collection for private repositories
- **Project Filtering** by type (Case Study, Repository, Live App, Side Project)
- **Featured Projects** section
- **GitHub Integration** - Display stars, languages, and repo info

### 🔐 Admin Features
- **Admin Dashboard** at `/admin/projects`
- **Visibility Toggle** - Show/hide projects from public view
- **Edit Projects** - Update titles, descriptions, URLs, and settings
- **Repository Access Control**:
  - `public` - Anyone can view the repo
  - `private` - Repo is private (button disabled)
  - `request-access` - Collects email before granting access
- **Access Request Management** - View and approve/reject email requests

## Project Structure

```
app/
├── work/
│   ├── page.tsx                 # Main work page (client wrapper)
│   ├── work-page-content.tsx    # Work page content with Convex queries
│   └── [slug]/
│       └── page.tsx             # Case study detail pages
├── admin/
│   └── projects/
│       └── page.tsx             # Admin dashboard

components/
├── work/
│   ├── enhanced-project-card.tsx    # New project card with all buttons
│   └── repo-access-dialog.tsx       # Email collection modal

convex/
├── schema.ts                    # Database schema
└── projects.ts                  # Convex functions (queries/mutations)

lib/
└── projects.ts                  # Legacy static projects (can migrate)
```

## Database Schema

### Projects Table
```typescript
{
  id: string;                    // Unique identifier
  title: string;
  description: string;
  tags: string[];
  year: string;
  type: "case-study" | "repository" | "live-app" | "side-project";
  status: "featured" | "active" | "archived" | "in-progress";
  visible: boolean;              // Admin control
  featured: boolean;
  
  // Type-specific fields
  slug?: string;                 // For case-study
  githubUrl?: string;            // For repository
  repoAccess?: "public" | "private" | "request-access";
  demoUrl?: string;              // Live demo URL
  appUrl?: string;               // App URL
  // ... more fields
}
```

### Repository Access Requests Table
```typescript
{
  projectId: string;
  email: string;
  name?: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}
```

## Setup Instructions

### 1. Deploy Convex Schema

Make sure your Convex schema is deployed:
```bash
pnpm convex dev
# Or for production:
pnpm convex deploy
```

### 2. Migrate Existing Projects (Optional)

If you have projects in `lib/projects.ts`, migrate them to Convex:

```bash
# Set your Convex URL in .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Run migration script
pnpm tsx scripts/migrate-projects-to-convex.ts
```

### 3. Add New Projects

#### Via Admin Dashboard (Recommended)
1. Navigate to `/admin/projects`
2. Use the UI to add new projects (coming soon - currently via Convex dashboard)

#### Via Convex Dashboard
1. Go to your Convex dashboard
2. Navigate to the `projects` table
3. Insert a new document with the required fields

#### Via Code (Migration Script)
Edit `scripts/migrate-projects-to-convex.ts` and add your project to the array, then run the script.

## Usage

### Adding a Public Repository

1. Go to `/admin/projects`
2. Create a new project with:
   - `type: "repository"`
   - `githubUrl: "https://github.com/username/repo"`
   - `repoAccess: "public"`
   - `visible: true`

### Adding a Private Repository (Request Access)

1. Create project with:
   - `type: "repository"`
   - `githubUrl: "https://github.com/username/repo"`
   - `repoAccess: "request-access"`
   - `visible: true`

2. When users click "Request Access", they'll submit their email
3. View requests in Convex dashboard under `repoAccessRequests` table
4. Approve requests via Convex dashboard or admin page (coming soon)

### Adding a Project with Demo

1. Create project with:
   - `type: "repository"` or `"live-app"`
   - `demoUrl: "https://demo.example.com"`
   - `githubUrl: "https://github.com/..."` (optional)
   - `visible: true`

### Hiding a Project

1. Go to `/admin/projects`
2. Click the eye icon to toggle visibility
3. Hidden projects won't appear on `/work` page

## Admin Dashboard Features

### View All Projects
- See all projects (visible and hidden)
- Filter by visibility status
- View project details at a glance

### Toggle Visibility
- Click the eye icon to show/hide projects
- Hidden projects are grayed out in the admin view

### Edit Projects
- Click the edit icon to modify:
  - Title and description
  - GitHub URL
  - Demo URL
  - Repository access level
  - Visibility and featured status

### Delete Projects
- Click the trash icon to delete projects
- Confirmation dialog prevents accidental deletion

## Email Request Flow

1. **User clicks "Request Access"** on a project card
2. **Dialog opens** asking for:
   - Email (required)
   - Name (optional)
   - Message (optional)
3. **Request submitted** to Convex `repoAccessRequests` table
4. **Admin reviews** requests (via Convex dashboard or admin page)
5. **Admin approves/rejects** and contacts user (manual process for now)

## Future Enhancements

- [ ] Auto-approve requests based on email domain
- [ ] Email notifications when requests are approved
- [ ] GitHub API integration to sync repo stats (stars, languages)
- [ ] Bulk import from GitHub
- [ ] Project creation form in admin dashboard
- [ ] Access request management UI in admin dashboard
- [ ] Analytics tracking for project views

## Troubleshooting

### Projects not showing
- Check `visible: true` in Convex
- Verify Convex connection in browser console
- Check `.env.local` has `NEXT_PUBLIC_CONVEX_URL`

### Email requests not working
- Verify Convex mutation permissions
- Check browser console for errors
- Ensure Convex functions are deployed

### Admin page not accessible
- Currently no authentication - add auth in production
- For now, restrict via middleware or IP whitelist

## Migration from Static Projects

If you're migrating from `lib/projects.ts`:

1. Run the migration script (see Setup Instructions)
2. Projects will be imported with `visible: true` by default
3. Update `repoAccess` field as needed in admin dashboard
4. Old static projects file can be kept as backup

