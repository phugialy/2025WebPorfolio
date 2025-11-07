/**
 * API Gateway Route
 * 
 * Centralized API gateway for routing requests to appropriate services
 * with authentication, authorization, and rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-service";
import { getRateLimitForTier } from "@/lib/rate-limit";

/**
 * Route mapping: gateway path → actual API route
 */
const ROUTE_MAP: Record<string, string> = {
  "github/repos": "/api/github/repos",
  "weather": "/api/weather",
  "blog/ingest": "/api/blog/ingest",
};

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = ["github/repos", "weather"];

/**
 * Routes that require admin access
 */
const ADMIN_ROUTES: string[] = []; // Add routes that need admin here

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleGatewayRequest(request, resolvedParams, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleGatewayRequest(request, resolvedParams, "POST");
}

async function handleGatewayRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const path = params.path.join("/");
    
    // Check if route exists
    const targetRoute = ROUTE_MAP[path];
    if (!targetRoute) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    // Get auth context
    const authContext = await getAuthContext();

    // Check if route requires authentication
    if (PROTECTED_ROUTES.includes(path) && !authContext.isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    // Check if route requires admin
    if (ADMIN_ROUTES.includes(path) && !authContext.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Get rate limit for user tier
    const rateLimit = getRateLimitForTier(authContext.tier);
    
    // TODO: Implement rate limiting check here
    // For now, we'll just forward the request
    
    // Forward request to actual API route
    const url = new URL(request.url);
    url.pathname = targetRoute;
    
    // Forward the request
    const response = await fetch(url.toString(), {
      method: method,
      headers: request.headers,
      body: method !== "GET" ? await request.text() : undefined,
    });

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "x-user-tier": authContext.tier,
        "x-rate-limit": rateLimit.requests.toString(),
      },
    });
  } catch (error) {
    console.error("Gateway error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

