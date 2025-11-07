# Vercel Callback URLs - Quick Reference

## Your Vercel Domains

Based on your Vercel deployment, you have these domains:

1. **Primary Domain:** `2025-web-porfolio.vercel.app` (recommended for production)
2. **Git Branch Domain:** `2025-web-porfolio-git-master-phulys-projects.vercel.app`
3. **Deployment-Specific Domain:** `2025-web-porfolio-s82i1hv09-phulys-projects.vercel.app`

## Which Callback URLs to Add

### ✅ Recommended: Add ALL Vercel Domains

Add all three callback URLs to Google Cloud Console to ensure OAuth works regardless of which URL users access:

```
https://2025-web-porfolio.vercel.app/api/auth/callback/google
https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google
https://2025-web-porfolio-s82i1hv09-phulys-projects.vercel.app/api/auth/callback/google
```

### 🎯 Minimum: Add Primary Domain

If you only want to add one, use the **primary domain**:

```
https://2025-web-porfolio.vercel.app/api/auth/callback/google
```

## Quick Setup Steps

### Step 1: Add to Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Scroll to "Authorized redirect URIs"
4. Click "Add URI"
5. Add each callback URL listed above
6. Click "Save"
7. Wait 5-10 minutes for changes to propagate

### Step 2: Set NEXTAUTH_URL in Vercel

1. Go to: https://vercel.com
2. Select your project: `2025-web-porfolio`
3. Go to **Settings** → **Environment Variables**
4. Add/Update:
   - **Name:** `NEXTAUTH_URL`
   - **Value:** `https://2025-web-porfolio.vercel.app`
   - **Environment:** Production (and Preview if needed)
5. Click "Save"
6. Redeploy your application

### Step 3: Test

1. Wait 5-10 minutes after updating Google Cloud Console
2. Visit: `https://2025-web-porfolio.vercel.app/login`
3. Click "Sign In with Google"
4. Should redirect back successfully

## Why Multiple Domains?

Vercel provides multiple domains for your deployment:
- **Primary domain** (`2025-web-porfolio.vercel.app`) - This is your main production URL
- **Git branch domain** - Used for branch-specific deployments
- **Deployment-specific domain** - Used for specific deployment versions

Adding all three ensures OAuth works regardless of which URL is used.

## Troubleshooting

### "redirect_uri_mismatch" Error

**Check:**
1. The exact URL in the error message
2. Make sure it's in your Google Cloud Console redirect URIs
3. Make sure it ends with `/callback/google`
4. Wait 5-10 minutes after updating Google Cloud Console

### OAuth Works on One Domain But Not Another

**Solution:** Add the missing domain to Google Cloud Console redirect URIs.

### Still Not Working?

1. **Check Vercel Environment Variables:**
   - Make sure `NEXTAUTH_URL` is set correctly
   - Make sure it matches one of your Vercel domains
   - Redeploy after changing environment variables

2. **Check Google Cloud Console:**
   - Verify all callback URLs are added
   - Make sure they end with `/callback/google`
   - Wait 5-10 minutes after saving

3. **Test in Incognito Mode:**
   - Clear browser cache
   - Try in incognito/private mode
   - Check browser console for errors

