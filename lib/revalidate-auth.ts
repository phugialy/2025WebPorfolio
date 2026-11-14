// Who may ask the site to clear its article caches (POST /api/revalidate). Kept out
// of the route file because a Next route file may only export request handlers.
export function isAuthorizedRevalidate(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const keys = [env.BLOG_INGEST_API_KEY, env.CRON_SECRET, env.BLOG_CRON_SECRET].filter((k): k is string => Boolean(k));
  if (keys.length === 0) return false;
  const bearer = request.headers.get("authorization");
  const apiKey = request.headers.get("x-api-key");
  return keys.some((key) => apiKey === key || bearer === `Bearer ${key}`);
}
