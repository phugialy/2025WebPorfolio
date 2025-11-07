# Deployment Callback URLs Configuration

## Overview

This document lists all the callback URLs you need to configure for your deployment to work properly.

## 🔐 Google OAuth Callback URLs

### Required for Google Cloud Console

You **MUST** add these exact URLs to your Google OAuth 2.0 Client ID in Google Cloud Console.

#### Development (Local)
```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
http://localhost:3002/api/auth/callback/google
```

#### Production (Vercel)
Based on your Vercel deployment, add **ALL** of these callback URLs:

**Primary Domain:**
```
https://2025-web-porfolio.vercel.app/api/auth/callback/google
```

**Git Branch Domain:**
```
https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google
```

**Deployment-Specific Domain (optional, but recommended):**
```
https://2025-web-porfolio-s82i1hv09-phulys-projects.vercel.app/api/auth/callback/google
```

**If you have a custom domain, also add:**
```
https://www.phugialy.com/api/auth/callback/google
https://phugialy.com/api/auth/callback/google
```

**Note:** It's recommended to add all Vercel domains to ensure OAuth works regardless of which URL is used.

### How to Configure

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Click on your OAuth 2.0 Client ID

2. **Add Authorized Redirect URIs:**
   - Scroll to "Authorized redirect URIs"
   - Click "Add URI"
   - Add each URL listed above
   - Click "Save"

3. **Wait for Propagation:**
   - Changes can take 1-10 minutes to propagate
   - Test after waiting a few minutes

### Important Notes

- ✅ **MUST** end with `/callback/google` (not just `/callback`)
- ✅ **MUST** match exactly (including `http://` vs `https://`)
- ✅ **MUST** include port number for localhost
- ❌ **DO NOT** use `/api/auth` without `/callback/google`
- ❌ **DO NOT** use `https://` for localhost (use `http://`)

## 🌐 Environment Variables for Deployment

### Vercel Environment Variables

Set these in your Vercel project settings:

```bash
# NextAuth.js
AUTH_SECRET=your-random-secret-key
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
NEXTAUTH_URL=https://2025-web-porfolio.vercel.app

# Convex
NEXT_PUBLIC_CONVEX_URL=https://brave-dogfish-51.convex.cloud

# Admin Emails (set in Convex Dashboard)
# ADMIN_EMAILS=phu.lyg@gmail.com,bigpstudio@gmail.com
```

### Local Development (.env.local)

```bash
# NextAuth.js
AUTH_SECRET=your-random-secret-key
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3001

# Convex
NEXT_PUBLIC_CONVEX_URL=https://dapper-woodpecker-142.convex.cloud

# GitHub (optional)
GITHUB_TOKEN=your-github-token
GITHUB_USERNAME=phugialy
```

## 🔄 Convex Environment Variables

Set these in Convex Dashboard (https://dashboard.convex.dev):

```bash
# Admin Emails (comma-separated)
ADMIN_EMAILS=phu.lyg@gmail.com,bigpstudio@gmail.com
```

## 📋 Deployment Checklist

### Before Deploying to Production

- [ ] Add production callback URL to Google Cloud Console
- [ ] Set `NEXTAUTH_URL` in Vercel environment variables
- [ ] Set `AUTH_SECRET` in Vercel environment variables
- [ ] Set `AUTH_GOOGLE_ID` in Vercel environment variables
- [ ] Set `AUTH_GOOGLE_SECRET` in Vercel environment variables
- [ ] Set `NEXT_PUBLIC_CONVEX_URL` in Vercel to production Convex URL
- [ ] Set `ADMIN_EMAILS` in Convex Dashboard
- [ ] Deploy Convex to production: `pnpm convex deploy -y`
- [ ] Test authentication on production URL

### After Deployment

- [ ] Test Google OAuth sign-in on production
- [ ] Verify admin access works with configured emails
- [ ] Check that redirect works correctly
- [ ] Test on different browsers/devices

## 🐛 Troubleshooting

### "redirect_uri_mismatch" Error

**Problem:** The callback URL in Google Cloud Console doesn't match what NextAuth.js is sending.

**Solution:**
1. Check the exact URL in the error message
2. Verify it's in your Google Cloud Console redirect URIs
3. Make sure it ends with `/callback/google`
4. Wait 5-10 minutes after updating Google Cloud Console

### Authentication Not Working in Production

**Check:**
1. `NEXTAUTH_URL` is set correctly in Vercel
2. `AUTH_SECRET` is set in Vercel
3. Production callback URL is in Google Cloud Console
4. `trustHost: true` is set in NextAuth config (already done)

### Admin Access Not Working

**Check:**
1. `ADMIN_EMAILS` is set in Convex Dashboard
2. Email matches exactly (case-sensitive)
3. User was created in Convex database after sign-in
4. Check Convex logs for errors

## 📚 Related Documentation

- `GOOGLE_OAUTH_REDIRECT_URIS.md` - Detailed OAuth setup
- `OAUTH_CALLBACK_FIX_STEP_BY_STEP.md` - Step-by-step fix guide
- `NEXTAUTH_SETUP.md` - NextAuth.js configuration
- `MULTIPLE_ADMIN_SETUP.md` - Admin email configuration
- `VERCEL_CONVEX_SETUP.md` - Vercel and Convex integration

