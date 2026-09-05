import { generateOpenRouterText } from "@/lib/openrouter";

export type GeneratedSeoMetadata = {
  metaDescription: string;
  seoKeywords: string[];
  keepReadingHook: string | null;
};

const SYSTEM_PROMPT = `You are an SEO editor for a technical blog about AI engineering, automation, and software systems. Your only job is to write metadata that helps the right reader find and click this specific article from a Google search results page -- not to summarize it for someone who's already reading it.

Rules:
- The meta description must be 140-160 characters, state the article's specific, concrete takeaway or finding, and never just restate the title.
- Write for someone typing a real search query, not someone browsing a feed -- informational search intent, not a teaser.
- No markdown, no headings, no quotation marks, no "Learn how..." filler openers.
- Keywords must be phrases that actually appear in the article -- do not invent adjacent terms that sound relevant but aren't in the text.
- If no natural short follow-up hook exists, omit it -- don't force one.

Return strict JSON with exactly these keys: "metaDescription" (string), "seoKeywords" (array of 3-6 strings), "keepReadingHook" (string or null). No text outside the JSON object.`;

/**
 * Truncates at the nearest sentence/clause boundary at or before maxLength,
 * instead of a raw character cutoff -- avoids the mid-word cuts ("...generati")
 * found in the original audit. Falls back to a word boundary if no
 * sentence-ending punctuation exists in range.
 */
function truncateAtBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const slice = text.slice(0, maxLength);
  const sentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  if (sentenceEnd > maxLength * 0.6) {
    return slice.slice(0, sentenceEnd + 1);
  }

  const wordEnd = slice.lastIndexOf(" ");
  return wordEnd > 0 ? slice.slice(0, wordEnd) : slice;
}

function stripMarkdownArtifacts(text: string): string {
  return text
    .replace(/^#+\s*/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^["']|["']$/g, "")
    .trim();
}

/**
 * One OpenRouter call, validated on the way back out -- never trusts the
 * model's own character count or keyword accuracy at face value.
 */
export async function generateSeoMetadata(article: {
  title: string;
  content: string;
  tags: string[];
}): Promise<GeneratedSeoMetadata | null> {
  const userMessage = [
    `Title: ${article.title}`,
    `Tags: ${article.tags.join(", ") || "(none)"}`,
    "",
    "Content:",
    article.content,
  ].join("\n");

  let result;
  try {
    result = await generateOpenRouterText([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);
  } catch (error) {
    console.error(`SEO generation failed for "${article.title}":`, error);
    return null;
  }

  let parsed: { metaDescription?: unknown; seoKeywords?: unknown; keepReadingHook?: unknown };
  try {
    // Models occasionally wrap JSON in a code fence despite instructions not to.
    const jsonText = result.content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    parsed = JSON.parse(jsonText);
  } catch (error) {
    console.error(`SEO generation returned invalid JSON for "${article.title}":`, error);
    return null;
  }

  if (typeof parsed.metaDescription !== "string" || !parsed.metaDescription.trim()) {
    console.error(`SEO generation returned no metaDescription for "${article.title}"`);
    return null;
  }

  const cleanedDescription = truncateAtBoundary(stripMarkdownArtifacts(parsed.metaDescription), 160);

  const contentLower = article.content.toLowerCase();
  const seoKeywords = (Array.isArray(parsed.seoKeywords) ? parsed.seoKeywords : [])
    .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
    .map((k) => k.trim())
    .filter((k) => contentLower.includes(k.toLowerCase()))
    .slice(0, 6);

  const keepReadingHook =
    typeof parsed.keepReadingHook === "string" && parsed.keepReadingHook.trim()
      ? stripMarkdownArtifacts(parsed.keepReadingHook)
      : null;

  return {
    metaDescription: cleanedDescription,
    seoKeywords,
    keepReadingHook,
  };
}
