import type { PortfolioLane } from "@/lib/article-style";
import { articleImageSystemPrompt, articleSystemPrompt } from "@/lib/article-style";
import { generateOpenRouterText } from "@/lib/openrouter";

export type ContentMode = "article" | "deep_article" | "paper";
export type EvidenceLevel = "internal" | "retrieved" | "inferred";

export type SourceSummary = {
  url: string;
  sourceName: string;
  title: string;
  summary: string;
  publishedAt?: string;
};

export type ResearchRequest = {
  userIntent: string;
  topic: string;
  targetAudience: string;
  geography?: string;
  timeframe: string;
  freshnessRequired: boolean;
  researchType: string;
  contentMode: ContentMode;
  portfolioLane: PortfolioLane;
  userAngle?: string;
  searchQueries: string[];
  suggestedSourceTypes: string[];
  imageSeedDirection: string;
};

export type SourceEvaluation = {
  title: string;
  url: string;
  publisher: string;
  date?: string;
  sourceType: "primary" | "official" | "expert" | "media" | "community" | "commercial" | "low-trust";
  scores: {
    authority: number;
    recency: number;
    relevance: number;
    evidenceQuality: number;
    biasRisk: number;
    directness: number;
  };
  decision: "use" | "caution" | "reject";
  bestUse: string;
};

export type ResearchClaim = {
  claim: string;
  evidenceLevel: EvidenceLevel;
  sourceUrls: string[];
  evidenceStrength: "strong" | "medium" | "weak";
  confidence: "high" | "medium" | "low";
  notes?: string;
};

export type EvidenceDepth = {
  requiredLevel: "light" | "standard" | "strong" | "deep";
  sourceMinimum: number;
  sourceMixRequired: string[];
  rawDataNeeded: boolean;
  currentEvidenceScore: number;
  missingEvidence: string[];
  canProceed: boolean;
};

export type ReaderBridge = {
  readerPain: string;
  readerQuestion: string;
  whyTheyShouldCare: string;
  likelyMisunderstanding: string;
  familiarExample: string;
  practicalPayoff: string;
};

export type WriterHandoff = {
  recommendedTitle: string;
  portfolioLane: PortfolioLane;
  angle: string;
  audience: string;
  purpose: string;
  tone: string;
  contentMode: ContentMode;
  safeClaims: string[];
  riskyClaims: string[];
  readerBridge: ReaderBridge;
  practicalExample: string;
  riskSection: string;
  sourceLinks: string[];
  imageDirection: string;
};

export type ResearchBrief = {
  researchInterpretation: string;
  knowledgePolicy: {
    internalAllowedFor: string[];
    retrievalRequiredFor: string[];
    inferenceRules: string[];
  };
  sourceList: SourceEvaluation[];
  evidenceDepth: EvidenceDepth;
  keyClaims: ResearchClaim[];
  themeClusters: string[];
  contradictions: string[];
  missingEvidence: string[];
  inferredInsights: string[];
  writerHandoff: WriterHandoff;
};

export type WritingQualityScores = {
  clarity: number;
  relevance: number;
  structure: number;
  engagement: number;
  evidenceDepth: number;
  readerConnection: number;
  audienceFit: number;
  accuracy: number;
  usefulness: number;
  readability: number;
  styleConsistency: number;
  completion: number;
};

export type ArticleDraftPackage = {
  finalContent: {
    title: string;
    markdown: string;
    summary: string;
    tags: string[];
    portfolioLane: PortfolioLane;
  };
  deliveryNote: {
    readinessLevel: number;
    audience: string;
    purpose: string;
    tone: string;
    articleType?: string;
    readerEffect?: string;
    mainAngle: string;
    structureUsed: string;
    removedSections?: string[];
    knownCaveats: string[];
    suggestedImprovement: string;
    humanTouchApplied: string[];
  };
  qualityScores: WritingQualityScores;
  evidenceUse: {
    claimsUsed: string[];
    inferredPointsUsed: string[];
    sourceLinksUsed: string[];
    unsupportedClaimsAvoided: string[];
  };
};

