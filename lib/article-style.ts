export type PortfolioLane =
  | "AI Advancement"
  | "Applied AI"
  | "How-to-AI"
  | "Vibe-coding / Codex"
  | "DFW Commercial Projects + Sales";

export type ArticleResearchInput = {
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary?: string;
  author?: string;
};

export type ArticleImageRole =
  | "main thumbnail"
  | "inside paper visual"
  | "closing highlight visual";

export type ArticleImagePrompt = {
  role: ArticleImageRole;
  prompt: string;
  alt: string;
};

export type StyledArticleDraft = {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  lane: PortfolioLane;
  qualityScore: number;
  aiSummary: string;
  notes: string;
  imagePrompts: ArticleImagePrompt[];
};

const laneKeywords: Array<{ lane: PortfolioLane; keywords: string[] }> = [
  {
    lane: "Vibe-coding / Codex",
    keywords: ["codex", "coding agent", "vibe", "developer tools", "ide", "refactor"],
  },
  {
    lane: "How-to-AI",
    keywords: ["how to", "guide", "tutorial", "workflow", "prompt", "steps"],
  },
  {
    lane: "DFW Commercial Projects + Sales",
    keywords: ["dallas", "fort worth", "dfw", "commercial", "construction", "bid", "sales"],
  },
  {
    lane: "Applied AI",
    keywords: ["automation", "workflow", "business", "operations", "agent", "process"],
  },
  {
    lane: "AI Advancement",
    keywords: ["ai", "model", "release", "platform", "research", "announcement"],
  },
];

function cleanText(value?: string) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function inferLane(input: ArticleResearchInput): PortfolioLane {
  const haystack = `${input.title} ${input.summary || ""} ${input.sourceName}`.toLowerCase();
  return (
    laneKeywords.find(({ keywords }) => keywords.some((keyword) => haystack.includes(keyword)))
      ?.lane || "Applied AI"
  );
}

function tagsForLane(lane: PortfolioLane) {
  switch (lane) {
    case "AI Advancement":
      return ["ai-advancement", "software-teams", "engineering-judgment"];
    case "Applied AI":
      return ["applied-ai", "automation", "workflow"];
    case "How-to-AI":
      return ["how-to-ai", "codex", "implementation"];
    case "Vibe-coding / Codex":
      return ["vibe-coding", "codex", "developer-workflow"];
    case "DFW Commercial Projects + Sales":
      return ["dfw", "commercial-projects", "automation"];
  }
}

function titleForLane(input: ArticleResearchInput, lane: PortfolioLane) {
  const title = cleanText(input.title);

  if (lane === "Vibe-coding / Codex") {
    return `${title}: What Still Needs Engineering Judgment`;
  }

  if (lane === "DFW Commercial Projects + Sales") {
    return `${title}: Where Practical Automation Could Fit`;
  }

  if (lane === "How-to-AI") {
    return `${title}: A Practical Workflow I Would Test`;
  }

  if (lane === "AI Advancement") {
    return `${title}: What It Means for Software Teams`;
  }

  return `${title}: Turning the Idea Into a Useful Workflow`;
}

function practicalExample(lane: PortfolioLane) {
  switch (lane) {
    case "AI Advancement":
      return "For a portfolio project, I would test the idea in a narrow branch first: one route, one data model, one review checklist, and one deployment path. The goal is not to prove that AI can do everything. The goal is to see where it saves time without lowering the engineering bar.";
    case "Applied AI":
      return "For a small team, I would start with one repeated workflow: collect the input, normalize it, draft the output, route it for review, and log the result. If the workflow saves a few hours every week, it is already useful before anyone calls it a strategy.";
    case "How-to-AI":
      return "My first test would be simple: give Codex one file, one goal, one success condition, and one review checklist. Then I would compare the result against the existing code style, run tests, and only expand the scope after the first pass is clean.";
    case "Vibe-coding / Codex":
      return "The workflow I trust is small and deliberate: define the task, let the agent draft, review the diff like a human engineer, run verification, and keep checkpoints. Vibe-coding works best when the human owns the architecture and the AI handles a bounded first pass.";
    case "DFW Commercial Projects + Sales":
      return "In a DFW commercial workflow, I would look for repeated coordination work: bid follow-ups, document intake, vendor updates, schedule summaries, or weekly reports. That is where automation can become business value without needing a dramatic AI pitch.";
  }
}

