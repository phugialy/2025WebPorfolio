# Multiple Admin Emails Setup

## Overview

You can now set up multiple admin emails for your application. Both `phu.lyg@gmail.com` and `bigpstudio@gmail.com` can be admins.

## How to Set Up Multiple Admin Emails

### Option 1: Using ADMIN_EMAILS (Recommended)

1. **Go to Convex Dashboard:**
   - Visit: https://dashboard.convex.dev
   - Select your project
   - Go to **Settings** → **Environment Variables**

2. **Add ADMIN_EMAILS variable:**
   - **Variable Name:** `ADMIN_EMAILS`
   - **Value:** `phu.lyg@gmail.com,bigpstudio@gmail.com`
   - **Important:** Use comma-separated list, no spaces around commas (or spaces will be trimmed automatically)

3. **Click "Save"**

### Option 2: Using ADMIN_EMAIL (Backward Compatible)

If you already have `ADMIN_EMAIL` set, you can keep it for a single admin, or switch to `ADMIN_EMAILS` for multiple admins.

## How It Works

1. **User signs in** with Google OAuth
2. **System checks** if their email is in the `ADMIN_EMAILS` list
3. **If email matches**, user is marked as admin (`isAdmin: true`)
4. **Admin status** is stored in the database for future checks

## Current Admin Emails

Based on your request, set `ADMIN_EMAILS` to:
```
phu.lyg@gmail.com,bigpstudio@gmail.com
```

## Manual Admin Assignment (Alternative)

If you want to manually set admin status for existing users:

1. **Go to Convex Dashboard**
2. **Open Data** tab
3. **Find the `users` table**
4. **Edit the user record:**
   - Set `isAdmin` to `true`
   - Set `tier` to `"admin"`

## Testing

After setting `ADMIN_EMAILS`:

1. **Sign out** if you're currently signed in
2. **Sign in** with `phu.lyg@gmail.com` or `bigpstudio@gmail.com`
3. **Visit** `/admin/projects`
4. **You should see** the admin panel (not "Access Denied")

## Troubleshooting

### Still seeing "Access Denied"?

1. **Check** that `ADMIN_EMAILS` is set correctly in Convex Dashboard
2. **Verify** the email matches exactly (case-insensitive, but check for typos)
3. **Sign out and sign in again** to refresh the admin status
4. **Wait a few minutes** after updating environment variables

### Email not in list?

If you need to add more admin emails later:
1. **Update** `ADMIN_EMAILS` in Convex Dashboard
2. **Add** the new email to the comma-separated list
3. **Save** and wait for changes to propagate
4. **User signs in** - they'll automatically get admin status

## Example Configuration

**Convex Dashboard → Environment Variables:**

| Variable Name | Value |
|--------------|-------|
| `ADMIN_EMAILS` | `phu.lyg@gmail.com,bigpstudio@gmail.com` |

**Note:** The system is case-insensitive, so `Phu.Lyg@Gmail.Com` will also work.

