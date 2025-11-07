# Quick Fix: NextAuth.js Authentication Error

## The Problem

You're seeing `500 Internal Server Error` on `/api/auth/session` because:

1. **Missing `AUTH_SECRET`** in `.env.local` - This is REQUIRED by NextAuth.js
2. **Query signature mismatch** - Fixed in code

## Immediate Fix

### Step 1: Add AUTH_SECRET to `.env.local`

Open your `.env.local` file and add this line:

```bash
AUTH_SECRET=your-random-secret-key
```

**Or generate a new one:**
```bash
# PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 2: Restart Your Dev Server

**IMPORTANT:** You MUST restart the dev server after adding `AUTH_SECRET`!

1. Stop the current server (Ctrl+C in the terminal)
2. Start it again:
   ```bash
   pnpm dev
   ```

### Step 3: Clear Browser Cache

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 4: Try Again

Visit: `http://localhost:3001/admin/projects`

You should now see:
- ✅ "Sign In with Google" button (instead of errors)
- ✅ No console errors

## What Was Fixed

1. ✅ Added `AUTH_SECRET` requirement to NextAuth config
2. ✅ Fixed `isAdmin` query to accept `email` argument
3. ✅ Updated query to work with NextAuth.js (not Convex Auth)

## Still Having Issues?

### Check Your `.env.local` File

Make sure it has ALL these variables:

```bash
# NextAuth.js (REQUIRED!)
AUTH_SECRET=your-random-secret-key
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Convex
NEXT_PUBLIC_CONVEX_URL=https://dapper-woodpecker-142.convex.cloud

# Admin
ADMIN_EMAIL=phu.lyg@gmail.com
```

### Verify Server Logs

Check your terminal where `pnpm dev` is running. You should see:
- ✅ No "MissingSecret" errors
- ✅ Server running on port 3001

### Check Google OAuth Redirect URI

Make sure in Google Cloud Console, your redirect URI is:
```
http://localhost:3001/api/auth/callback/google
```

(Not `localhost:3000` - use the port you're actually running on!)

