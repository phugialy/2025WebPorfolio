# Fixing Convex Schema Conflicts

## Common Conflict Issues

### 1. **Table Already Exists**
If `projects` table already exists with different schema, Convex will show conflicts.

### 2. **Index Conflicts**
Adding new indexes to existing tables can cause conflicts.

### 3. **Type Mismatches**
Changing field types in existing tables causes errors.

## Step-by-Step Resolution

### Option 1: Remove Composite Index (Safest)

The composite index `by_visible_and_featured` might be causing issues. Let's remove it temporarily:

1. **Edit `convex/schema.ts`** - Remove the composite index line:
   ```typescript
   // Remove this line:
   .index("by_visible_and_featured", ["visible", "featured"]),
   ```

2. **Save and let Convex redeploy**

### Option 2: Check What Tables Exist

1. Go to Convex Dashboard: https://dashboard.convex.dev
2. Select your project
3. Go to "Data" tab
4. Check if `projects` table already exists

### Option 3: Delete Conflicting Tables (If Empty)

**⚠️ WARNING: Only do this if tables are empty!**

1. In Convex Dashboard → Data tab
2. If `projects` table exists and is empty, delete it
3. Redeploy schema

### Option 4: Use Schema Push Flags

Try deploying with schema push:

```bash
pnpm convex dev --once
```

Or push schema separately:

```bash
pnpm convex deploy --push-schema-only
```

## Immediate Fix: Simplified Schema

Let's create a minimal version that's less likely to conflict:

