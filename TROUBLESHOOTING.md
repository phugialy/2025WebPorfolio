# Troubleshooting Project Management System

## Current Error: Convex Query Failing

### Error Message
```
[CONVEX Q(projects:getFeatured)] Server Error
```

### Root Causes

1. **Schema Not Deployed**
   - The `projects` table doesn't exist in Convex yet
   - The indexes haven't been created

2. **Convex Not Running**
   - Convex dev server is not running
   - Convex deployment hasn't been initialized

3. **Missing Environment Variable**
   - `NEXT_PUBLIC_CONVEX_URL` is not set
   - Or points to wrong deployment

## Solutions

### Step 1: Check Convex Status

```bash
# Check if Convex is running
pnpm convex dev

# Should see:
# - Deployment URL
# - Functions listed
# - Schema pushed
```

### Step 2: Deploy Schema

```bash
# Make sure Convex is running
pnpm convex dev

# The schema should auto-deploy when you save schema.ts
# Check Convex dashboard to verify tables exist
```

### Step 3: Verify Environment

Check `.env.local`:
```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Step 4: Check Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your project
3. Check "Data" tab for `projects` table
4. Check "Functions" tab for `projects:getFeatured`

### Step 5: Test Query Directly

In Convex dashboard:
1. Go to "Functions" tab
2. Find `projects:getFeatured`
3. Click "Run" to test
4. Check error message

## Temporary Workaround

If the table doesn't exist yet, the queries now return empty arrays instead of crashing. The page should show:
- "Loading projects..." while queries run
- "No projects available" when empty

## Next Steps After Fix

1. **Add Projects:**
   ```bash
   pnpm migrate:projects
   ```

2. **Or manually in Convex dashboard:**
   - Go to "Data" → "projects" table
   - Click "Add row"
   - Fill in required fields

3. **Verify it works:**
   - Visit `/work` page
   - Should see projects or empty state

## Common Issues

### Issue: "Table does not exist"
**Fix:** Run `pnpm convex dev` to deploy schema

### Issue: "Index does not exist"  
**Fix:** Schema needs redeployment. Stop and restart `pnpm convex dev`

### Issue: "Function not found"
**Fix:** Check that `convex/projects.ts` is saved and Convex has picked it up

### Issue: Empty results but table exists
**Fix:** Add projects using migration script or manually

## Verification Checklist

- [ ] Convex dev server is running (`pnpm convex dev`)
- [ ] Schema is deployed (check Convex dashboard)
- [ ] `projects` table exists in Convex
- [ ] `projects:getFeatured` function exists in Convex
- [ ] `NEXT_PUBLIC_CONVEX_URL` is set correctly
- [ ] At least one project exists in the table
- [ ] Project has `visible: true` and `featured: true`

## Still Not Working?

1. **Check browser console** for specific error messages
2. **Check Convex dashboard logs** for server-side errors
3. **Verify Convex deployment** is active
4. **Try restarting** Convex dev server
5. **Clear browser cache** and reload