export type CriticReview = {
  readinessLevel: number;
  decision: "accept" | "revise" | "reject";
  pass: string[];
  needsRevision: string[];
  topFixes: string[];
  unsupportedClaims: string[];
  overclaims: string[];
  genericAiPhrases: string[];
  readerExperienceNotes: string[];
  evidenceDepthNotes: string[];
  readerConnectionNotes: string[];
  researchFaithfulness: {
    score: number;
    notes: string;
  };
  writingQualityScores: WritingQualityScores;
};

export type RevisionPass = {
  passNumber: 1 | 2;
  reason: string;
  criticDecision: "revise" | "reject";
  fixesApplied: string[];
  remainingIssues: string[];
};

export type ImageBrief = {
  articleTitle: string;
  portfolioLane: PortfolioLane;
  audience: string;
  articleAngle: string;
  readerTakeaway: string;
  imageStrategy: "thumbnail-only" | "thumbnail-plus-explainer" | "full-editorial-set";
  images: Array<{
    role: "main thumbnail" | "inside paper visual" | "closing highlight visual";
    purpose: "attract" | "explain" | "clarify" | "compare" | "anchor" | "localize";
    sectionTarget?: string;
    concept: string;
    visualMetaphor: string;
    mustShow: string[];
    mustAvoid: string[];
    prompt: string;
    alt: string;
    caption: string;
  }>;
  editorialRisks: string[];
};

const humanTouchProfile = `Default Human Touch Profile:
- Practical software and automation engineer.
- Skeptical of hype; interested in workflows, review gates, implementation, business value, and production readiness.
- Use first person when it adds grounded judgment.
- Include what I would test, what I would avoid, where I am cautious, and practical tradeoffs only when those sections fit the article type.
- For executive or critical-thinking pieces, human touch can be sharper judgment, a hidden business implication, or decision pressure instead of a hands-on checklist.
- Do not invent personal stories, fake vulnerability, or lived experience.
- Truth beats voice. Clarity beats cleverness. Reader usefulness beats style.`;

const editorialWritingSkills = `Editorial writing skills:
1. Comprehension: identify what the article is really about, the strongest idea, weak sections, and what does not belong.
2. Article type classifier: choose executive insight, critical thinking piece, business warning, technical explainer, practical guide, opinion/editorial, workflow tutorial, or strategic memo.
3. Perspective reframe: apply the right role lens such as CFO, founder, CTO, engineering manager, operations manager, business owner, investor, or local commercial operator.
4. Research trigger: research only when external facts are needed; do not research just to improve tone, structure, hook, or internal logic.
5. Editorial hook: create reader realization through tension, risk, cost, missed assumption, or decision pressure.
6. Structure freedom: remove or restructure sections that do not serve the article type, audience, or reader effect.
7. Transition and flow: use tension, contrast, escalation, consequence, and reader realization.
8. Critical thinking: surface the uncomfortable truth, hidden assumption, and "I have not thought about it that way" moment.`;

