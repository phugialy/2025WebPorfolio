/**
 * Authentication Service Layer
 * 
 * Centralized authentication logic for API routes and server components
 * This acts as the "Auth Service" in the API Gateway architecture
 */

import { auth } from "@/lib/auth";

export type UserTier = "guest" | "authenticated" | "admin";

export interface AuthUser {
  email: string;
  name?: string;
  image?: string;
  isAdmin: boolean;
  tier: UserTier;
}

export interface AuthContext {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  tier: UserTier;
}

/**
 * Get authentication context for API routes and server components
 * This is the core "Auth Service" function
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth();
  
  if (!session?.user?.email) {
    return {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      tier: "guest",
    };
  }

  // Admin status is already computed by lib/auth.ts's session callback
  // (ADMIN_EMAIL comparison) -- re-querying it here was redundant and, worse,
  // a second source of truth that could drift from the real one.
  const isAdmin = Boolean(session.user.isAdmin);
  const tier: UserTier = isAdmin ? "admin" : "authenticated";

  return {
    user: {
      email: session.user.email,
      name: session.user.name || undefined,
      image: session.user.image || undefined,
      isAdmin,
      tier,
    },
    isAuthenticated: true,
    isAdmin,
    tier,
  };
}

/**
 * Require authentication - throws error if not authenticated
 * Use in API routes that require login
 */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();
  
  if (!context.isAuthenticated) {
    throw new Error("Unauthorized: Authentication required");
  }
  
  return context;
}

/**
 * Require admin access - throws error if not admin
 * Use in API routes that require admin privileges
 */
export async function requireAdmin(): Promise<AuthContext> {
  const context = await requireAuth();
  
  if (!context.isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
  
  return context;
}

/**
 * Check if user has access to a specific tier
 */
export async function requireTier(
  requiredTier: UserTier
): Promise<AuthContext> {
  const context = await getAuthContext();
  
  const tierHierarchy: Record<UserTier, number> = {
    guest: 0,
    authenticated: 1,
    admin: 2,
  };

  const userTierLevel = tierHierarchy[context.tier];
  const requiredTierLevel = tierHierarchy[requiredTier];

  if (userTierLevel < requiredTierLevel) {
    throw new Error(
      `Forbidden: ${requiredTier} tier required, but user is ${context.tier}`
    );
  }

  return context;
}

