# NextAuth.js Setup Guide

## Overview

We've switched from `@convex-dev/auth` to **NextAuth.js** (Auth.js) for a more reliable and well-documented authentication solution.

## How NextAuth.js Routes Work

NextAuth.js uses a **catch-all route** `[...nextauth]` that automatically handles ALL authentication routes:

### Routes Automatically Created by NextAuth.js:

1. **`/api/auth/signin`** - Sign in page
2. **`/api/auth/signout`** - Sign out endpoint
3. **`/api/auth/callback/google`** - OAuth callback (handles Google OAuth)
4. **`/api/auth/session`** - Get current session
5. **`/api/auth/csrf`** - CSRF token
6. **`/api/auth/providers`** - List available providers

All of these are handled by the single file: `app/api/auth/[...nextauth]/route.ts`

## Why We Switched

- ✅ **More Reliable**: NextAuth.js is production-ready and battle-tested
- ✅ **Better Documentation**: Extensive docs and examples
- ✅ **Easier Debugging**: Clear error messages
- ✅ **Still Integrates with Convex**: User management in Convex database

## Setup Steps

### 1. Environment Variables

Add to `.env.local`:

```bash
# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# NextAuth Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your-random-secret-key

# Convex
NEXT_PUBLIC_CONVEX_URL=your-convex-url
```

### 2. Google OAuth Redirect URI

In Google Cloud Console, set the redirect URI to:
```
http://localhost:3000/api/auth/callback/google
```

For production:
```
https://your-domain.com/api/auth/callback/google
```

### 3. Convex Environment Variables

In Convex Dashboard → Settings → Environment Variables:
- `ADMIN_EMAIL`: Your Gmail address (e.g., `yourname@gmail.com`)

## How It Works

1. **User clicks "Sign In with Google"**:
   - Calls `signIn("google")` from `next-auth/react`
   - NextAuth redirects to Google OAuth

2. **Google redirects back**:
   - To `/api/auth/callback/google`
   - NextAuth handles the OAuth flow
   - Calls `signIn` callback → Creates/updates user in Convex

3. **Session is created**:
   - NextAuth creates a session
   - Calls `session` callback → Gets admin status from Convex
   - User is redirected to admin page

4. **Admin Guard checks**:
   - Uses `useSession()` from `next-auth/react`
   - Checks `isAdmin` from Convex
   - Shows admin panel if admin

## File Structure

```
app/api/auth/
  └── [...nextauth]/
      └── route.ts          # Handles ALL auth routes

components/auth/
  ├── admin-guard.tsx       # Protects admin routes
  ├── login-button.tsx      # Sign in/out button
  └── session-provider.tsx  # Wraps app with SessionProvider

convex/
  └── users.ts              # User management functions
```

## Testing

1. Start dev server:
   ```bash
   pnpm dev
   ```

2. Visit admin page:
   ```
   http://localhost:3000/admin/projects
   ```

3. Click "Sign In with Google"

4. After sign-in, you should see the admin panel (if your email matches `ADMIN_EMAIL`)

## Troubleshooting

### "Sign In" button doesn't work
- Check that `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set in `.env.local`
- Verify redirect URI in Google Cloud Console matches `/api/auth/callback/google`

### "Access Denied" even with correct email
- Check that `ADMIN_EMAIL` is set correctly in Convex Dashboard
- Verify email matches exactly (case-sensitive)

### OAuth callback fails
- Verify redirect URI in Google Cloud Console
- Check that `AUTH_SECRET` is set in `.env.local`
- Check browser console and server logs for errors

