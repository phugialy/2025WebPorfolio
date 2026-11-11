import { describe, expect, it, vi } from "vitest";

// The log module imports the server client; the pure parts under test never call it.
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: () => null, createSupabaseReadClient: () => null }));

import { cleanSearchTerm, isSearchTier, summarizeSearches, type SearchRow } from "./deals-search-log";

describe("cleanSearchTerm", () => {
  it("lowercases, trims and collapses spaces", () => {
    expect(cleanSearchTerm("  Noise   Cancelling Headphones ")).toBe("noise cancelling headphones");
  });

  it("rejects values that are too short, too long or not text", () => {
    expect(cleanSearchTerm("a")).toBeNull();
    expect(cleanSearchTerm("x".repeat(61))).toBeNull();
    expect(cleanSearchTerm(42)).toBeNull();
    expect(cleanSearchTerm(null)).toBeNull();
  });

  it("refuses anything that looks like contact details or a link", () => {
    expect(cleanSearchTerm("me@example.com")).toBeNull();
    expect(cleanSearchTerm("https://example.com/x")).toBeNull();
    expect(cleanSearchTerm("see example.com")).toBeNull();
    expect(cleanSearchTerm("call 555 123 4567")).toBeNull();
  });

  it("keeps product searches that contain digits", () => {
    expect(cleanSearchTerm("4k webcam 1080p")).toBe("4k webcam 1080p");
    expect(cleanSearchTerm("rtx 5070")).toBe("rtx 5070");
  });

  it("strips control characters", () => {
    expect(cleanSearchTerm("desk\u0000\nlamp")).toBe("desk lamp");
  });
});

describe("isSearchTier", () => {
  it("accepts only the three outcomes", () => {
    expect(["exact", "close", "none"].every(isSearchTier)).toBe(true);
    expect(isSearchTier("other")).toBe(false);
    expect(isSearchTier(undefined)).toBe(false);
  });
});

describe("summarizeSearches", () => {
  const row = (term: string, tier: SearchRow["tier"], day: string): SearchRow => ({ term, tier, created_at: `2026-11-${day}T10:00:00Z` });

  it("ranks the unanswered terms by how often they were searched", () => {
    const out = summarizeSearches([
      row("earbuds", "close", "10"),
      row("standing desk", "none", "09"),
      row("standing desk", "none", "11"),
      row("standing desk", "none", "12"),
      row("keyboard", "exact", "10"),
      row("keyboard", "exact", "11"),
      row("tv", "none", "10"),
    ]);
    expect(out.total).toBe(7);
    expect(out.answeredShare).toBeCloseTo(2 / 7, 5);
    expect(out.gaps.map((g) => g.term)).toEqual(["standing desk", "earbuds", "tv"]);
    expect(out.gaps[0]).toMatchObject({ searches: 3, unanswered: 3, lastSeen: "2026-11-12T10:00:00Z" });
  });

  it("leaves out terms that were always answered exactly", () => {
    expect(summarizeSearches([row("keyboard", "exact", "10")]).gaps).toEqual([]);
  });

  it("handles no searches at all", () => {
    expect(summarizeSearches([])).toEqual({ total: 0, answeredShare: null, gaps: [] });
  });

  it("limits the list", () => {
    const rows = Array.from({ length: 30 }, (_, i) => row(`term ${i}`, "none", "10"));
    expect(summarizeSearches(rows, 5).gaps).toHaveLength(5);
  });
});
