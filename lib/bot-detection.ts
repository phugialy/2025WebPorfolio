// Shared bot/crawler detection -- originally built for affiliate click
// logging (confirmed via real data: Meta's link-preview crawler was
// fetching outbound redirect URLs directly), now reused anywhere a
// user-agent-bearing signal feeds analytics or the rank_score formula.
//
// "externalagent" alone never matched anything real -- Meta's crawler
// identifies as "meta-externalagent" (confirmed via a live click row).
// Note: the same crawler also fires a much larger volume of requests with no
// identifying token at all (plain rotating desktop UAs, null referrer) --
// those aren't fixable by substring matching and are a known remaining gap.
const BOT_USER_AGENT_PATTERNS = [
  "bot", "crawler", "spider", "externalagent", "meta-externalagent",
  "facebookexternalhit", "slurp", "duckduckbot", "baiduspider", "yandexbot",
  "semrushbot", "ahrefsbot", "mj12bot", "curl", "wget", "python-requests",
  "go-http-client", "headlesschrome", "phantomjs",
];

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // real browsers always send one
  const lower = userAgent.toLowerCase();
  return BOT_USER_AGENT_PATTERNS.some((pattern) => lower.includes(pattern));
}
