import type { PortfolioLane } from "@/lib/article-style";

export type { PortfolioLane };

export type LaneInfo = {
  value: PortfolioLane;
  slug: string;
  label: string;
  description: string;
  style: string;
};

export const LANES: LaneInfo[] = [
  {
    value: "AI Advancement",
    slug: "ai-advancement",
    label: "AI Advancement",
    description: "New models, research, and industry moves worth a practical read.",
    style: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  },
  {
    value: "Applied AI",
    slug: "applied-ai",
    label: "Applied AI",
    description: "Where AI actually lands in real software and operating decisions.",
    style: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  {
    value: "How-to-AI",
    slug: "how-to-ai",
    label: "How-to-AI",
    description: "Workflow notes and guides for putting AI tools to work.",
    style: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  },
  {
    value: "Vibe-coding / Codex",
    slug: "vibe-coding-codex",
    label: "Vibe-coding / Codex",
    description: "Agentic coding tools, Codex-style workflows, and what changes for builders.",
    style: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  },
  {
    value: "DFW Commercial Projects + Sales",
    slug: "dfw-commercial",
    label: "DFW Commercial Projects + Sales",
    description: "Commercial project and sales notes out of the DFW market.",
    style: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
];

const BY_SLUG = new Map(LANES.map((lane) => [lane.slug, lane]));
const BY_VALUE = new Map(LANES.map((lane) => [lane.value, lane]));

export function getLaneBySlug(slug: string): LaneInfo | undefined {
  return BY_SLUG.get(slug);
}

export function getLaneInfo(lane: PortfolioLane): LaneInfo {
  return BY_VALUE.get(lane) ?? LANES[0];
}

export function getLaneSlug(lane: PortfolioLane): string {
  return getLaneInfo(lane).slug;
}

/**
 * Shared keyword-fallback lane inference -- used both for display
 * (getArticleLane in article-news-card.tsx) and by the affiliate matcher.
 * The matcher previously read the raw portfolio_lane column directly,
 * which is only set on ~8% of published articles, so its lane-match
 * scoring bonus (the single richest signal, worth more than an exact tag
 * match) was structurally dead for the other 92%.
 */
export function inferPortfolioLane(
  explicitLane: string | null | undefined,
  tags: string[] | null | undefined,
  title: string
): PortfolioLane {
  if (explicitLane && BY_VALUE.has(explicitLane as PortfolioLane)) {
    return explicitLane as PortfolioLane;
  }

  const tagText = (tags || []).join(" ").toLowerCase();
  const titleText = title.toLowerCase();
  const combined = `${tagText} ${titleText}`;

  if (combined.includes("dfw") || combined.includes("sales") || combined.includes("commercial")) {
    return "DFW Commercial Projects + Sales";
  }
  if (combined.includes("codex") || combined.includes("vibe") || combined.includes("agent")) {
    return "Vibe-coding / Codex";
  }
  if (combined.includes("how") || combined.includes("guide") || combined.includes("workflow")) {
    return "How-to-AI";
  }
  if (combined.includes("automation") || combined.includes("applied")) {
    return "Applied AI";
  }

  return "AI Advancement";
}
