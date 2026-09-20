import { describe, expect, it } from "vitest";
import { columnsToRow, columnToJsField, jsFieldToColumn, rowToColumns } from "./store";

// This is the one file in the social-agent feature responsible for
// translating between pipeline code's camelCase field names and Postgres's
// snake_case columns. A real, verified mismatch existed here before this
// test was written (draftCopy vs. draft_text, guardrailVerdict vs.
// guardrail_review, scheduledAt vs. scheduled_for -- none of these are
// pure-casing differences a generic converter alone would catch), so this
// covers both the mechanical conversion and every explicit alias directly,
// rather than trusting the mapping by inspection.

describe("jsFieldToColumn / columnToJsField", () => {
  it("converts mechanical camelCase fields to snake_case and back", () => {
    expect(jsFieldToColumn("accountId")).toBe("account_id");
    expect(columnToJsField("account_id")).toBe("accountId");

    expect(jsFieldToColumn("createdAt")).toBe("created_at");
    expect(columnToJsField("created_at")).toBe("createdAt");

    expect(jsFieldToColumn("platformPostId")).toBe("platform_post_id");
    expect(columnToJsField("platform_post_id")).toBe("platformPostId");
  });

  it("leaves single-word fields unchanged", () => {
    expect(jsFieldToColumn("id")).toBe("id");
    expect(columnToJsField("id")).toBe("id");
    expect(jsFieldToColumn("status")).toBe("status");
    expect(columnToJsField("status")).toBe("status");
  });

  it("applies the explicit alias table for fields that don't share a root word with their column", () => {
    const aliasedPairs: Array<[string, string]> = [
      ["draftCopy", "draft_text"],
      ["finalCopy", "final_text"],
      ["guardrailVerdict", "guardrail_review"],
      ["draftDisclosurePresent", "disclosure_present"],
      ["scheduledAt", "scheduled_for"],
      ["score", "relevance_score"],
      ["raw", "raw_payload"],
      ["voice", "voice_description"],
      ["toneRules", "tone_guidelines"],
    ];

    for (const [jsField, column] of aliasedPairs) {
      expect(jsFieldToColumn(jsField)).toBe(column);
      expect(columnToJsField(column)).toBe(jsField);
    }
  });
});

describe("rowToColumns / columnsToRow", () => {
  it("translates a full social_posts-shaped row round-trip without loss", () => {
    const row = {
      id: "post-1",
      accountId: "acct-1",
      platform: "linkedin",
      status: "drafted",
      draftCopy: "Some draft text",
      finalCopy: undefined,
      guardrailVerdict: { decision: "revise", checks: { factualAccuracy: 4 } },
      draftDisclosurePresent: true,
      scheduledAt: "2026-01-01T00:00:00Z",
      revisionCount: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const columns = rowToColumns(row);
    expect(columns).toMatchObject({
      id: "post-1",
      account_id: "acct-1",
      platform: "linkedin",
      status: "drafted",
      draft_text: "Some draft text",
      guardrail_review: { decision: "revise", checks: { factualAccuracy: 4 } },
      disclosure_present: true,
      scheduled_for: "2026-01-01T00:00:00Z",
      revision_count: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    const roundTripped = columnsToRow<typeof row>(columns);
    expect(roundTripped).toMatchObject({
      id: "post-1",
      accountId: "acct-1",
      platform: "linkedin",
      status: "drafted",
      draftCopy: "Some draft text",
      guardrailVerdict: { decision: "revise", checks: { factualAccuracy: 4 } },
      draftDisclosurePresent: true,
      scheduledAt: "2026-01-01T00:00:00Z",
      revisionCount: 1,
    });
  });

  it("does not recurse into jsonb-valued fields -- only the wrapping column name translates, nested keys stay exactly as pipeline code wrote them", () => {
    const row = {
      id: "post-1",
      guardrailVerdict: {
        decision: "publish",
        checks: { factualAccuracy: 5, platformPolicyFit: 5 },
        disclosureRequired: false,
        sensitiveTopicFlags: [],
      },
    };

    const columns = rowToColumns(row);
    // The column name translated (guardrailVerdict -> guardrail_review)...
    expect(columns).toHaveProperty("guardrail_review");
    expect(columns).not.toHaveProperty("guardrailVerdict");
    // ...but the object's own internal keys did not get snake_cased.
    const stored = columns.guardrail_review as { checks: Record<string, unknown>; disclosureRequired: boolean };
    expect(stored.checks).toHaveProperty("factualAccuracy");
    expect(stored.checks).not.toHaveProperty("factual_accuracy");
    expect(stored.disclosureRequired).toBe(false);
  });

  it("returns null from columnsToRow for null input instead of throwing", () => {
    expect(columnsToRow(null)).toBeNull();
  });
});