function safeJson<T>(value: string, fallback: T): T {
  try {
    const fenced = value.match(/```json\s*([\s\S]*?)```/i)?.[1];
    const raw = fenced || value.match(/\{[\s\S]*\}/)?.[0] || value;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function clampScore(value: unknown, fallback = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(5, Math.max(1, number));
}

function normalizeScores(scores?: Partial<WritingQualityScores>): WritingQualityScores {
  return {
    clarity: clampScore(scores?.clarity, 4),
    relevance: clampScore(scores?.relevance, 4),
    structure: clampScore(scores?.structure, 4),
    engagement: clampScore(scores?.engagement, 3),
    evidenceDepth: clampScore(scores?.evidenceDepth, 3),
    readerConnection: clampScore(scores?.readerConnection, 4),
    audienceFit: clampScore(scores?.audienceFit, 4),
    accuracy: clampScore(scores?.accuracy, 4),
    usefulness: clampScore(scores?.usefulness, 4),
    readability: clampScore(scores?.readability, 4),
    styleConsistency: clampScore(scores?.styleConsistency, 4),
    completion: clampScore(scores?.completion, 4),
  };
}

function evidenceDepthForMode(mode: ContentMode, sourceCount: number, freshnessRequired: boolean): EvidenceDepth {
  const sourceMinimum = mode === "paper" ? 8 : mode === "deep_article" ? 5 : 2;
  const requiredLevel = mode === "paper" ? "deep" : mode === "deep_article" ? "strong" : "standard";
  const missingEvidence = [];

  if (sourceCount < sourceMinimum) {
    missingEvidence.push(`Needs at least ${sourceMinimum} credible sources for ${mode}; only ${sourceCount} provided.`);
  }

  if (freshnessRequired && sourceCount < 2) {
    missingEvidence.push("Current/trending topic needs at least 2 recent retrieved sources.");
  }

  return {
    requiredLevel,
    sourceMinimum,
    sourceMixRequired:
      mode === "paper"
        ? ["primary or official sources", "expert analysis", "credible media or case examples", "contradictory/limitation evidence"]
        : ["official or expert source", "credible analysis", "practical example or case"],
    rawDataNeeded: mode === "paper" || freshnessRequired,
    currentEvidenceScore: sourceCount >= sourceMinimum ? 4 : sourceCount > 0 ? 2 : 1,
    missingEvidence,
    canProceed: sourceCount >= sourceMinimum || mode === "article",
  };
}

export function buildResearchRequest(input: {
  idea: string;
  notes: string;
  title: string;
  lane: PortfolioLane;
  imageDirection?: string;
  urls: string[];
  contentMode?: ContentMode;
}): ResearchRequest {
  const freshnessRequired = /trend|current|recent|latest|new|today|market|policy|platform|release|pricing|research/i.test(
    `${input.idea} ${input.notes} ${input.title}`
  );

  return {
    userIntent: input.idea || input.title,
    topic: input.title,
    targetAudience: "AI-curious business readers, software builders, and technical operators",
    timeframe: freshnessRequired ? "current or recent sources required" : "evergreen unless sources indicate recency",
    freshnessRequired,
    researchType: freshnessRequired ? "trend/topic research" : "topic/theme research",
    contentMode: input.contentMode || "article",
    portfolioLane: input.lane,
    userAngle: input.notes,
    searchQueries: [
      input.title,
      `${input.title} practical workflow`,
      `${input.title} engineering review`,
    ],
    suggestedSourceTypes: [
      "official docs",
      "engineering blogs",
      "release notes",
      "credible industry analysis",
      "practical case studies",
    ],
    imageSeedDirection: input.imageDirection || "Create a useful editorial technology visual tied to the article angle.",
  };
}

export async function generateResearchBrief(input: {
  request: ResearchRequest;
  sources: SourceSummary[];
}): Promise<ResearchBrief> {
  const fallback: ResearchBrief = {
    researchInterpretation: "Evidence is limited to provided source context. Treat this as an idea-led draft unless fresh sources are added.",
    knowledgePolicy: {
      internalAllowedFor: ["definitions", "frameworks", "stable concepts"],
      retrievalRequiredFor: ["current facts", "trends", "recent events", "product details"],
      inferenceRules: ["Label judgment as inference and do not present it as fact."],
    },
    sourceList: input.sources.map((source) => ({
      title: source.title,
      url: source.url,
      publisher: source.sourceName,
      date: source.publishedAt,
      sourceType: "media",
      scores: {
        authority: 3,
        recency: input.request.freshnessRequired ? 2 : 3,
        relevance: 3,
        evidenceQuality: 3,
        biasRisk: 3,
        directness: 3,
      },
      decision: "caution",
      bestUse: "Use as context only; verify before making strong claims.",
    })),
    evidenceDepth: evidenceDepthForMode(
      input.request.contentMode,
      input.sources.length,
      input.request.freshnessRequired
    ),
    keyClaims: [],
    themeClusters: [],
    contradictions: [],
    missingEvidence: input.request.freshnessRequired
      ? ["Fresh external retrieval is required before making trend/current claims."]
      : [],
    inferredInsights: [],
    writerHandoff: {
      recommendedTitle: input.request.topic,
      portfolioLane: input.request.portfolioLane,
      angle: input.request.userAngle || "Make the idea practical and evidence-aware.",
      audience: input.request.targetAudience,
      purpose: "Analyze and guide",
      tone: "clear, analytical, low-hype, practical",
      contentMode: input.request.contentMode,
      safeClaims: [],
      riskyClaims: ["Avoid broad adoption or prediction claims unless sources support them."],
      practicalExample: "Use a narrow workflow example with a human review step.",
      riskSection: "Discuss missing evidence, over-automation, weak source support, and verification limits.",
      sourceLinks: input.sources.map((source) => source.url),
      readerBridge: {
        readerPain: "The reader may see the topic as interesting but unclear in practical value.",
        readerQuestion: "What changes in my workflow or decision-making?",
        whyTheyShouldCare: "The article should translate the topic into a useful software, automation, or business implication.",
        likelyMisunderstanding: "The reader may mistake the topic for generic AI hype.",
        familiarExample: "Use a small workflow with a clear human review step.",
        practicalPayoff: "The reader should leave with one narrow test or decision they can apply.",
      },
      imageDirection: input.request.imageSeedDirection,
    },
  };

  const result = await generateOpenRouterText([
    { role: "system", content: articleSystemPrompt },
    {
      role: "user",
      content: `You are the Research Agent. You protect truth and do not write the article.

Use this protocol:
- Separate internal, retrieved, and inferred knowledge.
- If current/trending facts are needed and sources are incomplete, say so.
- Classify and score every source.
- Rate evidence depth and say if the article ambition exceeds the evidence.
- Extract claims with evidence strength and confidence.
- Build a reader bridge: reader pain, question, why they should care, likely misunderstanding, familiar example, and practical payoff.
- Never invent source titles, statistics, quotes, or findings.

Return only JSON matching this TypeScript shape:
{
  "researchInterpretation": "string",
  "knowledgePolicy": {
    "internalAllowedFor": ["string"],
    "retrievalRequiredFor": ["string"],
    "inferenceRules": ["string"]
  },
  "sourceList": [{
    "title": "string",
    "url": "string",
    "publisher": "string",
    "date": "string optional",
    "sourceType": "primary | official | expert | media | community | commercial | low-trust",
    "scores": { "authority": 1, "recency": 1, "relevance": 1, "evidenceQuality": 1, "biasRisk": 1, "directness": 1 },
    "decision": "use | caution | reject",
    "bestUse": "string"
  }],
  "evidenceDepth": {
    "requiredLevel": "light | standard | strong | deep",
    "sourceMinimum": 2,
    "sourceMixRequired": ["string"],
    "rawDataNeeded": true,
    "currentEvidenceScore": 3,
    "missingEvidence": ["string"],
    "canProceed": true
  },
  "keyClaims": [{
    "claim": "string",
    "evidenceLevel": "internal | retrieved | inferred",
    "sourceUrls": ["string"],
    "evidenceStrength": "strong | medium | weak",
    "confidence": "high | medium | low",
    "notes": "string optional"
  }],
  "themeClusters": ["string"],
  "contradictions": ["string"],
  "missingEvidence": ["string"],
  "inferredInsights": ["string"],
  "writerHandoff": {
    "recommendedTitle": "string",
    "portfolioLane": "${input.request.portfolioLane}",
    "angle": "string",
    "audience": "string",
    "purpose": "Explain | Educate | Compare | Persuade | Summarize | Warn | Guide | Analyze",
    "tone": "string",
    "contentMode": "${input.request.contentMode}",
    "safeClaims": ["string"],
    "riskyClaims": ["string"],
    "readerBridge": {
      "readerPain": "string",
      "readerQuestion": "string",
      "whyTheyShouldCare": "string",
      "likelyMisunderstanding": "string",
      "familiarExample": "string",
      "practicalPayoff": "string"
    },
    "practicalExample": "string",
    "riskSection": "string",
    "sourceLinks": ["string"],
    "imageDirection": "string"
  }
}

Research request:
${JSON.stringify(input.request, null, 2)}

Retrieved/provided sources:
${JSON.stringify(input.sources, null, 2)}`,
    },
  ]);

  const parsed = safeJson<ResearchBrief>(result.content, fallback);
  return {
    ...fallback,
    ...parsed,
    writerHandoff: { ...fallback.writerHandoff, ...parsed.writerHandoff },
    sourceList: Array.isArray(parsed.sourceList) ? parsed.sourceList : fallback.sourceList,
    evidenceDepth: { ...fallback.evidenceDepth, ...parsed.evidenceDepth },
    keyClaims: Array.isArray(parsed.keyClaims) ? parsed.keyClaims : fallback.keyClaims,
    themeClusters: Array.isArray(parsed.themeClusters) ? parsed.themeClusters : fallback.themeClusters,
    contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : fallback.contradictions,
    missingEvidence: Array.isArray(parsed.missingEvidence) ? parsed.missingEvidence : fallback.missingEvidence,
    inferredInsights: Array.isArray(parsed.inferredInsights) ? parsed.inferredInsights : fallback.inferredInsights,
  };
}

function fallbackWriterPackage(input: {
  title: string;
  markdown: string;
  summary: string;
  tags: string[];
  lane: PortfolioLane;
  researchBrief: ResearchBrief;
}): ArticleDraftPackage {
  return {
    finalContent: {
      title: input.title,
      markdown: input.markdown,
      summary: input.summary,
      tags: input.tags,
      portfolioLane: input.lane,
    },
    deliveryNote: {
      readinessLevel: 3.5,
      audience: input.researchBrief.writerHandoff.audience,
      purpose: input.researchBrief.writerHandoff.purpose,
      tone: input.researchBrief.writerHandoff.tone,
      articleType: "practical article",
      readerEffect: "help the reader understand what changes and why it matters",
      mainAngle: input.researchBrief.writerHandoff.angle,
      structureUsed: "Practical AI & Automation Notes",
      removedSections: [],
      knownCaveats: input.researchBrief.missingEvidence,
      suggestedImprovement: "Review manually for voice, source strength, and final publishing readiness.",
      humanTouchApplied: ["Practical judgment", "low-hype wording", "implementation framing"],
    },
    qualityScores: normalizeScores(),
    evidenceUse: {
      claimsUsed: input.researchBrief.keyClaims.map((claim) => claim.claim),
      inferredPointsUsed: input.researchBrief.inferredInsights,
      sourceLinksUsed: input.researchBrief.writerHandoff.sourceLinks,
      unsupportedClaimsAvoided: input.researchBrief.writerHandoff.riskyClaims,
    },
  };
}

export async function generateArticleDraftPackage(input: {
  researchBrief: ResearchBrief;
  idea: string;
  notes: string;
  tags: string[];
}): Promise<ArticleDraftPackage> {
  const result = await generateOpenRouterText([
    { role: "system", content: articleSystemPrompt },
    {
      role: "user",
      content: `You are the Writer Agent. You do not invent unsupported claims.

${humanTouchProfile}

${editorialWritingSkills}

Writer workflow:
1. Interpret audience and purpose.
2. Comprehend what the article is really about.
3. Classify article type.
4. Identify intended reader effect.
5. Build a reader bridge.
6. Check evidence depth and do not stretch thin research.
7. Decide whether more research is needed.
8. Apply the selected role perspective.
9. Choose angle.
10. Choose structure.
11. Draft.
12. Improve hook, transitions, engagement, and flow.
13. Remove or restructure sections that do not fit.
14. Check accuracy against the research brief.
15. Score readiness.

Content mode rules:
- article: 1200-1800 words when evidence supports it.
- deep_article: 1800-2500 words when evidence and nuance support it.
- paper: use practical research paper format; do not become overly academic.
- Use the shortest length that satisfies the reader.
- If evidence depth is low, keep the article shorter and clearly idea-led.
- Add audience connection: reader pain, reader question, familiar example, and practical payoff.
- Do not force "Try this next" or "What I would avoid" into articles where those sections do not serve the reader.
- Executive/CFO articles should prioritize decision framing, operational impact, risk, cost of inaction, governance, trust, investment priority, and business outcomes.
- Critical thinking pieces should create the "oh, I have not thought about it that way" moment.

Return only JSON:
{
  "finalContent": {
    "title": "string",
    "markdown": "full Markdown article",
    "summary": "string",
    "tags": ["string"],
    "portfolioLane": "${input.researchBrief.writerHandoff.portfolioLane}"
  },
  "deliveryNote": {
    "readinessLevel": 3.8,
    "audience": "string",
    "purpose": "string",
    "tone": "string",
    "articleType": "string",
    "readerEffect": "string",
    "mainAngle": "string",
    "structureUsed": "string",
    "removedSections": ["string"],
    "knownCaveats": ["string"],
    "suggestedImprovement": "string",
    "humanTouchApplied": ["string"]
  },
  "qualityScores": {
    "clarity": 4,
    "relevance": 4,
    "structure": 4,
    "engagement": 3,
    "evidenceDepth": 3,
    "readerConnection": 4,
    "audienceFit": 4,
    "accuracy": 4,
    "usefulness": 4,
    "readability": 4,
    "styleConsistency": 4,
    "completion": 4
  },
  "evidenceUse": {
    "claimsUsed": ["string"],
    "inferredPointsUsed": ["string"],
    "sourceLinksUsed": ["string"],
    "unsupportedClaimsAvoided": ["string"]
  }
}

Research brief:
${JSON.stringify(input.researchBrief, null, 2)}

Original idea:
${input.idea}

User notes:
${input.notes}

Suggested tags:
${input.tags.join(", ")}`,
    },
  ]);

  // The Writer Agent's response must parse as JSON AND contain real article
  // markdown before it's safe to use. Previously, a parse failure (the model's
  // JSON getting cut off mid-generation - see OPENROUTER_ARTICLE_MAX_TOKENS
  // below) fell back to `markdown: result.content`, i.e. the raw, still
  // JSON-shaped completion text itself, silently treating it as a valid
  // article body. That corrupted a real published article (its markdown was
  // literally the truncated raw model response) and crashed its page via
  // next-mdx-remote, since the leftover unescaped braces from the JSON
  // scaffolding aren't valid MDX. Throwing here instead lets the caller's
  // existing try/catch (improveDraftWithOpenRouter) fall back to the
  // original RSS source content, which is always safe to publish as-is.
  const parsed = safeJson<ArticleDraftPackage | null>(result.content, null);
  if (!parsed?.finalContent?.markdown?.trim()) {
    throw new Error(
      `Writer Agent response was not valid JSON with a real finalContent.markdown - refusing to use raw/incomplete model output as the article body. Response started with: ${result.content.slice(0, 200)}`
    );
  }

  const fallback = fallbackWriterPackage({
    title: parsed.finalContent.title || input.researchBrief.writerHandoff.recommendedTitle,
    markdown: parsed.finalContent.markdown,
    summary: input.researchBrief.researchInterpretation,
    tags: input.tags,
    lane: input.researchBrief.writerHandoff.portfolioLane,
    researchBrief: input.researchBrief,
  });

  return {
    ...fallback,
    ...parsed,
    finalContent: { ...fallback.finalContent, ...parsed.finalContent },
    deliveryNote: { ...fallback.deliveryNote, ...parsed.deliveryNote },
    qualityScores: normalizeScores(parsed.qualityScores),
    evidenceUse: { ...fallback.evidenceUse, ...parsed.evidenceUse },
  };
}

export async function generateCriticReview(input: {
  researchBrief: ResearchBrief;
  draftPackage: ArticleDraftPackage;
}): Promise<CriticReview> {
  const fallback: CriticReview = {
    readinessLevel: 3.5,
    decision: "revise",
    pass: [],
    needsRevision: ["Manual review recommended."],
    topFixes: ["Check claims against source evidence.", "Tighten any generic phrasing.", "Confirm practical example is specific."],
    unsupportedClaims: [],
    overclaims: [],
    genericAiPhrases: [],
    readerExperienceNotes: [],
    evidenceDepthNotes: [],
    readerConnectionNotes: [],
    researchFaithfulness: {
      score: 4,
      notes: "Fallback review; inspect manually.",
    },
    writingQualityScores: normalizeScores(),
  };

  const result = await generateOpenRouterText([
    { role: "system", content: articleSystemPrompt },
    {
      role: "user",
      content: `You are the Critic Agent. Diagnose only; do not rewrite.

Critic lenses:
- Clarity
- Structure
- Article type fit
- Intended reader effect
- Role/perspective fit
- Audience fit
- Accuracy/research faithfulness
- Engagement
- Style
- Helpful-first usefulness
- Evidence depth
- Reader connection
- Information gain
- Overclaiming
- Readability under density

Decision rules:
- Accuracy, clarity, and relevance must be 4+ for accept.
- Evidence depth must match the content mode, or the article must be shortened/framed as idea-led.
- Reader connection should be 4+ for public-facing content.
- The structure must match the article type.
- Do not accept a critical thinking or executive article that has been forced into a how-to checklist.
- No major unsupported claims.
- Flag generic AI language.
- Prefer top 3-5 actionable fixes.

Return only JSON:
{
  "readinessLevel": 3.8,
  "decision": "accept | revise | reject",
  "pass": ["string"],
  "needsRevision": ["string"],
  "topFixes": ["string"],
  "unsupportedClaims": ["string"],
  "overclaims": ["string"],
  "genericAiPhrases": ["string"],
  "readerExperienceNotes": ["string"],
  "evidenceDepthNotes": ["string"],
  "readerConnectionNotes": ["string"],
  "researchFaithfulness": { "score": 4, "notes": "string" },
  "writingQualityScores": {
    "clarity": 4,
    "relevance": 4,
    "structure": 4,
    "engagement": 3,
    "evidenceDepth": 3,
    "readerConnection": 4,
    "audienceFit": 4,
    "accuracy": 4,
    "usefulness": 4,
    "readability": 4,
    "styleConsistency": 4,
    "completion": 4
  }
}

Research brief:
${JSON.stringify(input.researchBrief, null, 2)}

Draft package:
${JSON.stringify(input.draftPackage, null, 2)}`,
    },
  ]);

  const parsed = safeJson<CriticReview>(result.content, fallback);
  return {
    ...fallback,
    ...parsed,
    decision: ["accept", "revise", "reject"].includes(parsed.decision) ? parsed.decision : fallback.decision,
    writingQualityScores: normalizeScores(parsed.writingQualityScores),
    researchFaithfulness: {
      ...fallback.researchFaithfulness,
      ...parsed.researchFaithfulness,
      score: clampScore(parsed.researchFaithfulness?.score, fallback.researchFaithfulness.score),
    },
  };
}

export async function reviseDraftPackage(input: {
  researchBrief: ResearchBrief;
  draftPackage: ArticleDraftPackage;
  criticReview: CriticReview;
  passNumber: 1 | 2;
}): Promise<{ draftPackage: ArticleDraftPackage; revisionPass: RevisionPass }> {
  const result = await generateOpenRouterText([
    { role: "system", content: articleSystemPrompt },
    {
      role: "user",
      content: `You are the Writer Revision Pass. Apply targeted fixes only.

Rules:
- Do not rewrite everything unless the critic says structure is broken.
- Do not add unsupported facts.
- Preserve human touch and practical voice.
- Preserve the article type and intended reader effect.
- Remove or restructure sections that do not fit when the critic flags structure mismatch.
- Respect the research brief.

Return only JSON:
{
  "draftPackage": ArticleDraftPackage,
  "revisionPass": {
    "passNumber": ${input.passNumber},
    "reason": "string",
    "criticDecision": "${input.criticReview.decision}",
    "fixesApplied": ["string"],
    "remainingIssues": ["string"]
  }
}

Research brief:
${JSON.stringify(input.researchBrief, null, 2)}

Draft package:
${JSON.stringify(input.draftPackage, null, 2)}

Critic review:
${JSON.stringify(input.criticReview, null, 2)}`,
    },
  ]);

  const fallback = {
    draftPackage: input.draftPackage,
    revisionPass: {
      passNumber: input.passNumber,
      reason: "Revision fallback; no structured changes parsed.",
      criticDecision: input.criticReview.decision === "reject" ? "reject" : "revise",
      fixesApplied: [],
      remainingIssues: input.criticReview.topFixes,
    } satisfies RevisionPass,
  };

  const parsed = safeJson<typeof fallback>(result.content, fallback);
  const draftPackage = parsed.draftPackage || fallback.draftPackage;
  return {
    draftPackage: {
      ...input.draftPackage,
      ...draftPackage,
      finalContent: { ...input.draftPackage.finalContent, ...draftPackage.finalContent },
      deliveryNote: { ...input.draftPackage.deliveryNote, ...draftPackage.deliveryNote },
      qualityScores: normalizeScores(draftPackage.qualityScores),
      evidenceUse: { ...input.draftPackage.evidenceUse, ...draftPackage.evidenceUse },
    },
    revisionPass: { ...fallback.revisionPass, ...parsed.revisionPass },
  };
}

export async function generateImageBrief(input: {
  researchBrief: ResearchBrief;
  draftPackage: ArticleDraftPackage;
  criticReview: CriticReview;
  imageDirection?: string;
}): Promise<ImageBrief> {
  const fallback: ImageBrief = {
    articleTitle: input.draftPackage.finalContent.title,
    portfolioLane: input.draftPackage.finalContent.portfolioLane,
    audience: input.draftPackage.deliveryNote.audience,
    articleAngle: input.draftPackage.deliveryNote.mainAngle,
    readerTakeaway: input.draftPackage.finalContent.summary,
    imageStrategy: "thumbnail-only",
    images: [
      {
        role: "main thumbnail",
        purpose: "attract",
        concept: input.draftPackage.deliveryNote.mainAngle,
        visualMetaphor: "A clean editorial technology workflow with human review and practical automation.",
        mustShow: ["clear focal point", "professional workflow context", "human review implication"],
        mustAvoid: ["readable text", "logos", "fake dashboards", "random robots", "misleading claims"],
        prompt: `${articleImageSystemPrompt}\n\nCreate a main thumbnail for "${input.draftPackage.finalContent.title}". Visualize the article angle: ${input.draftPackage.deliveryNote.mainAngle}. Keep it editorial, practical, professional, and useful at thumbnail size. Avoid readable text, logos, fake UI, random robots, and exaggerated sci-fi.`,
        alt: `Main thumbnail for ${input.draftPackage.finalContent.title}`,
        caption: "A visual anchor for the article's practical workflow argument.",
      },
    ],
    editorialRisks: ["Avoid implying evidence, adoption, or dashboards not supported by the article."],
  };

  const result = await generateOpenRouterText([
    { role: "system", content: articleSystemPrompt },
    {
      role: "user",
      content: `You are the Image Director. You create visual strategy, not the final image.

Use editorial image standards:
- Choose image purpose first.
- Images support the article instead of decorating it.
- No readable fake text, brand logos, fake data dashboards, misleading screenshots, or visual claims stronger than evidence.
- Include alt text and caption.

Return only JSON:
{
  "articleTitle": "string",
  "portfolioLane": "${input.draftPackage.finalContent.portfolioLane}",
  "audience": "string",
  "articleAngle": "string",
  "readerTakeaway": "string",
  "imageStrategy": "thumbnail-only | thumbnail-plus-explainer | full-editorial-set",
  "images": [{
    "role": "main thumbnail | inside paper visual | closing highlight visual",
    "purpose": "attract | explain | clarify | compare | anchor | localize",
    "sectionTarget": "string optional",
    "concept": "string",
    "visualMetaphor": "string",
    "mustShow": ["string"],
    "mustAvoid": ["string"],
    "prompt": "full image generation prompt",
    "alt": "string",
    "caption": "string"
  }],
  "editorialRisks": ["string"]
}

Extra image direction:
${input.imageDirection || "None"}

Research brief:
${JSON.stringify(input.researchBrief, null, 2)}

Draft package:
${JSON.stringify(input.draftPackage, null, 2)}

Critic review:
${JSON.stringify(input.criticReview, null, 2)}`,
    },
  ]);

  const parsed = safeJson<ImageBrief>(result.content, fallback);
  return {
    ...fallback,
    ...parsed,
    images: Array.isArray(parsed.images) && parsed.images.length ? parsed.images.slice(0, 3) : fallback.images,
  };
}
