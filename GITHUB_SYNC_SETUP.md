# GitHub Repository Sync Setup

## Overview

This feature allows you to automatically sync your GitHub repositories to your portfolio projects. It fetches all your public repositories and creates/updates project entries in Convex.

## Setup Instructions

### Step 1: Create GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "Portfolio Sync"
4. Select scopes:
   - ✅ `public_repo` (to read public repository information)
5. Click "Generate token"
6. Copy the token immediately (you won't see it again!)

### Step 2: Add to Environment Variables

Add to `.env.local`:

```bash
# GitHub API Configuration
GITHUB_TOKEN=ghp_your_token_here
GITHUB_USERNAME=phugialy  # Optional: defaults to this if not provided
```

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
pnpm dev
```

## Usage

### Sync from Admin Page

1. Go to `/admin/projects`
2. Find the "Sync from GitHub" section
3. Enter your GitHub username (or leave empty to use `GITHUB_USERNAME` from .env)
4. Click "Sync from GitHub"
5. Wait for sync to complete
6. Repositories will appear in the projects list

### What Gets Synced

For each public repository:
- ✅ Repository name → Project title
- ✅ Description → Project description
- ✅ Stars count → Project stars
- ✅ Primary language → Project language
- ✅ Topics → Project tags
- ✅ Homepage URL → Demo URL (if available)
- ✅ Repository URL → GitHub URL
- ✅ Auto-set as `type: "repository"`
- ✅ Auto-set as `visible: true`
- ✅ Auto-set `repoAccess: "public"`

### After Syncing

1. **Review Projects**: Check the projects list for synced repos
2. **Edit Visibility**: Toggle visibility to show/hide repos
3. **Set Featured**: Mark important repos as featured
4. **Edit Details**: Update titles, descriptions, tags as needed
5. **Add Demo URLs**: If a repo has a live demo, add it manually

## How It Works

### API Route (`/api/github/repos`)
- Fetches repositories from GitHub API
- Filters out private, forked, and archived repos
- Returns formatted repository data

### Convex Mutation (`projects:bulkSyncGitHubRepos`)
- Creates new project entries for new repos
- Updates existing projects if they already exist (by ID)
- Preserves manual edits (only updates GitHub-related fields)

### Project ID Generation
Projects are identified by: `{username}-{repo-name}`
Example: `phugialy-portfolio-v2`

This means:
- ✅ Re-syncing won't create duplicates
- ✅ Updates existing projects if they exist
- ✅ Preserves manual changes to other fields

## Security Notes

### Token Security
- ⚠️ **Never commit** `GITHUB_TOKEN` to git
- ✅ Add `.env.local` to `.gitignore` (should already be there)
- ✅ Use token with minimal permissions (`public_repo` only)
- ✅ Regenerate token if exposed

### API Rate Limits
- GitHub API: 5,000 requests/hour for authenticated requests
- Sync fetches all repos in one request (paginated)
- Safe to sync multiple times per hour

## Troubleshooting

### "GITHUB_TOKEN not configured"
- Make sure `.env.local` exists
- Add `GITHUB_TOKEN=your_token_here`
- Restart dev server

### "GitHub authentication failed"
- Check token is valid
- Verify token has `public_repo` scope
- Token might be expired (create new one)

### "User not found"
- Check username spelling
- Verify user exists on GitHub
- Make sure username matches your GitHub profile

### "No repositories found"
- Make sure you have public repositories
- Check if repos are archived or forked (these are filtered out)
- Verify token has correct permissions

### Projects not appearing
- Check if projects are set to `visible: true`
- Verify sync completed successfully
- Check Convex dashboard for projects table

## Advanced Usage

### Custom Sync Filter
You can modify the sync logic in `app/api/github/repos/route.ts` to:
- Filter by language
- Filter by stars count
- Include/exclude specific repos
- Add custom tags

### Manual Sync via API
You can also call the API directly:

```bash
curl "http://localhost:3000/api/github/repos?username=phugialy"
```

### Update Existing Projects
Re-syncing will update:
- Stars count
- Language
- Description
- Topics/tags
- Homepage URL

It will NOT overwrite:
- Visibility settings (visible/featured)
- Manual title edits
- Case study slugs
- Custom tags added manually

## Future Enhancements

- [ ] Auto-sync on schedule (daily/weekly)
- [ ] Filter repos by language, stars, etc.
- [ ] Sync private repos (with authentication)
- [ ] Sync organization repositories
- [ ] Update stars/language automatically

