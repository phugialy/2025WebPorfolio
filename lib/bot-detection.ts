// Shared bot/crawler detection -- originally built for affiliate click
// logging (confirmed via real data: Meta's link-preview crawler was
// fetching outbound redirect URLs directly), now reused anywhere a
// user-agent-bearing signal feeds analytics or the rank_score formula.
const BOT_USER_AGENT_PATTERNS = [
  "bot", "crawler", "spider", "externalagent", "facebookexternalhit",
  "slurp", "duckduckbot", "baiduspider", "yandexbot", "semrushbot",
  "ahrefsbot", "mj12bot", "curl", "wget", "python-requests", "go-http-client",
  "headlesschrome", "phantomjs",
];

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // real browsers always send one
  const lower = userAgent.toLowerCase();
  return BOT_USER_AGENT_PATTERNS.some((pattern) => lower.includes(pattern));
}
