# Vercel + Convex Production Setup

## Issue
Your Vercel deployment is showing "No projects available" because it's not connected to your Convex production database.

## Solution

### Step 1: Get Your Production Convex URL

Your production Convex URL is:
```
https://brave-dogfish-51.convex.cloud
```

### Step 2: Set Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com
2. Select your project: `2025-web-porfolio` (or your project name)
3. Go to **Settings** → **Environment Variables**
4. Add/Update the following variables:

#### For Production:
- **Name**: `NEXT_PUBLIC_CONVEX_URL`
- **Value**: `https://brave-dogfish-51.convex.cloud`
- **Environment**: Production (and Preview if needed)

#### Optional (if needed):
- **Name**: `CONVEX_DEPLOYMENT`
- **Value**: `brave-dogfish-51`
- **Environment**: Production

### Step 3: Redeploy

After setting the environment variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a new deployment

### Step 4: Verify

1. Visit your Vercel deployment: https://2025-web-porfolio-git-master-phulys-projects.vercel.app/work
2. The page should now connect to your Convex production database
3. If you see "No projects available", you need to add projects to the production database

## Adding Projects to Production

### Option 1: Use Admin Panel (Recommended)

1. Visit: `https://your-vercel-url.com/admin/projects`
2. Use the "Sync from GitHub" feature to add projects
3. Or manually create projects using the "Create New Project" button

### Option 2: Migrate from Dev to Prod

If you have projects in your dev database, you can:

1. Export from dev database (via Convex dashboard)
2. Import to prod database (via Convex dashboard)
3. Or use the migration script (needs to be updated for prod)

## Troubleshooting

### Still seeing "No projects available"?

1. **Check Vercel Environment Variables:**
   - Make sure `NEXT_PUBLIC_CONVEX_URL` is set correctly
   - Make sure it's set for **Production** environment
   - Redeploy after changing environment variables

2. **Check Convex Dashboard:**
   - Go to: https://dashboard.convex.dev
   - Select your project
   - Check the **Data** tab → `projects` table
   - Verify there are projects with `visible: true`

3. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Check Console for errors
   - Look for Convex connection errors

4. **Verify Production URL:**
   - The production URL should be: `https://brave-dogfish-51.convex.cloud`
   - Not the dev URL: `https://dapper-woodpecker-142.convex.cloud`

## Quick Checklist

- [ ] Convex production deployment exists (`https://brave-dogfish-51.convex.cloud`)
- [ ] Vercel environment variable `NEXT_PUBLIC_CONVEX_URL` is set
- [ ] Vercel deployment is redeployed after setting env vars
- [ ] Projects exist in production Convex database
- [ ] Projects have `visible: true` in production database

