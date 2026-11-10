import { beforeEach, describe, expect, it, vi } from "vitest";
import { REAL_JSON_COLUMNS, createFakeSupabase } from "../support/fake-supabase";

const h = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => h.client,
  createSupabaseReadClient: () => h.client,
}));
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/articles", () => ({ getGuideSummaries: async () => [] }));

import { getGuideLinks } from "@/lib/deals";

const P_ALIENWARE = "dd6d1602-b10f-4c8f-bcee-9e52426d9295";
const P_LG = "18fc06a5-8c0e-43c4-bcfd-3b8d720e6217";
const P_OTHER = "f8cf0178-d060-4e37-9ff7-155b7ee794e8";

const guide = (slug: string, publishedAt: string, ids: string[], extra: Record<string, unknown> = {}) => ({
  id: slug,
  slug,
  title: `Title of ${slug}`,
  status: "published",
  tags: ["holiday-guide", "monitors"],
  published_at: publishedAt,
  created_at: publishedAt,
  content: ids.map((id) => `[Buy](/api/affiliate/go/${id}?ref=${slug})`).join("\n"),
  ...extra,
});

const COLUMNS = { articles: ["id", "slug", "title", "status", "tags", "published_at", "created_at", "content"] };

function dbWith(articles: Record<string, unknown>[], failOn?: Record<string, string>) {
  h.client = createFakeSupabase({
    tables: { articles },
    jsonColumns: REAL_JSON_COLUMNS,
    columns: COLUMNS,
    failOn,
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getGuideLinks against a database that enforces the real column types", () => {
  it("returns a link for every product a published guide names (this failed in production once)", async () => {
    dbWith([guide("monitors", "2026-11-09T14:00:00Z", [P_ALIENWARE, P_LG])]);
    const links = await getGuideLinks();
    expect(Object.keys(links).sort()).toEqual([P_ALIENWARE, P_LG].sort());
    expect(links[P_ALIENWARE]).toEqual({ slug: "monitors", title: "Title of monitors" });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("ignores drafts, scheduled guides and ordinary articles", async () => {
    dbWith([
      guide("live", "2026-11-09T14:00:00Z", [P_ALIENWARE]),
      guide("scheduled", "2026-11-11T14:00:00Z", [P_LG], { status: "scheduled" }),
      guide("draft", "2026-11-12T14:00:00Z", [P_OTHER], { status: "draft" }),
      guide("news", "2026-11-09T09:00:00Z", [P_OTHER], { tags: ["ai"] }),
    ]);
    expect(Object.keys(await getGuideLinks())).toEqual([P_ALIENWARE]);
  });

  it("when two guides name the same product, the newest one wins", async () => {
    dbWith([
      guide("older", "2026-11-09T14:00:00Z", [P_ALIENWARE]),
      guide("newer", "2026-11-11T14:00:00Z", [P_ALIENWARE]),
    ]);
    expect((await getGuideLinks())[P_ALIENWARE].slug).toBe("newer");
  });

  it("a database failure means no links and a logged error, never a thrown page error", async () => {
    dbWith([guide("monitors", "2026-11-09T14:00:00Z", [P_ALIENWARE])], { articles: "connection reset" });
    expect(await getGuideLinks()).toEqual({});
    expect(console.error).toHaveBeenCalled();
  });

  it("only selects columns that exist on the articles table", async () => {
    // The fake rejects an unknown column, so reaching a result proves the select list is valid.
    dbWith([guide("monitors", "2026-11-09T14:00:00Z", [P_ALIENWARE])]);
    expect(Object.keys(await getGuideLinks()).length).toBe(1);
  });
});
