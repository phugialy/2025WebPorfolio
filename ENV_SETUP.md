# Environment Variables Setup

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Convex Deployment
CONVEX_DEPLOYMENT=dev:dapper-woodpecker-142
NEXT_PUBLIC_CONVEX_URL=https://dapper-woodpecker-142.convex.cloud

# Blog Ingest API
BLOG_INGEST_API_KEY=your-blog-ingest-api-key

# GitHub API
GITHUB_TOKEN=your-github-token
GITHUB_USERNAME=phugialy

# NextAuth.js (REQUIRED - Missing this causes the error!)
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_SECRET=your-random-secret-key

# Admin Email (set in Convex Dashboard)
ADMIN_EMAIL=phu.lyg@gmail.com
```

## Critical: AUTH_SECRET

**You MUST add `AUTH_SECRET` to your `.env.local` file!**

This is required by NextAuth.js. Without it, you'll get the `MissingSecret` error.

### Generate a new AUTH_SECRET:

```bash
# Windows PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use OpenSSL
openssl rand -base64 32
```

## Port Configuration

- **Default Next.js port**: `localhost:3000`
- If you're using `localhost:3001`, check:
  1. Is another app running on port 3000?
  2. Did you set `PORT=3001` in `.env.local`?
  3. Check your terminal output for the actual port

## After Adding AUTH_SECRET

1. **Restart your dev server**:
   ```bash
   # Stop the current server (Ctrl+C)
   pnpm dev
   ```

2. **Visit**: `http://localhost:3000/admin/projects` (or `3001` if that's your port)

3. **You should see**: "Sign In with Google" button

## Troubleshooting

### Still getting "MissingSecret" error?
- Make sure `.env.local` is in the project root
- Restart the dev server after adding `AUTH_SECRET`
- Check that there are no typos in the variable name

### Can't access localhost:3001?
- Check if Next.js is actually running on port 3001
- Try `localhost:3000` instead
- Check terminal output for the actual port