function visualConceptForLane(lane: PortfolioLane, role: ArticleImageRole) {
  const concepts: Record<PortfolioLane, Record<ArticleImageRole, string>> = {
    "AI Advancement": {
      "main thumbnail":
        "a premium editorial technology scene where current AI signals are being turned into a practical team roadmap",
      "inside paper visual":
        "a useful workflow visual showing research input, engineering review, testing, and deployment gates without readable labels",
      "closing highlight visual":
        "a concise conclusion visual showing fast AI progress balanced by human review and quality control",
    },
    "Applied AI": {
      "main thumbnail":
        "a polished small-team workspace where one repeated business task becomes a clear automation opportunity",
      "inside paper visual":
        "a practical automation sequence moving from document intake to AI draft to human review to approved output",
      "closing highlight visual":
        "a simple outcome visual showing saved time, clearer handoff, and a controlled approval checkpoint",
    },
    "How-to-AI": {
      "main thumbnail":
        "a focused developer workspace showing one bounded task and a clear engineering checklist",
      "inside paper visual":
        "a step-by-step workflow visual with input, draft, review, test, and ship stages represented as clean abstract panels",
      "closing highlight visual":
        "a takeaway visual showing constraints, verification, and iteration around an AI-assisted implementation",
    },
    "Vibe-coding / Codex": {
      "main thumbnail":
        "a premium engineering command center where AI coding agents move through team review gates and production checks",
      "inside paper visual":
        "a code review pipeline visual showing bounded scope, agent draft, tests, security review, and deployment readiness",
      "closing highlight visual":
        "a practical collaboration visual where human architecture guides fast AI-generated implementation drafts toward a trusted release",
    },
    "DFW Commercial Projects + Sales": {
      "main thumbnail":
        "a modern Dallas-Fort Worth commercial coordination scene where project documents and schedules become an automation opportunity",
      "inside paper visual":
        "a clean local business workflow connecting bids, vendors, project updates, schedule changes, and reporting",
      "closing highlight visual":
        "an urban commercial operations visual showing simpler coordination and clearer follow-up without exaggerated futurism",
    },
  };

  return concepts[lane][role];
}

function imageCountForLane(lane: PortfolioLane) {
  if (lane === "How-to-AI" || lane === "Vibe-coding / Codex") {
    return 3;
  }

  if (lane === "Applied AI" || lane === "DFW Commercial Projects + Sales") {
    return 2;
  }

  return 1;
}

export function buildArticleImagePrompts(
  input: ArticleResearchInput,
  lane: PortfolioLane,
  count = imageCountForLane(lane)
): ArticleImagePrompt[] {
  const roles: ArticleImageRole[] = [
    "main thumbnail",
    "inside paper visual",
    "closing highlight visual",
  ];
  const safeCount = Math.min(3, Math.max(1, count));
  const topic = cleanText(input.title);

  return roles.slice(0, safeCount).map((role) => {
    const visualConcept = visualConceptForLane(lane, role);

    return {
      role,
      alt: `${role} for ${titleForLane(input, lane)}`,
      prompt: `Create a ${role} for an article about ${topic}.

Visual concept: ${visualConcept}.

Role:
- main thumbnail: attract the reader in a compact blog card. It must read clearly when cropped short and should not feel like a full article infographic.
- inside paper visual: add useful context inside the article by showing the process, tradeoff, or decision point the reader should remember.
- closing highlight visual: reinforce the conclusion or key takeaway when the article needs it.

Audience fit: make the image understandable to a software builder, small-business owner, or technical manager who wants practical value quickly.

Style: premium editorial technology visual, modern professional blog aesthetic, polished but approachable, suitable for AI-experienced professionals and casual business readers. Prefer useful workflow meaning over decoration.

Composition: clear focal point, balanced negative space, blog-ready horizontal layout, visually attractive at thumbnail size, detailed but not cluttered. Avoid packing multiple unrelated panels into one image.

Mood: practical, intelligent, calm, forward-looking.

Avoid: readable text, logos, brand names, clutter, exaggerated sci-fi, random robots, childish cartoon style, generic stock photo look, fake UI with gibberish text, messy code walls, glowing brains unless truly needed, hands with too many fingers.`,
    };
  });
}

