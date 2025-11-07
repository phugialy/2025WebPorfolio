# Admin Authentication Setup Guide

This guide will help you set up Google OAuth authentication for your admin panel, restricting access to only your Gmail account.

## Overview

The admin panel (`/admin/projects`) is now protected with Google OAuth authentication. Only users with your specified Gmail address will have admin access.

## Step 1: Install Required Packages

```bash
pnpm add @auth/core
```

## Step 2: Set Up Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Enable Google+ API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For local: `http://localhost:3000/api/auth/callback`
     - For production: `https://your-domain.com/api/auth/callback`
   - Save and copy the **Client ID** and **Client Secret**

## Step 3: Configure Convex Environment Variables

1. **Go to Convex Dashboard:**
   - Visit: https://dashboard.convex.dev
   - Select your project

2. **Set Environment Variables:**
   - Go to "Settings" → "Environment Variables"
   - Add the following:
     - `AUTH_GOOGLE_ID`: Your Google OAuth Client ID
     - `AUTH_GOOGLE_SECRET`: Your Google OAuth Client Secret
     - `ADMIN_EMAIL`: Your Gmail address (e.g., `yourname@gmail.com`)

## Step 4: Update Convex Auth Configuration

The `convex/auth.ts` file needs to be updated to use environment variables:

```typescript
import { Google } from "@auth/core/providers/google";
import { ConvexAuth } from "convex/auth";

export const { auth, signIn, signOut, store } = new ConvexAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
});
```

## Step 5: Create Auth Callback Route

Create `app/api/auth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/convex/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(new URL("/admin/projects?error=invalid_callback", request.url));
    }

    // Handle OAuth callback
    const result = await auth.handleCallback({
      code,
      state,
    });

    // Create/update user in database
    // This will be handled by the createOrUpdateUser mutation

    // Redirect to admin page
    return NextResponse.redirect(new URL("/admin/projects", request.url));
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/admin/projects?error=auth_failed", request.url));
  }
}
```

## Step 6: Deploy Convex Schema

```bash
# Deploy to development
pnpm convex dev

# Deploy to production
pnpm convex deploy --prod
```

## Step 7: Test Authentication

1. **Visit Admin Page:**
   - Go to: `http://localhost:3000/admin/projects`
   - You should see a "Sign In with Google" button

2. **Sign In:**
   - Click "Sign In with Google"
   - Select your Gmail account
   - You should be redirected back to the admin page

3. **Verify Access:**
   - If your email matches `ADMIN_EMAIL`, you'll see the admin panel
   - If not, you'll see an "Access Denied" message

## How It Works

1. **User visits `/admin/projects`:**
   - `AdminGuard` component checks authentication
   - If not authenticated, shows login page

2. **User clicks "Sign In with Google":**
   - Redirects to `/api/auth/signin`
   - Redirects to Google OAuth consent screen

3. **User authorizes:**
   - Google redirects back to `/api/auth/callback`
   - Convex Auth handles the OAuth flow
   - User is created/updated in database
   - `isAdmin` is set to `true` if email matches `ADMIN_EMAIL`

4. **User is redirected to admin page:**
   - `AdminGuard` checks `isAdmin` status
   - If admin, shows admin panel
   - If not admin, shows "Access Denied"

## Security Notes

- ✅ Only your Gmail address can access the admin panel
- ✅ OAuth tokens are securely managed by Convex Auth
- ✅ Sessions are automatically managed
- ✅ Environment variables are stored securely in Convex

## Troubleshooting

### "Sign In" button doesn't work
- Check that `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set in Convex
- Verify redirect URI matches in Google Cloud Console

### "Access Denied" even with correct email
- Check that `ADMIN_EMAIL` is set correctly in Convex
- Verify email matches exactly (case-sensitive)
- Check that `createOrUpdateUser` mutation was called after sign-in

### OAuth callback fails
- Verify redirect URI in Google Cloud Console matches your domain
- Check that Google+ API is enabled
- Verify OAuth credentials are correct

## Next Steps

After setting up authentication:
1. Test the login flow
2. Verify only your Gmail can access admin
3. Deploy to production
4. Set production environment variables in Convex

