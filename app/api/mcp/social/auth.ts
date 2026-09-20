// Auth for the social-agent MCP server (app/api/mcp/social/route.ts).
//
// Hippo-Assist is an external service calling in over HTTP, not a browser
// session (so the admin Google-auth gate, lib/admin-auth.ts's
// requireAdminSession, doesn't apply -- there's no session to read) and not
// a scheduled cron job (so app/social-agent-adapters/auth-gate.ts's
// createCronAuthGate, which reuses CRON_SECRET, doesn't apply either -- this
// is a different caller with a different trust boundary: CRON_SECRET
// authorizes this project's own GitHub Actions workflows to *drive the
// pipeline*, not an external conversational agent to *read/write on the
// operator's behalf*. Reusing it here would mean a leak of either secret
// grants the other's access).
//
// SOCIAL_MCP_API_KEY is a new, distinct secret for exactly this front door.
// Shape mirrors lib/article-automation.ts's `isAuthorizedCronRequest` for
// consistency (bearer header or x-api-key header; fails open only outside
// production, same as that function) -- but is its own standalone check
// against its own env var, not a wrapper around the cron one.
export function isAuthorizedSocialMcpRequest(request: Request): boolean {
  const apiKey = process.env.SOCIAL_MCP_API_KEY;
  if (!apiKey) {
    return process.env.NODE_ENV !== "production";
  }

  const auth = request.headers.get("authorization");
  const headerApiKey = request.headers.get("x-api-key");
  return auth === `Bearer ${apiKey}` || headerApiKey === apiKey;
}
