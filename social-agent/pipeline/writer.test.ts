import { describe, expect, it } from "vitest";
import { platformWriters, writeInstagramPost, writeLinkedInPost, writeXPost } from "./writer";
import { createScriptedLLM } from "./test-support";
import type { ContentBrief } from "./types";

const brief: ContentBrief = {
  topic: "shipped a new feature",
  angle: "practical, no hype",
  keyPoints: ["faster", "safer"],
  constraints: [],
  sourceSignalIds: [],
};

describe("platform writers", () => {
  it("produces a ready draft from a valid model response", async () => {
    const llm = createScriptedLLM([{ text: "We shipped something great today!", hashtags: ["#launch"], disclosurePresent: false }]);
    const draft = await writeInstagramPost({ brief, llm });
    expect(draft.readyForReview).toBe(true);
    expect(draft.platform).toBe("instagram");
    expect(draft.text).toBe("We shipped something great today!");
    expect(draft.hashtags).toEqual(["#launch"]);
  });

  it("falls back to readyForReview: false on a parse failure -- never treated as publishable", async () => {
    const llm = createScriptedLLM(["<<garbled truncated response"]);
    const draft = await writeLinkedInPost({ brief, llm });
    expect(draft.readyForReview).toBe(false);
    expect(draft.text).toBe("");
  });

  it("falls back to readyForReview: false when the model returns valid JSON but empty text", async () => {
    const llm = createScriptedLLM([{ text: "   ", hashtags: [] }]);
    const draft = await writeXPost({ brief, llm });
    expect(draft.readyForReview).toBe(false);
  });

  it("uses a distinct system prompt per platform, not one generic prompt", async () => {
    const llm = createScriptedLLM([
      { text: "ig copy" },
      { text: "fb copy" },
      { text: "li copy" },
      { text: "x copy" },
    ]);

    await platformWriters.instagram({ brief, llm });
    await platformWriters.facebook({ brief, llm });
    await platformWriters.linkedin({ brief, llm });
    await platformWriters.x({ brief, llm });

    const systemPrompts = llm.calls.map((messages) => messages.find((m) => m.role === "system")?.content);
    const unique = new Set(systemPrompts);
    expect(unique.size).toBe(4);
    expect(systemPrompts[0]).toMatch(/Instagram/);
    expect(systemPrompts[1]).toMatch(/Facebook/);
    expect(systemPrompts[2]).toMatch(/LinkedIn/);
    expect(systemPrompts[3]).toMatch(/X \(Twitter\)/);
  });

  it("every platform is represented in the platformWriters map", () => {
    expect(Object.keys(platformWriters).sort()).toEqual(["facebook", "instagram", "linkedin", "x"]);
  });
});
