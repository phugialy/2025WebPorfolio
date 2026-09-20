// Platform Writer step -- one function per platform, each with its own
// distinct system prompt, per the research doc's "Best practices" section:
// "One writer prompt per platform, not one generic prompt with a platform
// parameter -- IG/LinkedIn/X conventions differ enough that native copy
// requires native prompts."
//
// Follows the strict-JSON-contract + parse-with-fallback pattern already
// proven in lib/content-agent-protocols.ts (its `safeJson`-style Writer
// Agent handling): try to parse, and on any parse failure or empty result,
// return a fallback with `readyForReview: false` -- this is NOT treated as
// a usable draft anywhere downstream (guardrail.ts auto-rejects it without
// even calling the LLM; the state machine routes it straight to
// "rejected"). That mirrors content-agent-protocols.ts's own documented
// incident: a truncated/malformed model response must never be silently
// handed on as if it were real content.

import type { LLM } from "../ports";
import { safeJson } from "./json";
import type { ContentBrief, PlatformDraft, SocialBrandProfile, SocialPlatformName } from "./types";

type WriterInput = {
  brief: ContentBrief;
  brandProfile?: SocialBrandProfile;
  llm: LLM;
  model?: string;
};

type RawWriterOutput = {
  text?: string;
  hashtags?: string[];
  disclosurePresent?: boolean;
};

async function runPlatformWriter(
  platform: SocialPlatformName,
  systemPrompt: string,
  input: WriterInput
): Promise<PlatformDraft> {
  const fallback: PlatformDraft = {
    platform,
    text: "",
    hashtags: [],
    disclosurePresent: false,
    readyForReview: false,
  };

  const result = await input.llm.generateText(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Content brief:
${JSON.stringify(input.brief, null, 2)}

Brand profile:
${JSON.stringify(input.brandProfile ?? { note: "no brand profile on file -- use a neutral, practical voice" }, null, 2)}

Return only JSON matching this shape:
{"text": "the platform-native post copy", "hashtags": ["string", "..."], "disclosurePresent": boolean}

Set "disclosurePresent" to true only if the copy you wrote actually contains a visible disclosure (e.g. "#ad", "Sponsored", "affiliate link") -- do not claim one is present if it isn't in "text".`,
      },
    ],
    { model: input.model }
  );

  const parsed = safeJson<RawWriterOutput | null>(result.content, null);
  if (!parsed || typeof parsed.text !== "string" || !parsed.text.trim()) {
    return fallback;
  }

  return {
    platform,
    text: parsed.text.trim(),
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((h): h is string => typeof h === "string" && h.trim().length > 0) : [],
    disclosurePresent: Boolean(parsed.disclosurePresent),
    readyForReview: true,
  };
}

const INSTAGRAM_SYSTEM_PROMPT = `You are the Instagram Platform Writer for a social media manager agent.

Instagram conventions this copy must follow:
- Visual-first: assume an accompanying image/video carries the primary message; the caption supports it, doesn't replace it.
- Hook in the first line -- Instagram truncates captions, so the reason to keep reading must be in the first ~1-2 sentences.
- Conversational, a little informal; short paragraphs or line breaks, not dense prose.
- 5-15 relevant hashtags at the end, mixed specificity (a couple of broad, several niche) -- never hashtag-stuff the body text itself.
- A clear call-to-action (comment, share, tap link in bio, etc.).
- If the content involves an affiliate/sponsored product, the disclosure (e.g. "#ad") must be visibly in the caption text itself, not just implied.`;

const FACEBOOK_SYSTEM_PROMPT = `You are the Facebook Platform Writer for a social media manager agent.

Facebook conventions this copy must follow:
- Slightly longer-form and more conversational than Instagram is fine; Facebook rewards context and community framing over pure punchiness.
- Write for an audience that may not have seen prior posts -- don't assume continuity.
- Minimal hashtags (0-2 at most); Facebook engagement doesn't reward hashtag stuffing the way Instagram does.
- Native links are fine and often the point -- Facebook is comfortable driving off-platform traffic, unlike Instagram's link-in-bio constraint.
- If the content involves an affiliate/sponsored product, the disclosure must be visibly in the post text itself.`;

const LINKEDIN_SYSTEM_PROMPT = `You are the LinkedIn Platform Writer for a social media manager agent, writing on behalf of a company page (organization-authored post).

LinkedIn conventions this copy must follow:
- Professional register throughout -- no emoji spam, no hype language, no clickbait framing.
- Thought-leadership / practical-insight framing: what changed, why it matters to a professional audience, what to do about it.
- Short paragraphs (1-3 sentences each) with real line breaks for scannability -- LinkedIn's feed rewards this over a wall of text.
- At most 3-5 hashtags, placed at the end, all directly relevant to the professional topic -- never generic engagement-bait hashtags.
- No direct pricing/terms commitments in the post copy itself.
- If the content involves an affiliate/sponsored product, the disclosure must be visibly in the post text itself, phrased professionally (e.g. "Disclosure: ...").`;

const X_SYSTEM_PROMPT = `You are the X (Twitter) Platform Writer for a social media manager agent.

X conventions this copy must follow:
- Hard constraint: "text" must be 280 characters or fewer, including any hashtags -- this is not a style preference, it is a platform limit. Count characters before returning.
- Punchy, single clear point per post -- do not try to fit an entire argument in one post; pick the sharpest single idea from the brief.
- Sparse hashtags (0-2), only if they add real discoverability -- most strong X posts use zero.
- No thread numbering or "1/n" framing -- this step writes a single standalone post only.
- If the content involves an affiliate/sponsored product, the disclosure (e.g. "#ad") must be visibly within the 280-character text itself.`;

export function writeInstagramPost(input: WriterInput): Promise<PlatformDraft> {
  return runPlatformWriter("instagram", INSTAGRAM_SYSTEM_PROMPT, input);
}

export function writeFacebookPost(input: WriterInput): Promise<PlatformDraft> {
  return runPlatformWriter("facebook", FACEBOOK_SYSTEM_PROMPT, input);
}

export function writeLinkedInPost(input: WriterInput): Promise<PlatformDraft> {
  return runPlatformWriter("linkedin", LINKEDIN_SYSTEM_PROMPT, input);
}

export function writeXPost(input: WriterInput): Promise<PlatformDraft> {
  return runPlatformWriter("x", X_SYSTEM_PROMPT, input);
}

export const platformWriters: Record<SocialPlatformName, (input: WriterInput) => Promise<PlatformDraft>> = {
  instagram: writeInstagramPost,
  facebook: writeFacebookPost,
  linkedin: writeLinkedInPost,
  x: writeXPost,
};
