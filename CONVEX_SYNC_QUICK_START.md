# Quick Start: Sync Convex Production to Dev

## The Easiest Way

Just run this command:

```powershell
pnpm run sync:convex
```

Or manually:

```powershell
.\scripts\sync-convex-prod-to-dev.ps1
```

## What It Does

1. **Exports** all data from production (`--prod` flag)
2. **Imports** it to dev (replaces existing data)
3. **Deploys** schema and functions to dev

## Manual Commands (If Script Doesn't Work)

### Step 1: Export from Production

```bash
pnpm convex export --prod --path convex-prod-export.zip
```

### Step 2: Import to Dev

```bash
# WARNING: This replaces all data in dev!
pnpm convex import convex-prod-export.zip --replace-all --yes
```

### Step 3: Deploy Schema/Functions

```bash
pnpm convex dev --once
```

## Important Notes

⚠️ **WARNING**: Importing will **REPLACE** all existing data in dev!

- Your dev test data will be overwritten
- Make a backup first if needed

✅ **What Gets Synced:**
- All table data (projects, users, blog posts, etc.)
- Schema (table definitions, indexes)
- Functions (queries, mutations, actions)

❌ **What Doesn't Get Synced:**
- Environment variables (set separately in each deployment)
- File storage (unless you use `--include-file-storage`)

## Your Deployments

**Production:**
- URL: `https://brave-dogfish-51.convex.cloud`
- Use `--prod` flag to target it

**Development:**
- URL: `https://dapper-woodpecker-142.convex.cloud`
- Default deployment (no flag needed)

## Troubleshooting

### "Export failed"
- Make sure you're logged in: `pnpm convex login`
- Check you have access to production deployment

### "Import failed"
- Check the export file exists
- Make sure dev deployment is active
- Check schema compatibility

### "Schema conflicts"
- Run `pnpm convex dev --once` manually
- Check Convex dashboard for errors

