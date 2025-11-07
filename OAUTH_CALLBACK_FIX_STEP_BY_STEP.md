# OAuth Callback Fix - Step by Step

## Issues Found in Your Google Cloud Console

Looking at your configuration, I found **2 critical errors**:

### ❌ Error 1: URIs 4 is Missing `/callback/google`
**Current (WRONG):**
```
https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth
```

**Should be (CORRECT):**
```
https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google
```

### ❌ Error 2: URIs 5 Uses `https` for Localhost
**Current (WRONG):**
```
https://localhost:3001/api/auth/callback/google
```

**Should be (CORRECT):**
```
http://localhost:3001/api/auth/callback/google
```

## Step-by-Step Fix

### Step 1: Update Google Cloud Console

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Click** on your OAuth 2.0 Client ID
3. **Scroll to** "Authorized redirect URIs"
4. **Fix URIs 4:**
   - **Delete:** `https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth`
   - **Add:** `https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google`
5. **Fix URIs 5:**
   - **Delete:** `https://localhost:3001/api/auth/callback/google`
   - **Add:** `http://localhost:3001/api/auth/callback/google` (change `https` to `http`)
6. **Click "Save"**
7. **Wait 5-10 minutes** for changes to propagate

### Step 2: Verify All URIs Are Correct

Your final list should be **exactly** these 5 URIs:

```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
http://localhost:3002/api/auth/callback/google
https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
```

**Wait!** I see you have `localhost:3001` twice. You can remove one if you want, but having duplicates won't hurt.

### Step 3: Add NEXTAUTH_URL to .env.local (Optional but Recommended)

Add this to your `.env.local` file:

```bash
# For local development
NEXTAUTH_URL=http://localhost:3001

# For production (set in Vercel environment variables)
# NEXTAUTH_URL=https://2025-web-porfolio-git-master-phulys-projects.vercel.app
```

**Note:** I've already added `trustHost: true` to the NextAuth config, which should handle this automatically, but setting `NEXTAUTH_URL` explicitly is more reliable.

### Step 4: Test Again

1. **Wait 5-10 minutes** after saving in Google Cloud Console
2. **Clear browser cache** or use **incognito mode**
3. **Restart your dev server:**
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```
4. **Try signing in again:**
   - Visit: `http://localhost:3001/login`
   - Click "Sign In with Google"
   - Should work now!

## Why This Happens

- **URIs 4:** NextAuth.js requires the full path `/api/auth/callback/google` (with provider name)
- **URIs 5:** Localhost always uses `http://`, never `https://` (unless you have SSL certificates set up)

## Still Not Working?

1. **Check the exact error** in the browser console
2. **Verify the redirect URI** in the error message matches one of your configured URIs
3. **Wait longer** - Google can take up to 30 minutes to propagate changes
4. **Try a different browser** or incognito mode
5. **Check server logs** for any NextAuth errors

