// Signal scan step -- cheap-model-scored RSS/GSC deltas into `social_signals`,
// plus the manual operator-injection path from the research doc's "External
// review" section (weakness #1's mitigation): "Add a
// `social_signals.source = 'operator'` row type the Strategist reads exactly
// like any other signal." That's implemented literally here -- both paths
// write the same SocialSignal shape into the same collection; the
// Strategist step (strategist.ts) never branches on `source`.

import type { LLM, Store } from "../ports";
import { safeJson, clampScore } from "./json";
import type { SocialSignal, SocialSignalSource } from "./types";

const SIGNAL_SCAN_SYSTEM_PROMPT = `You are the Signal Scan step of a social media manager agent's intelligence pipeline. Your only job is to judge how worth posting about a single candidate topic is for this brand's social channels -- you do not write copy and you do not decide what to post, only how relevant this one candidate is.

Score conservatively. A generic, low-signal, or already-stale topic should score low. A topic with a real, current hook (a query showing real search demand, a fresh RSS item with a concrete angle) scores higher. Never invent facts about the candidate beyond what's given.`;

export type RawSignalCandidate = {
  source: Exclude<SocialSignalSource, "operator">;
  keyword: string;
  raw?: unknown;
};

export type SignalScoreVerdict = {
  score: number;
  relevant: boolean;
  reasoning?: string;
};

/** Scores one candidate. Exported separately from scanSignals so the scoring logic and its parse-failure fallback are independently unit-testable. */
export async function scoreSignalCandidate(
  llm: LLM,
  candidate: RawSignalCandidate,
  opts?: { model?: string }
): Promise<SignalScoreVerdict> {
  const fallback: SignalScoreVerdict = {
    score: 1,
    relevant: false,
    reasoning: "Signal-scan model response failed to parse -- defaulted to low relevance rather than guessing.",
  };

  const result = await llm.generateText(
    [
      { role: "system", content: SIGNAL_SCAN_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Candidate source: ${candidate.source}
Candidate keyword/topic: ${candidate.keyword}
${candidate.raw !== undefined ? `Additional context: ${JSON.stringify(candidate.raw).slice(0, 2000)}` : ""}

Return only JSON matching this shape:
{"score": 1-5, "relevant": boolean, "reasoning": "one sentence"}`,
      },
    ],
    opts
  );

  const parsed = safeJson<Partial<SignalScoreVerdict> | null>(result.content, null);
  if (!parsed) return fallback;

  const score = clampScore(parsed.score, fallback.score);
  return {
    score,
    relevant: typeof parsed.relevant === "boolean" ? parsed.relevant : score >= 3,
    reasoning: parsed.reasoning || fallback.reasoning,
  };
}

/**
 * Scans a batch of raw RSS/GSC candidates, scores each independently, and
 * writes every scored row into `social_signals`. One bad candidate or one
 * failed LLM call doesn't stop the rest -- same per-step isolation
 * discipline as gsc-diagnostics' 3 independent property-format attempts.
 */
export async function scanSignals(params: {
  accountId: string;
  store: Store;
  llm: LLM;
  candidates: RawSignalCandidate[];
  model?: string;
  now?: () => string;
  idGenerator?: () => string;
}): Promise<{ written: SocialSignal[]; failed: number }> {
  const now = params.now ?? (() => new Date().toISOString());
  const nextId = params.idGenerator ?? defaultIdGenerator;
  const written: SocialSignal[] = [];
  let failed = 0;

  for (const candidate of params.candidates) {
    try {
      const verdict = await scoreSignalCandidate(params.llm, candidate, { model: params.model });
      const row = await params.store.insert<SocialSignal>("social_signals", {
        id: nextId(),
        accountId: params.accountId,
        source: candidate.source,
        keyword: candidate.keyword,
        score: verdict.score,
        raw: candidate.raw !== undefined ? { input: candidate.raw, reasoning: verdict.reasoning } : { reasoning: verdict.reasoning },
        createdAt: now(),
      });
      written.push(row);
    } catch {
      failed += 1;
    }
  }

  return { written, failed };
}

/**
 * Manual signal-injection path. An operator-curated signal is written
 * directly -- no LLM scoring call -- because the operator already knows
 * it's worth posting about; it defaults to a high score so it competes
 * fairly with strong RSS/GSC signals in the Strategist's ranking, but
 * doesn't outrank a genuinely stronger signal if one is passed explicitly.
 */
export async function injectOperatorSignal(params: {
  accountId: string;
  store: Store;
  keyword: string;
  note?: string;
  score?: number;
  now?: () => string;
  idGenerator?: () => string;
}): Promise<SocialSignal> {
  const now = params.now ?? (() => new Date().toISOString());
  const nextId = params.idGenerator ?? defaultIdGenerator;

  return params.store.insert<SocialSignal>("social_signals", {
    id: nextId(),
    accountId: params.accountId,
    source: "operator",
    keyword: params.keyword,
    score: clampScore(params.score, 5),
    raw: params.note ? { note: params.note } : undefined,
    createdAt: now(),
  });
}

function defaultIdGenerator(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
