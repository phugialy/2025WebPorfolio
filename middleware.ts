import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Middleware for rate limiting and tier-based access control
 */
export async function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip auth routes (handled by NextAuth)
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  try {
    // Get user session
    const session = await auth();

    // Determine user tier
    const isAuthenticated = !!session?.user;
    const isAdmin = session?.user?.isAdmin || false;
    const tier = isAdmin ? "admin" : isAuthenticated ? "authenticated" : "guest";

    // Add tier to request headers for API routes to use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-tier", tier);
    requestHeaders.set("x-user-email", session?.user?.email || "guest");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // If auth check fails, treat as guest
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-tier", "guest");
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

