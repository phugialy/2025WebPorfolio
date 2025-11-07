# Fix OAuth Callback Redirect URI Mismatch

## The Problem

You're seeing `Error 400: redirect_uri_mismatch` because your Google Cloud Console redirect URIs don't match what NextAuth.js is sending.

## Current Configuration (WRONG)

Your Google Cloud Console has:
- ❌ `http://localhost:3001/api/auth/callback` (missing `/google`)
- ❌ `https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth` (missing `/callback/google`)

## Required Configuration (CORRECT)

NextAuth.js requires the redirect URI to include the provider name:

- ✅ `http://localhost:3001/api/auth/callback/google` (with `/google`)
- ✅ `https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google` (with `/callback/google`)

## How to Fix

### Step 1: Update Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Navigate to: **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID

2. **Update Authorized Redirect URIs:**

   **Remove these (if present):**
   - ❌ `http://localhost:3001/api/auth/callback`
   - ❌ `https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth`

   **Add these (CORRECT):**
   - ✅ `http://localhost:3000/api/auth/callback/google`
   - ✅ `http://localhost:3001/api/auth/callback/google`
   - ✅ `http://localhost:3002/api/auth/callback/google` (if you use it)
   - ✅ `https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google`

3. **Save the changes**

### Step 2: Verify Your Setup

Make sure you have all these redirect URIs configured:

**For Development:**
```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
http://localhost:3002/api/auth/callback/google
```

**For Production:**
```
https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google
```

**Important:** The redirect URI **MUST** end with `/callback/google` (not just `/callback` or `/api/auth`)

## Why This Happens

NextAuth.js uses a catch-all route `[...nextauth]` that creates routes like:
- `/api/auth/callback/google` (for Google OAuth)
- `/api/auth/callback/github` (if you add GitHub)
- `/api/auth/callback/facebook` (if you add Facebook)

The provider name (`google`) is part of the URL path, so it must be included in the redirect URI.

## Testing

After updating the redirect URIs:

1. **Wait 1-2 minutes** for Google to update the configuration
2. **Clear your browser cache** (or use incognito mode)
3. **Try signing in again:**
   - Visit: `http://localhost:3001/login`
   - Click "Sign In with Google"
   - Should redirect back successfully

## Common Mistakes

❌ **Wrong:**
- `http://localhost:3001/api/auth/callback`
- `http://localhost:3001/api/auth`
- `https://your-domain.com/api/auth/callback`

✅ **Correct:**
- `http://localhost:3001/api/auth/callback/google`
- `https://your-domain.com/api/auth/callback/google`

## Still Having Issues?

1. **Check the exact error message** in the browser console
2. **Verify the redirect URI** matches exactly (including `/google`)
3. **Wait a few minutes** after updating Google Cloud Console
4. **Try in incognito mode** to avoid cache issues

