import { fetchAllRows } from "@/lib/affiliate";
import { DEALS_HIDES, dealsToday, daysBetween } from "@/lib/deals-core";
import {
  RESERVE_SEARCHES,
  blendDemand,
  dailyPlan,
  demandByCategory,
  fetchDemandChunk,
  mergeDemand,
  searchesLeft,
  type DemandResult,
} from "@/lib/demand-signal";
import { MARKET_SCAN_FLAG, allTrendTerms } from "@/lib/discovery-plan";
import {
  RETIRED_FLAG,
  TEST_CATEGORIES,
  TEST_FROM,
  TEST_TAG,
  planDay,
  termsByCategory,
  type ActiveTest,
  type Plan,
  type Proposal,
} from "@/lib/deals-test";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// The daily job of the non-tech product test (rules in lib/deals-test.ts).
// Reads what the Deals shelves did, decides who stays, leaves and enters, and
// applies it. Every change is written to deals_test_events.

const DAY = 86_400_000;
const WINDOW_DAYS = 14;

type Supabase = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type LogRow = { product_id: string | null; created_at: string };
type ProductRow = { id: string; name: string; category: string | null; image_url: string | null; affiliate_url: string; created_at: string; tags: string[] | null };

export type TestRunResult = {
  dryRun: boolean;
  day: string;
  plan: Plan;
  demand: { source: string; ratios: Record<string, number>; fetchedAt: string; searchesToday: number; searchesLeft: number | null } | null;
  exposure: { totalImpressions: number; byCategory: Record<string, number>; avgPerProductDay: number | null };
  active: { id: string; category: string | null; ageDays: number; impressions: number; clicks: number }[];
};

