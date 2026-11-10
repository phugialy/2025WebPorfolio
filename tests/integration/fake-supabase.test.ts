import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "../support/fake-supabase";

const articles = () =>
  createFakeSupabase({
    tables: {
      articles: [
        { id: "a", slug: "guide", status: "published", tags: ["holiday-guide", "monitors"] },
        { id: "b", slug: "news", status: "published", tags: ["ai"] },
        { id: "c", slug: "draft-guide", status: "draft", tags: ["holiday-guide"] },
      ],
    },
    jsonColumns: { articles: ["tags"] },
    columns: { articles: ["id", "slug", "status", "tags"] },
  });

describe("the fake database guards the mistakes that shipped once", () => {
  it("rejects the Postgres-array form on a JSON column, with the real error text", async () => {
    const { data, error } = await articles().from("articles").select("slug").contains("tags", ["holiday-guide"]);
    expect(data).toBeNull();
    expect(error?.message).toBe("invalid input syntax for type json");
  });

  it("accepts the JSON form", async () => {
    const { data, error } = await articles()
      .from("articles")
      .select("slug")
      .eq("status", "published")
      .filter("tags", "cs", JSON.stringify(["holiday-guide"]));
    expect(error).toBeNull();
    expect((data as { slug: string }[]).map((r) => r.slug)).toEqual(["guide"]);
  });

  it("rejects JSON text that is not JSON (a Postgres array literal)", async () => {
    const { error } = await articles().from("articles").select("slug").filter("tags", "cs", "{holiday-guide}");
    expect(error?.message).toBe("invalid input syntax for type json");
  });

  it("not(cs) excludes guides", async () => {
    const { data } = await articles().from("articles").select("slug").not("tags", "cs", JSON.stringify(["holiday-guide"]));
    expect((data as { slug: string }[]).map((r) => r.slug)).toEqual(["news"]);
  });

  it("rejects selecting a column the table does not have", async () => {
    const { error } = await articles().from("articles").select("slug, published_at");
    expect(error?.message).toBe("column articles.published_at does not exist");
  });

  it("ignores embedded relations and * when checking columns", async () => {
    const { error } = await articles().from("articles").select("*, affiliate_products(name)");
    expect(error).toBeNull();
  });
});

describe("the fake database behaves like the client the app uses", () => {
  it("single() fails on no rows, maybeSingle() returns null", async () => {
    const db = articles();
    expect((await db.from("articles").select("*").eq("slug", "nope").single()).error?.code).toBe("PGRST116");
    expect((await db.from("articles").select("*").eq("slug", "nope").maybeSingle()).data).toBeNull();
  });

  it("insert, update and upsert change rows and are logged", async () => {
    const db = createFakeSupabase({ tables: { t: [{ id: "1", n: 1, k: "x" }] } });
    await db.from("t").insert({ n: 2, k: "y" });
    await db.from("t").update({ n: 9 }).eq("id", "1");
    await db.from("t").upsert({ k: "x", n: 5 }, { onConflict: "k", ignoreDuplicates: true });
    expect(db.tables.t.map((r) => r.n)).toEqual([9, 2]);
    expect(db.writes.map((w) => w.op)).toEqual(["insert", "update", "upsert"]);
  });

  it("insert().select().single() returns the new row", async () => {
    const db = createFakeSupabase();
    const { data } = await db.from("t").insert({ name: "x" }).select("id").single();
    expect((data as { id: string }).id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("ilike matches like Postgres (case-insensitive, % wildcard)", async () => {
    const db = createFakeSupabase({ tables: { p: [{ url: "https://www.amazon.com/dp/B0ABC?tag=x" }, { url: "https://other" }] } });
    const { data } = await db.from("p").select("url").ilike("url", "%/dp/b0abc%");
    expect(data).toHaveLength(1);
  });

  it("failOn makes a table fail", async () => {
    const db = createFakeSupabase({ failOn: { t: "boom" } });
    expect((await db.from("t").select("*")).error?.message).toBe("boom");
  });

  it("orders and ranges", async () => {
    const db = createFakeSupabase({ tables: { t: [{ n: 2 }, { n: 3 }, { n: 1 }] } });
    const { data } = await db.from("t").select("n").order("n", { ascending: false }).range(0, 1);
    expect(data).toEqual([{ n: 3 }, { n: 2 }]);
  });
});
