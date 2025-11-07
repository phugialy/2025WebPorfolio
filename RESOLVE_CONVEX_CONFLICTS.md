# Resolving Convex Schema Conflicts

## Quick Fix Steps

### Step 1: Check What's Causing the Conflict

Run this to see your Convex status:
```powershell
.\scripts\check-convex-status.ps1
```

### Step 2: Check Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your project: **pilresume**
3. Go to **"Data"** tab
4. Look for:
   - Does `projects` table exist?
   - Does `repoAccessRequests` table exist?
   - What error messages are shown?

### Step 3: Resolution Options

#### Option A: Tables Don't Exist Yet (Easiest)

If tables don't exist, just redeploy:
```bash
pnpm convex dev
```

The schema should deploy cleanly.

#### Option B: Tables Exist But Empty

1. In Convex Dashboard → Data tab
2. Delete the `projects` table (if empty)
3. Delete the `repoAccessRequests` table (if empty)
4. Redeploy: `pnpm convex dev`

#### Option C: Tables Exist With Data (Careful!)

**⚠️ Don't delete if you have data!**

Instead, check the error message:
- If it's about indexes: The schema update should handle it
- If it's about field types: We may need to migrate data

Share the exact error message and I'll help fix it.

#### Option D: Start Fresh (Nuclear Option)

**Only if you don't care about existing data:**

1. In Convex Dashboard → Settings
2. Delete the deployment
3. Create a new deployment
4. Run `pnpm convex dev`

## Common Error Messages

### "Table 'projects' already exists with different schema"
**Solution:** Delete the table in dashboard if empty, or contact me with the schema difference.

### "Index 'by_visible_and_featured' conflicts"
**Solution:** Already fixed! I removed the composite index. Just redeploy.

### "Field type mismatch for 'repoAccess'"
**Solution:** The field is required but might have been optional. Check existing data.

### "Cannot add required field to existing table"
**Solution:** Make the field optional first, then migrate data, then make it required.

## What I Changed

1. ✅ Removed composite index `by_visible_and_featured` (can cause conflicts)
2. ✅ Updated queries to use simple index + filter instead
3. ✅ Added error handling in queries
4. ✅ Made `repoAccess` required with default value in mutations

## Next Steps

1. **Try deploying again:**
   ```bash
   pnpm convex dev
   ```

2. **If still errors:**
   - Copy the exact error message
   - Check Convex dashboard for details
   - Share the error with me

3. **If it works:**
   - You should see "Schema pushed" message
   - Check dashboard to verify tables exist
   - Test the `/work` page

## Quick Test

After deployment succeeds:

1. Go to Convex Dashboard → Data → `projects` table
2. Click "Add row"
3. Fill in:
   - `id`: "test-1"
   - `title`: "Test Project"
   - `description`: "Testing"
   - `tags`: []
   - `year`: "2025"
   - `type`: "repository"
   - `status`: "active"
   - `visible`: true
   - `featured`: false
   - `repoAccess`: "public"
   - `createdAt`: (current timestamp)
   - `updatedAt`: (current timestamp)

4. Visit `/work` page - should see your test project!

