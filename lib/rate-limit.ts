/**
 * Rate limiting utilities for tier-based access control
 */

export type UserTier = "guest" | "authenticated" | "admin";

export interface RateLimitConfig {
  requests: number;
  window: number; // in milliseconds
}

export const TIER_RATE_LIMITS: Record<UserTier, RateLimitConfig> = {
  guest: {
    requests: 100, // 100 requests
    window: 60000, // per minute
  },
  authenticated: {
    requests: 1000, // 1000 requests
    window: 60000, // per minute
  },
  admin: {
    requests: Infinity, // unlimited
    window: 60000,
  },
};

/**
 * Get rate limit configuration for a user tier
 */
export function getRateLimitForTier(tier: UserTier): RateLimitConfig {
  return TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS.guest;
}

/**
 * Determine user tier from session
 */
export function getUserTier(isAuthenticated: boolean, isAdmin: boolean): UserTier {
  if (isAdmin) return "admin";
  if (isAuthenticated) return "authenticated";
  return "guest";
}