// Real-world demand: the day's planned searches (lib/demand-signal.ts dailyPlan),
// 3 a day. Each successful search is a row in deals_test_events, so a slot that
// already ran today is not run again, and a retry never doubles the spend. Before
// spending, the job asks SerpApi (a free call) how many searches are left and
// stops if that would dip into the reserve. A dry run never spends a search: it
// only reads what was stored. Returns every term's blended demand.
async function loadDemand(
  supabase: Supabase,
  now: number,
  today: string,
  dryRun: boolean,
  log: string[]
): Promise<{ ratios: Record<string, number>; fetchedAt: string; searchesToday: number; searchesLeft: number | null } | null> {
  const { data } = await supabase.from("deals_test_events").select("note, day").eq("event", "demand").order("created_at", { ascending: true });
  const stored: DemandResult[] = [];
  const doneToday = new Set<string>();
  const slotKey = (window: string | undefined, chunk: string[]) => `${window ?? "baseline"}:${chunk.join("|")}`;
  for (const row of data ?? []) {
    try {
      const result = JSON.parse(row.note as string) as DemandResult;
      stored.push(result);
      if (row.day === today) doneToday.add(slotKey(result.window, result.terms));
    } catch {
      log.push("a stored demand row was not readable and was skipped");
    }
  }

  let left: number | null = null;
  const key = process.env.SERPAPI_KEY;
  if (key && !dryRun) {
    const plan = dailyPlan(Object.values(termsByCategory()).flat(), allTrendTerms(), Math.max(0, daysBetween(TEST_FROM, today)));
    const pending = plan.filter((p) => !doneToday.has(slotKey(p.window, p.chunk)));
    if (pending.length > 0) {
      left = await searchesLeft(key);
      if (left === null) {
        log.push("could not read the SerpApi balance: no demand searches today");
      } else if (left - pending.length < RESERVE_SEARCHES) {
        log.push(`SerpApi balance is ${left}: keeping the ${RESERVE_SEARCHES}-search reserve, no demand searches today`);
      } else {
        for (const p of pending) {
          try {
            const result = await fetchDemandChunk(p.chunk, key, fetch, now, p.window);
            if (!result) {
              log.push(`a ${p.window} demand search returned no usable interest data`);
              continue;
            }
            await supabase.from("deals_test_events").insert({ day: today, event: "demand", note: JSON.stringify(result) });
            stored.push(result);
            doneToday.add(slotKey(result.window, result.terms));
            left -= 1;
          } catch (error) {
            log.push(`demand lookup failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }
  }
  if (stored.length === 0) return null;
  const ratios = blendDemand(mergeDemand(stored, "baseline"), mergeDemand(stored, "recent"));
  if (Object.keys(ratios).length === 0) return null;
  const newest = stored.reduce((a, b) => (a.fetchedAt > b.fetchedAt ? a : b));
  return { ratios, fetchedAt: newest.fetchedAt, searchesToday: doneToday.size, searchesLeft: left };
}

export async function runDealsTest(options: { dryRun?: boolean; now?: number } = {}): Promise<TestRunResult & { log: string[] }> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase write config is missing");
  const dryRun = Boolean(options.dryRun);
  const now = options.now ?? Date.now();
  const today = dealsToday(now);
  const log: string[] = [];

  // Who is on the shelf for the test, and since when.
  const { data: tagged } = await supabase
    .from("affiliate_products")
    .select("id, category")
    .eq("status", "active")
    .contains("tags", [TEST_TAG]);
  const activeProducts = (tagged ?? []) as { id: string; category: string | null }[];
  const activeIds = activeProducts.map((p) => p.id);
  const activatedDay = new Map<string, string>();
  if (activeIds.length > 0) {
    const { data: events } = await supabase
      .from("deals_test_events")
      .select("product_id, day")
      .eq("event", "activated")
      .in("product_id", activeIds)
      .order("day", { ascending: false });
    for (const e of events ?? []) if (e.product_id && !activatedDay.has(e.product_id)) activatedDay.set(e.product_id, e.day as string);
  }

  // What the Deals shelves did in the last two weeks (bots left out, as in the stats panel).
  const since = new Date(now - WINDOW_DAYS * DAY).toISOString();
  const [impressions, clicks] = await Promise.all([
    fetchAllRows<LogRow>((from, to) =>
      supabase.from("affiliate_impressions").select("product_id, created_at").like("article_slug", "deals-%").eq("is_bot", false).gte("created_at", since).range(from, to)
    ),
    fetchAllRows<LogRow>((from, to) =>
      supabase.from("affiliate_clicks").select("product_id, created_at").like("article_slug", "deals-%").eq("is_bot", false).gte("created_at", since).range(from, to)
    ),
  ]);

  const active: ActiveTest[] = activeProducts.map((p) => {
    const day = activatedDay.get(p.id) ?? today; // a tagged product with no event starts its clock now
    const mine = (rows: LogRow[]) => rows.filter((r) => r.product_id === p.id && r.created_at.slice(0, 10) >= day).length;
    return { id: p.id, category: p.category, activatedDay: day, impressions: mine(impressions), clicks: mine(clicks) };
  });
  const testIds = new Set(activeIds);
  const rest = (rows: LogRow[]) => rows.filter((r) => !r.product_id || !testIds.has(r.product_id)).length;
  const baseline = { impressions: rest(impressions), clicks: rest(clicks) };

  // Our own volume by product type, and the average a product collects in a day.
  const impressionIds = [...new Set(impressions.map((r) => r.product_id).filter((id): id is string => !!id))];
  const categoryOf = new Map<string, string | null>();
  for (let i = 0; i < impressionIds.length; i += 100) {
    const { data } = await supabase.from("affiliate_products").select("id, category").in("id", impressionIds.slice(i, i + 100));
    for (const row of data ?? []) categoryOf.set(row.id as string, (row.category as string | null) ?? null);
  }
  const byCategory: Record<string, number> = {};
  for (const r of impressions) {
    const category = (r.product_id && categoryOf.get(r.product_id)) || "(none)";
    byCategory[category] = (byCategory[category] ?? 0) + 1;
  }
  const { count: catalogSize } = await supabase.from("affiliate_products").select("id", { count: "exact", head: true }).eq("status", "active").eq("is_partner", false);
  const testDays = active.reduce((n, a) => n + Math.max(1, (now - Date.parse(`${a.activatedDay}T00:00:00Z`)) / DAY), 0);
  const avgPerProductDay =
    active.length > 0 && testDays > 0
      ? active.reduce((n, a) => n + a.impressions, 0) / testDays
      : catalogSize && catalogSize > 0
        ? impressions.length / catalogSize / WINDOW_DAYS
        : null;

  // The proposals the discovery engine has waiting in the test categories.
  const { data: waiting } = await supabase
    .from("affiliate_products")
    .select("id, name, category, image_url, affiliate_url, created_at, tags")
    .eq("status", "inactive")
    .eq("flag_reason", MARKET_SCAN_FLAG)
    .in("category", [...TEST_CATEGORIES])
    .order("created_at", { ascending: true })
    .limit(60);
  const proposals: Proposal[] = ((waiting ?? []) as ProductRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    createdAt: p.created_at,
    hasImage: Boolean(p.image_url),
    hasTag: /[?&]tag=/.test(p.affiliate_url),
  }));

  const demandResult = await loadDemand(supabase, now, today, dryRun, log);
  const demand = demandResult ? demandByCategory(demandResult.ratios, termsByCategory()) : null;
  if (demand && Object.keys(demand).length === 0) log.push("demand data covers none of the test categories yet");

  const plan = planDay({ today, active, proposals, baseline, demand, avgImpressionsPerProductDay: avgPerProductDay, hidden: DEALS_HIDES });

  if (!dryRun) {
    const nowIso = new Date(now).toISOString();
    const eventRows: Record<string, unknown>[] = [];
    const statsOf = new Map(active.map((a) => [a.id, a]));

    for (const r of plan.retire) {
      const { error } = await supabase.from("affiliate_products").update({ status: "inactive", flag_reason: RETIRED_FLAG, flagged_at: nowIso }).eq("id", r.id);
      if (error) log.push(`retire failed for ${r.id}: ${error.message}`);
      else eventRows.push({ day: today, event: "retired", product_id: r.id, category: r.category, impressions: statsOf.get(r.id)?.impressions, clicks: statsOf.get(r.id)?.clicks, note: r.reason });
    }
    for (const g of plan.graduate) {
      const row = (await supabase.from("affiliate_products").select("tags").eq("id", g.id).single()).data as { tags: string[] | null } | null;
      const tags = (row?.tags ?? []).filter((t) => t !== TEST_TAG);
      const { error } = await supabase.from("affiliate_products").update({ tags }).eq("id", g.id);
      if (error) log.push(`graduate failed for ${g.id}: ${error.message}`);
      else eventRows.push({ day: today, event: "graduated", product_id: g.id, category: g.category, impressions: statsOf.get(g.id)?.impressions, clicks: statsOf.get(g.id)?.clicks, note: g.reason });
    }
    for (const a of plan.activate) {
      const row = (await supabase.from("affiliate_products").select("tags").eq("id", a.id).single()).data as { tags: string[] | null } | null;
      const tags = [...new Set([...(row?.tags ?? []), TEST_TAG])];
      // created_at restarts so the rotation's 14-day "new" boost starts now.
      const { error } = await supabase
        .from("affiliate_products")
        .update({ status: "active", flag_reason: null, flagged_at: null, tags, created_at: nowIso })
        .eq("id", a.id);
      if (error) log.push(`activate failed for ${a.id}: ${error.message}`);
      else eventRows.push({ day: today, event: "activated", product_id: a.id, category: a.category, note: a.name });
    }
    if (eventRows.length > 0) await supabase.from("deals_test_events").insert(eventRows);
  }

  return {
    dryRun,
    day: today,
    plan,
    demand: demandResult
      ? { source: "serpapi", ratios: demandResult.ratios, fetchedAt: demandResult.fetchedAt, searchesToday: demandResult.searchesToday, searchesLeft: demandResult.searchesLeft }
      : null,
    exposure: { totalImpressions: impressions.length, byCategory, avgPerProductDay },
    active: active.map((a) => ({ id: a.id, category: a.category, ageDays: Math.round((now - Date.parse(`${a.activatedDay}T00:00:00Z`)) / DAY), impressions: a.impressions, clicks: a.clicks })),
    log,
  };
}
