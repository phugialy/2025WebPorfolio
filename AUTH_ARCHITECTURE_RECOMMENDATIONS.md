# Authentication Architecture & API Gateway Recommendations

## Current Implementation Analysis

### Current Login Flow

**Current Approach: Inline Login (AdminGuard)**
- ✅ Login UI is embedded in `/admin/projects` page
- ✅ `AdminGuard` component handles authentication check
- ✅ Shows "Sign In with Google" button directly on admin page
- ✅ No separate `/login` route

**Pros:**
- Simple and straightforward
- No extra page to maintain
- User stays on the page they wanted to access
- Good for single admin use case

**Cons:**
- Login UI is mixed with page content
- Navigation bar still visible (could be confusing)
- Less flexible if you need multiple login entry points
- Not ideal if you want a dedicated login experience

## Recommendation: Separate Login Page

### Why a Separate Login Page is Better

1. **Better UX**: Clean, focused login experience
2. **Scalability**: Can handle multiple protected routes
3. **Flexibility**: Can add multiple auth providers later
4. **Professional**: Standard pattern users expect
5. **SEO**: Can be indexed separately if needed

### Implementation Plan

#### Option 1: Dedicated `/login` Page (Recommended)

```typescript
// app/login/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/projects";

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push(callbackUrl);
    }
  }, [session, status, callbackUrl, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to access the admin panel
          </p>
        </div>
        <Button
          onClick={() => signIn("google", { callbackUrl })}
          size="lg"
          className="w-full"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Sign In with Google
        </Button>
      </div>
    </div>
  );
}
```

#### Option 2: NextAuth.js Built-in Login Page

NextAuth.js can generate a login page automatically. Update config:

```typescript
// app/api/auth/[...nextauth]/route.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  // ... existing config ...
  pages: {
    signIn: "/login",  // Custom login page
    error: "/login",   // Error page
  },
});
```

Then redirect from `AdminGuard`:

```typescript
// components/auth/admin-guard.tsx
if (!session || !session.user) {
  router.push(`/login?callbackUrl=${encodeURIComponent("/admin/projects")}`);
  return null;
}
```

## API Gateway Architecture with Auth Service

### Recommended Architecture

```
┌─────────────────┐
│   Frontend       │
│   (Next.js)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │ ◄─── Auth Service (NextAuth.js)
│  (Next.js API)  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Convex │ │ Other  │
│  DB    │ │Services│
└────────┘ └────────┘
```

### Auth as a Service Layer

**Current Setup:**
- ✅ NextAuth.js handles authentication
- ✅ Convex stores user data
- ✅ `AdminGuard` protects routes

**Recommended Enhancement: Auth Service Layer**

```typescript
// lib/auth-service.ts
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface AuthContext {
  user: {
    email: string;
    name?: string;
    image?: string;
    isAdmin: boolean;
    tier: "guest" | "authenticated" | "admin";
  } | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * Get authentication context for API routes
 * This is the "Auth Service" layer
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth();
  
  if (!session?.user?.email) {
    return {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
    };
  }

  // Get user tier and admin status from Convex
  const isAdmin = await convex.query(api.users.isAdmin, {
    email: session.user.email,
  });

  const tier = isAdmin ? "admin" : "authenticated";

  return {
    user: {
      email: session.user.email,
      name: session.user.name || undefined,
      image: session.user.image || undefined,
      isAdmin: isAdmin || false,
      tier,
    },
    isAuthenticated: true,
    isAdmin: isAdmin || false,
  };
}

/**
 * Protect API route with authentication
 */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();
  
  if (!context.isAuthenticated) {
    throw new Error("Unauthorized");
  }
  
  return context;
}

/**
 * Protect API route with admin access
 */
export async function requireAdmin(): Promise<AuthContext> {
  const context = await requireAuth();
  
  if (!context.isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
  
  return context;
}
```

### API Gateway with Auth Integration

```typescript
// app/api/gateway/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireAdmin } from "@/lib/auth-service";
import { getRateLimitForTier } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 1. Get auth context (Auth Service)
    const authContext = await getAuthContext();
    
    // 2. Check rate limiting based on tier
    const rateLimit = getRateLimitForTier(authContext.user?.tier || "guest");
    // ... implement rate limiting ...
    
    // 3. Route to appropriate service based on path
    const path = params.path.join("/");
    
    if (path.startsWith("admin/")) {
      // Require admin access
      await requireAdmin();
      // Route to admin services
    } else if (path.startsWith("protected/")) {
      // Require authentication
      await requireAuth();
      // Route to protected services
    } else {
      // Public route
      // Route to public services
    }
    
    // 4. Forward request to backend (Convex, etc.)
    // ... implementation ...
    
    return NextResponse.json({ data: "..." });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      if (error.message.includes("Forbidden")) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

## Implementation Priority

### Phase 1: Separate Login Page (Now)
1. ✅ Create `/login` page
2. ✅ Update `AdminGuard` to redirect to `/login`
3. ✅ Update NextAuth config to use `/login`
4. ✅ Test login flow

### Phase 2: Auth Service Layer (Next)
1. ✅ Create `lib/auth-service.ts`
2. ✅ Refactor API routes to use auth service
3. ✅ Add rate limiting middleware
4. ✅ Test tier-based access

### Phase 3: API Gateway (Future)
1. ⏳ Create centralized API gateway
2. ⏳ Implement service routing
3. ⏳ Add monitoring and analytics
4. ⏳ Consider dedicated gateway (AWS, Kong, etc.) if needed

## Summary

### Login Page: ✅ **YES, Create Separate `/login` Page**

**Benefits:**
- Better UX
- More scalable
- Standard pattern
- Easier to maintain

### API Gateway with Auth Service: ✅ **YES, Plan for It**

**Benefits:**
- Centralized authentication
- Consistent access control
- Easier to add new services
- Better monitoring and rate limiting

**Current Status:**
- ✅ Auth is working (NextAuth.js)
- ✅ User management in Convex
- ⏳ Need separate login page
- ⏳ Need auth service layer
- ⏳ Need API gateway structure

