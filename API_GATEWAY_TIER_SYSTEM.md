# API Gateway & Tier System Architecture

## Overview

As your app grows, implementing an API gateway and tier system can help manage:
- **No-login users** (Guest/Anonymous)
- **Logged-in users** (Authenticated)
- **Admin users** (Administrators)

## Should You Use an API Gateway?

### Current Architecture
- **Frontend**: Next.js (Vercel)
- **Backend**: Convex (Database + Functions)
- **Auth**: NextAuth.js

### API Gateway Options

#### Option 1: **Next.js API Routes as Gateway** (Recommended for Now)
✅ **Pros:**
- Already built into Next.js
- No additional infrastructure
- Easy to implement rate limiting
- Can handle authentication/authorization
- Cost-effective (included with Vercel)

❌ **Cons:**
- Less flexible than dedicated gateway
- Limited advanced features

#### Option 2: **Dedicated API Gateway** (Future Consideration)
- **AWS API Gateway** - Enterprise-grade, pay-per-use
- **Kong** - Open-source, self-hosted
- **Cloudflare Workers** - Edge-based, global

**When to consider:**
- Multiple backend services
- Complex routing needs
- Advanced rate limiting
- API monetization
- High traffic (>100k requests/day)

### Recommendation

**Start with Next.js API Routes** - You can always migrate to a dedicated gateway later.

## Tier System Design

### User Tiers

1. **Guest (No-login)**
   - Limited read access
   - Basic features
   - Rate limited

2. **Authenticated (Logged-in)**
   - Full read access
   - Personalization
   - Higher rate limits
   - Save preferences

3. **Admin**
   - Full access
   - Manage content
   - No rate limits

### Implementation Strategy

#### 1. User Tier Management in Convex

```typescript
// convex/schema.ts
users: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  tier: v.string(), // "guest" | "authenticated" | "admin"
  isAdmin: v.optional(v.boolean()),
  createdAt: v.number(),
})
```

#### 2. Rate Limiting Middleware

Create middleware to check user tier and apply rate limits:

```typescript
// middleware.ts
export function rateLimitByTier(tier: string) {
  const limits = {
    guest: { requests: 100, window: 60000 }, // 100/min
    authenticated: { requests: 1000, window: 60000 }, // 1000/min
    admin: { requests: Infinity, window: 60000 },
  };
  return limits[tier] || limits.guest;
}
```

#### 3. API Route Protection

Protect API routes based on tier:

```typescript
// app/api/protected/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  const tier = session?.user ? "authenticated" : "guest";
  
  // Check rate limit
  // Apply tier-based access
}
```

## Implementation Plan

### Phase 1: Basic Tier System (Current)
- ✅ Admin authentication (NextAuth.js)
- ✅ Guest access (no auth required)
- ⏳ Rate limiting per tier

### Phase 2: Enhanced Tier System
- User registration/login
- Tier-based feature access
- Rate limiting middleware
- Usage tracking

### Phase 3: API Gateway (If Needed)
- Centralized API routing
- Advanced rate limiting
- Analytics and monitoring
- API versioning

## Next Steps

1. **Fix NextAuth.js error** (add AUTH_SECRET)
2. **Implement basic tier system** in Convex
3. **Add rate limiting** middleware
4. **Monitor usage** to decide if dedicated gateway needed

