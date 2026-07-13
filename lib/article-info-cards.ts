import type { BlogPost } from "@/lib/articles";

export type ArticleInfoCard = {
  label: string;
  title: string;
  body: string;
};

export function buildFallbackInfoCards(post: BlogPost): ArticleInfoCard[] {
  const isCodex = post.tags.some((tag) =>
    ["codex", "vibe-coding", "agentic-workflows", "ai-coding"].includes(tag)
  );
  const isBusiness = post.tags.some((tag) =>
    ["automation", "workflow", "dfw", "commercial-projects"].includes(tag)
  );

  return [
    {
      label: "Why it matters",
      title: isCodex ? "Agents need team boundaries" : "Automation needs a narrow first win",
      body: isCodex
        ? "The useful shift is not more generated code. It is putting agent output through scope, review, tests, and release checks."
        : "The best first AI workflow is usually a repeated task with a clear input, clear output, and a human approval step.",
    },
    {
      label: "What to test",
      title: isBusiness ? "Pick one repeated workflow" : "Start with one controlled task",
      body: isBusiness
        ? "Choose one weekly process, draft the output with AI, and track what a human changes before approval."
        : "Give the agent one route, one file group, or one bug. Then verify the result before expanding scope.",
    },
    {
      label: "Guardrail",
      title: "Review before it ships",
      body: "Keep human judgment in the loop for production code, customer-facing content, and anything that represents the portfolio voice.",
    },
  ];
}
