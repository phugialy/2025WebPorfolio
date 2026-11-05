import { NextResponse } from "next/server";
import { getDealsData } from "@/lib/deals";
import { HOLIDAYS } from "@/lib/deals-core";

export const revalidate = 3600;

// Read-only, public: which catalog products currently rank where on the Deals
// pages. Names and ids only; no click counts. Used by the article publisher so
// its buying guides mention the products the pages actually list. The same
// data is what the /deals pages show, from the same cache.
export async function GET() {
  const data = await getDealsData();
  const pick = (p: { id: string; name: string; category: string | null; rising: boolean }) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    trending: p.rising,
  });
  return NextResponse.json(
    {
      generatedAt: data.generatedAt,
      holidays: Object.fromEntries(
        HOLIDAYS.map((h) => [h.slug, { name: h.name, date: h.date, top: (data.holidays[h.slug] ?? []).map(pick) }])
      ),
      trending: data.top.map(pick),
      // Every product that is on the Deals pages, with its dedicated tags. A
      // guide should only name products from this list.
      catalog: data.explorer.map((i) => ({ id: i.id, name: i.name, category: i.category, tags: i.tags })),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600" } }
  );
}
