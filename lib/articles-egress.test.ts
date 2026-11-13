import { beforeEach, describe, expect, it, vi } from "vitest";

// The Supabase read client is replaced by a stub whose every query resolves to
// whatever `answer` holds, and whose calls are recorded.
const h = vi.hoisted(() => ({
  answer: { data: null as unknown, error: null as unknown },
  calls: [] as { table: string; select?: string }[],
}));

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock("@/lib/supabase/server", () => {
  const builder = (table: string) => {
    const call: { table: string; select?: string } = { table };
    h.calls.push(call);
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "not", "filter", "order", "limit", "maybeSingle", "single", "in"]) {
      chain[method] = (arg?: string) => {
        if (method === "select") call.select = arg;
        return chain;
      };
    }
    chain.then = (resolve: (v: unknown) => unknown) => resolve(h.answer);
    return chain;
  };
  const client = { from: builder };
  return { createSupabaseReadClient: () => client, createSupabaseAdminClient: () => client };
});

import {
  LIST_CACHE_LIMIT_BYTES,
  LIST_CONTENT_CHARS,
  fitToCache,
  getAllPosts,
  getAllPostsOrThrow,
  getPostBySlug,
  getPostSummaries,
  slimPostForList,
  type BlogPost,
} from "./articles";

const post = (extra: Partial<BlogPost> = {}): BlogPost => ({
  _id: "1",
  title: "T",
  slug: "t",
  content: "x".repeat(9000),
  canonicalUrl: "https://example.com",
  source: "supabase",
  tags: ["a"],
  status: "published",
  createdAt: 1,
  updatedAt: 1,
  metadata: {
    aiSummary: "s",
    readTime: 4,
    heroImageUrl: "https://img/h.jpg",
    sourceLinks: ["https://a", "https://b"],
    sourceQualityNote: "long note",
    imagePrompts: [
      { role: "hero", prompt: "p".repeat(500), alt: "alt one" },
      { role: "inside", prompt: "q".repeat(500), alt: "alt two" },
    ],
    infoCards: [
      { label: "a", title: "A", body: "1" },
      { label: "b", title: "B", body: "2" },
    ],
    imageAssets: [{ role: "hero", url: "https://img/h.jpg", alt: "h", prompt: "z".repeat(400) }],
  },
  ...extra,
});

beforeEach(() => {
  h.calls.length = 0;
  h.answer = { data: null, error: null };
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("the slimmed article list", () => {
  it("cuts the body, and drops what the list cards never show, but keeps what they do", () => {
    const slim = slimPostForList(post());
    expect(slim.content).toHaveLength(LIST_CONTENT_CHARS);
    expect(slim.metadata.sourceLinks).toBeUndefined();
    expect(slim.metadata.sourceQualityNote).toBeUndefined();
    expect(slim.metadata.imagePrompts).toEqual([{ role: "hero", prompt: "", alt: "alt one" }]);
    expect(slim.metadata.infoCards).toEqual([{ label: "a", title: "A", body: "1" }]);
    expect(slim.metadata.imageAssets).toEqual([{ role: "hero", url: "https://img/h.jpg", alt: "h" }]);
    expect(slim).toMatchObject({ title: "T", slug: "t", tags: ["a"], canonicalUrl: "https://example.com" });
    expect(slim.metadata).toMatchObject({ aiSummary: "s", readTime: 4, heroImageUrl: "https://img/h.jpg" });
  });

  it("is a small fraction of the full article", () => {
    const full = JSON.stringify(post()).length;
    const slim = JSON.stringify(slimPostForList(post())).length;
    expect(slim).toBeLessThan(full * 0.35);
  });

  it("copes with an article that has no metadata lists or content", () => {
    const bare = slimPostForList(post({ content: "", metadata: {} }));
    expect(bare.content).toBe("");
    expect(bare.metadata.imagePrompts).toBeUndefined();
  });

  it("shortens the bodies further, then drops them, to stay under the cache's size limit", () => {
    const many = Array.from({ length: 400 }, (_, i) => slimPostForList(post({ _id: String(i), slug: `s${i}` })));
    const size = (l: BlogPost[]) => Buffer.byteLength(JSON.stringify(l), "utf8");
    expect(size(fitToCache(many, 10_000_000))).toBe(size(many)); // fits already: untouched
    const tight = fitToCache(many, 400_000);
    expect(size(tight)).toBeLessThanOrEqual(400_000);
    expect(tight[0].content.length).toBeLessThan(LIST_CONTENT_CHARS);
    expect(fitToCache(many, 1).every((p) => p.content === "")).toBe(true);
    expect(LIST_CACHE_LIMIT_BYTES).toBeLessThan(2 * 1024 * 1024);
  });
});

describe("a database failure is never turned into 'no articles' or 'not found'", () => {
  const failure = { data: null, error: { message: "Service for this project is restricted" } };

  it("the list API throws, and the page-level list answers empty for that one request", async () => {
    h.answer = failure;
    await expect(getAllPostsOrThrow()).rejects.toThrow(/restricted/);
    expect(await getAllPosts()).toEqual([]);
  });

  it("the summaries answer empty for that request but throw underneath (so nothing is cached)", async () => {
    h.answer = failure;
    expect(await getPostSummaries()).toEqual([]);
  });

  it("one article: a failure throws, a missing article is null", async () => {
    h.answer = failure;
    await expect(getPostBySlug("x")).rejects.toThrow(/restricted/);
    h.answer = { data: null, error: null };
    expect(await getPostBySlug("x")).toBeNull();
  });
});

describe("what it asks the database for", () => {
  it("the summaries do not select the internal 'notes' column", async () => {
    h.answer = { data: [], error: null };
    await getPostSummaries();
    const select = h.calls.find((c) => c.table === "articles")?.select ?? "";
    expect(select).toContain("excerpt");
    expect(select).not.toMatch(/\bnotes\b/);
  });

  it("the list read excludes holiday guides and returns the slimmed list", async () => {
    h.answer = {
      data: [{ id: "1", title: "T", slug: "t", content: "y".repeat(8000), tags: ["a"], status: "published", created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z", raw_payload: {} }],
      error: null,
    };
    const list = await getAllPostsOrThrow();
    expect(list).toHaveLength(1);
    expect(list[0].content.length).toBeLessThanOrEqual(LIST_CONTENT_CHARS);
  });
});
