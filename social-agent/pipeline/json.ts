// Local copy of the safeJson/clampScore pattern already proven in
// lib/content-agent-protocols.ts (that file's own `safeJson` + inline
// `clampScore`). Not imported directly from there because everything under
// /social-agent/ is only allowed to depend on ports.ts + plain TypeScript --
// never on anything under lib/ -- see /social-agent/README.md's dependency
// boundary rule. This mirrors that established behavior exactly: try to
// pull a fenced or bare JSON blob out of a model response, and on any parse
// failure return the caller's fallback untouched rather than throwing or
// guessing. Every pipeline step in this directory relies on this same
// discipline: a fallback must never look "ready to publish."

export function safeJson<T>(value: string, fallback: T): T {
  try {
    const fenced = value.match(/```json\s*([\s\S]*?)```/i)?.[1];
    const raw = fenced || value.match(/\{[\s\S]*\}/)?.[0] || value;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Clamp a possibly-missing/non-numeric model-supplied score into the 1-5 range used throughout this pipeline's contracts. */
export function clampScore(value: unknown, fallback = 3): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(5, Math.max(1, Math.round(number)));
}
