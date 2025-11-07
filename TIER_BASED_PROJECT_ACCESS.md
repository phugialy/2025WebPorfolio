# Tier-Based Project Access Control

## Overview

Implemented tier-based access control for the work/projects page to ensure:
- **Guest users (no-login)**: Can see projects but NO buttons
- **Featured projects**: Only show "View Demo" button, NO repo button (even for admins)
- **Authenticated/Admin users**: See all buttons (except featured projects which only show demo)

## Implementation

### User Tiers

1. **Guest (no-login tier)**
   - Can see all projects
   - NO buttons displayed
   - Read-only access

2. **Authenticated (logged-in users)**
   - Can see all projects
   - See all buttons (View Repo, View Demo, View Case Study, etc.)
   - Full interactive access

3. **Admin**
   - Can see all projects
   - See all buttons (same as authenticated)
   - Full access to admin panel

### Featured Projects Special Rules

- **Featured projects**: Only show "View Demo" button
- **NO repo button** (even for admins)
- This applies to all featured projects regardless of user tier

## Files Modified

### 1. `app/work/work-page-content.tsx`
- Added `useSession` from `next-auth/react` to get user session
- Added `useQuery` to check admin status from Convex
- Determines user tier: `guest`, `authenticated`, or `admin`
- Passes `userTier` prop to all project card components

### 2. `components/work/enhanced-project-card.tsx`
- Added `userTier` prop
- Guest users: No buttons displayed (`showButtons = false`)
- Authenticated/Admin users: All buttons displayed

### 3. `components/work/featured-project-card.tsx`
- Added `userTier` prop
- Guest users: No buttons displayed
- Authenticated/Admin users: Only "View Demo" button (NO repo button)
- Removed repo button completely for featured projects

## How It Works

### Guest Users (No Login)
```
✅ Can see: Project title, description, tags, year, type
❌ Cannot see: Any buttons (View Repo, View Demo, etc.)
```

### Authenticated Users
```
✅ Can see: All project information
✅ Can see: All buttons (View Repo, View Demo, View Case Study, etc.)
```

### Admin Users
```
✅ Can see: All project information
✅ Can see: All buttons (same as authenticated)
✅ Can access: Admin panel at /admin/projects
```

### Featured Projects (All Users)
```
✅ Can see: Project information
✅ Can see: "View Demo" button (if authenticated/admin)
❌ Cannot see: "View Repo" button (even for admins)
```

## Testing

### Test as Guest (No Login)
1. Visit `/work` without logging in
2. Should see all projects
3. Should see NO buttons on any project cards

### Test as Authenticated User
1. Log in with Google OAuth
2. Visit `/work`
3. Should see all projects
4. Should see all buttons (except featured projects which only show "View Demo")

### Test as Admin
1. Log in with admin email
2. Visit `/work`
3. Should see all projects
4. Should see all buttons (except featured projects which only show "View Demo")
5. Should be able to access `/admin/projects`

## Benefits

1. **Privacy**: Guest users can browse projects without seeing sensitive links
2. **Security**: Repo links are hidden from non-authenticated users
3. **Featured Projects**: Special treatment - only demo links, no repo access
4. **Flexibility**: Easy to adjust tier-based access in the future

## Future Enhancements

- Add "Sign in to view links" message for guest users
- Add analytics to track which tier views which projects
- Add tier-based project filtering (e.g., show more projects to authenticated users)

