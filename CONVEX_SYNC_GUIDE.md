# Syncing Convex Production to Dev

## Overview

This guide shows you how to sync your Convex dev deployment with production data, schema, and functions.

## Quick Method: Using the Script

### Step 1: Run the Sync Script

```powershell
.\scripts\sync-convex-prod-to-dev.ps1
```

This will:
1. Export all data from production (using `--prod` flag)
2. Import it to dev (default deployment)
3. Deploy schema/functions to dev

**Note:** The script uses `--prod` flag, so it automatically targets production without needing to set environment variables.

## Manual Method

### Step 1: Export from Production

```bash
# Export data from production (uses --prod flag)
pnpm convex export --prod --path convex-prod-export.zip
```

### Step 2: Import to Dev

```bash
# Import data to dev (default is dev deployment)
# WARNING: This will REPLACE existing data in dev!
pnpm convex import convex-prod-export.zip --replace-all --yes
```

### Step 3: Deploy Schema/Functions to Dev

```bash
# Deploy schema and functions to dev
pnpm convex dev --once
```

## Alternative: Using Convex Dashboard

### Step 1: Export from Production Dashboard

1. Go to: https://dashboard.convex.dev
2. Select your **production** project
3. Go to **Data** tab
4. Click **"Export"** button
5. Download the ZIP file

### Step 2: Import to Dev Dashboard

1. Go to: https://dashboard.convex.dev
2. Select your **dev** project
3. Go to **Data** tab
4. Click **"Import"** button
5. Upload the ZIP file from Step 1

### Step 3: Deploy Functions to Dev

```bash
# Make sure you're pointing to dev
pnpm convex dev --once
```

## What Gets Synced

### ✅ Data (Tables)
- All table data from production
- Projects, users, blog posts, etc.

### ✅ Schema
- Table definitions
- Indexes
- Field types

### ✅ Functions
- Queries
- Mutations
- Actions

### ⚠️ Environment Variables
- **NOT synced** - You need to set these manually in each deployment

## Important Notes

### ⚠️ Data Overwrite Warning

**Importing will OVERWRITE existing data in dev!**

- If you have test data in dev, it will be replaced
- Make a backup first if needed

### ⚠️ Schema Conflicts

If schemas differ:
- Convex will try to merge them
- You may need to resolve conflicts manually
- Check the Convex dashboard for errors

### ⚠️ Environment Variables

Environment variables are **NOT** synced:
- Set `ADMIN_EMAILS` in both dev and prod
- Set other env vars separately for each deployment

## Troubleshooting

### "Export failed"

**Check:**
1. Production URL is correct
2. You have access to production deployment
3. Production deployment is active

### "Import failed"

**Check:**
1. Dev URL is correct
2. Export file is valid
3. Schema compatibility (dev schema must support prod data)

### "Schema conflicts"

**Solution:**
1. Check Convex dashboard for error messages
2. Update dev schema to match production
3. Redeploy: `pnpm convex dev --once`

## Quick Reference

### Your Deployments

**Production:**
- URL: `https://brave-dogfish-51.convex.cloud`
- Deployment: `brave-dogfish-51`

**Development:**
- URL: `https://dapper-woodpecker-142.convex.cloud`
- Deployment: `dev:dapper-woodpecker-142`

### Commands

```bash
# Export from production
pnpm convex export --prod --path prod-export.zip

# Import to dev (WARNING: replaces all data!)
pnpm convex import prod-export.zip --replace-all --yes

# Deploy to dev
pnpm convex dev --once
```

## Best Practices

1. **Backup First**: Export dev data before importing production data
2. **Test Locally**: Test the sync in a separate dev deployment first
3. **Check Schema**: Ensure schemas are compatible before importing
4. **Environment Variables**: Set env vars separately for each deployment
5. **Verify**: Check Convex dashboard after sync to verify data