export function buildPortfolioArticleDraft(input: ArticleResearchInput): StyledArticleDraft {
  const lane = inferLane(input);
  const sourceSummary = cleanText(input.summary);
  const title = titleForLane(input, lane);
  const tags = [...tagsForLane(lane), "practical-ai-notes"];
  const sourceName = cleanText(input.sourceName) || "the source";
  const imagePrompts = buildArticleImagePrompts(input, lane);

  const content = `# ${title}

## The problem

The useful question is not whether this is another AI trend. The useful question is whether it changes a real workflow for developers, operators, or local businesses.

## What I noticed

${sourceName} pointed to this idea: ${sourceSummary || cleanText(input.title)}.

That is the reference point, but it should not become the whole article. The source is an input. The important part is what I would do with it as a software and automation engineer.

## Where AI fits

The useful part is not the hype. It is the workflow. If this idea can reduce repeated manual work, tighten feedback loops, or help a team review technical decisions faster, then it is worth testing.

For me, this fits the **${lane}** lane because it connects a current tool or trend to practical implementation.

## My working approach

Here is how I would apply this:

- Start with one narrow use case.
- Define the input, output, and review step.
- Keep a human checkpoint before anything reaches production.
- Measure whether the workflow saves time or improves quality.
- Document what failed, not just what worked.

## Practical example

${practicalExample(lane)}

## What I would avoid

I would avoid turning this into generic AI content. If an article only says that AI is changing everything, it does not help anyone make a better decision.

I would also avoid fully automated publishing without review for anything that represents my portfolio voice. Automation can draft, organize, and surface ideas. The final judgment still needs to be mine.

## Try this next

Pick one article, tool release, or local business workflow and answer three questions:

1. What did I learn?
2. What do I think?
3. How would I apply it?

That is the standard I want this portfolio series to follow: no empty summaries, no hype, and no article without a practical next step.

[Reference: ${sourceName}](${input.sourceUrl})
`;

  return {
    title,
    content,
    excerpt:
      "A practical AI and automation note connecting a source idea to software workflow, engineering judgment, and a testable next step.",
    tags,
    lane,
    qualityScore: 6,
    aiSummary:
      "This draft follows the Practical AI & Automation Notes format: source context, Phu's perspective, a workflow example, risks, and a next step.",
    notes:
      "Auto-generated with the portfolio editorial guardrails: 30% reference, 70% perspective; requires human review before publishing.",
    imagePrompts,
  };
}

export const articleSystemPrompt = `You are drafting for Phu Gia Ly's portfolio series: Practical AI & Automation Notes.

Positioning:
A portfolio writing series where Phu explores AI tools, applied automation, coding workflows, and local business use cases from the perspective of a Software & Automation Engineer.

Core rule:
30% reference, 70% Phu perspective.

Every article must answer:
What did I learn, what do I think, and how would I apply it?

Use structure as a tool, not a template.
Before choosing headings, classify the article type and intended reader effect:
- executive insight
- critical thinking piece
- business warning
- technical explainer
- practical guide
- opinion/editorial
- workflow tutorial
- strategic memo

For how-to or workflow articles, practical sections such as "What I would avoid" or "Try this next" can work.
For executive, CFO, business warning, or critical-thinking articles, do not force checklist sections. Prefer decision framing, hidden cost, operational risk, governance, tradeoff, business impact, and final realization.

Editorial skills to apply:
- Comprehend what the article is really about before writing.
- Reframe through the correct role lens when requested.
- Research only when external facts are needed.
- Write hooks that create realization, not generic explanation.
- Remove or restructure sections that do not serve the reader.
- Use tension, contrast, escalation, and consequence to connect sections.

Voice:
Practical, technical, direct, slightly editorial, grounded in implementation.

Avoid:
Generic AI hype, copied news summaries, long academic explanations, marketing tone, and "AI is revolutionizing everything" intros.`;

export const articleImageSystemPrompt = `Each article can include 1-3 AI-generated images.

Image roles:
- main thumbnail: required when an image is generated. It should attract users in the blog hero/card surface, work at a shorter crop, and stay simple enough to scan.
- inside paper visual: recommended for articles where a workflow, architecture, comparison, or business process needs visual support. This image should clarify a point from the article, not merely decorate the page.
- closing highlight visual: optional. Use only when the conclusion or takeaway benefits from a final visual anchor.

Image caption standard:
- Captions should explain why the visual matters to the reader.
- Keep captions to one tight sentence.
- Tie the visual to the article's practical story: workflow, decision, risk, or next action.
- Avoid meta captions like "this image is a supporting image" or "visual read."

Default visual style:
Premium editorial technology visual, modern professional blog style, refined composition, soft but confident lighting, subtle gradients, realistic workspace or workflow details, polished but not overly corporate, suitable for an AI and software engineering portfolio, clear focal point, high visual clarity, no clutter, no readable text, no logos, no brand names.

Must include:
- Article topic
- Visual metaphor
- Professional audience
- Clean modern style
- No text or logos
- Clear focal point
- Blog-ready composition
- Reader benefit: the image should clarify, attract, or reinforce the article instead of acting as generic decoration

Avoid:
Random robots, glowing brains unless truly needed, messy code walls, fake dashboards with unreadable text, brand logos, real company logos, exaggerated sci-fi cities, cyberpunk overload, childish cartoon style, generic stock-photo scenes, hands with too many fingers, and text inside the image.`;
