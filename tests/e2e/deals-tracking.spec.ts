import { expect, test, type Page } from "@playwright/test";

// What the Deals pages report. The receiving endpoints are faked and Google
// Analytics is replaced by a recorder, so nothing real is written and no click
// goes through to a merchant.

type Impression = { productId: string; ref: string };
type GaEvent = { name: string; params: Record<string, string> };

async function openDeals(page: Page, path = "/deals") {
  const impressions: Impression[] = [];
  // Google Analytics is recorded through the page's own dataLayer, which is where
  // gtag() writes whether or not the real script is configured here.
  await page.addInitScript(() => {
    const w = window as unknown as { dataLayer: unknown[]; gtag?: (...a: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
  });
  await page.route("**/api/deals/track", async (route) => {
    const body = route.request().postDataJSON() as { impressions: Impression[] };
    impressions.push(...body.impressions);
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/affiliate/go/**", (route) => route.fulfill({ status: 200, body: "ok" }));
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30000 });
  // Clicks are still seen by the page's own listeners, but never navigate or open a tab.
  await page.evaluate(() => document.addEventListener("click", (event) => event.preventDefault(), true));
  return impressions;
}

const gaEvents = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer || [])
      .filter((entry) => entry[0] === "event")
      .map((entry) => ({ name: entry[1] as string, params: entry[2] as Record<string, string> }))
  ) as Promise<GaEvent[]>;

test.describe("deals impressions", () => {
  test("cards on screen are reported in a batch, under the same label their link carries", async ({ page }) => {
    const impressions = await openDeals(page);
    await page.locator("section[aria-labelledby=featured]").scrollIntoViewIfNeeded();
    await expect.poll(() => impressions.length, { timeout: 15000 }).toBeGreaterThan(0);

    const trending = impressions.filter((i) => i.ref.startsWith("deals-spotlight-"));
    expect(trending.length).toBeGreaterThan(0);
    for (const item of impressions) expect(item.ref).toMatch(/^deals-/);

    // The label on the impression is the label on the outbound link of the same card.
    const first = trending[0];
    const href = await page
      .locator(`section[aria-labelledby=featured] a[data-deals-product="${first.productId}"]`)
      .first()
      .getAttribute("href");
    expect(href).toContain(`ref=${encodeURIComponent(first.ref)}`);
  });

  test("a card is only counted once, however often it scrolls into view", async ({ page }) => {
    const impressions = await openDeals(page);
    const trending = page.locator("section[aria-labelledby=featured]");
    await trending.scrollIntoViewIfNeeded();
    await expect.poll(() => impressions.length, { timeout: 15000 }).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await trending.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    const keys = impressions.map((i) => `${i.ref}:${i.productId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("a holiday page uses its own label", async ({ page }) => {
    const impressions = await openDeals(page, "/deals/black-friday");
    await page.locator("section[aria-label] ol").first().scrollIntoViewIfNeeded();
    await expect.poll(() => impressions.length, { timeout: 15000 }).toBeGreaterThan(0);
    expect(new Set(impressions.map((i) => i.ref))).toEqual(new Set(["deals-black-friday"]));
  });
});

test.describe("deals interactions", () => {
  test("opening a product reports its section and rank", async ({ page }) => {
    await openDeals(page);
    const card = page.locator("section[aria-labelledby=featured] article").nth(1);
    await card.scrollIntoViewIfNeeded();
    await card.getByRole("link", { name: /View on Amazon/ }).click();
    const events = await gaEvents(page);
    const click = events.find((e) => e.name === "deals_product_click");
    expect(click).toBeTruthy();
    expect(click!.params).toMatchObject({ rank: "2" });
    expect(click!.params.section).toMatch(/^deals-spotlight-/);
    expect(click!.params.product_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("a row's arrows and the series arrows are reported", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDeals(page);
    await page.getByRole("button", { name: "Next Top 10 series" }).click();
    const row = page.locator("section[aria-labelledby=catalog] section").first();
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: /forward$/ }).click();
    const events = await gaEvents(page);
    expect(events.find((e) => e.name === "series_scroll")?.params).toEqual({ direction: "forward" });
    const railEvent = events.find((e) => e.name === "rail_scroll");
    expect(railEvent?.params.direction).toBe("forward");
    expect(railEvent?.params.row).toBeTruthy();
  });

  test("a Top 10 series card is reported with its position", async ({ page }) => {
    await openDeals(page);
    await page.locator("section[aria-labelledby=series] a").first().click();
    const events = await gaEvents(page);
    const series = events.find((e) => e.name === "deals_series_click");
    expect(series?.params.position).toBe("1");
  });

  test("a search is reported once the reader stops typing, with how many matched", async ({ page }) => {
    await openDeals(page);
    await page.getByRole("searchbox", { name: "Search products" }).fill("keyboard");
    await expect.poll(async () => (await gaEvents(page)).filter((e) => e.name === "deals_search").length, { timeout: 8000 }).toBe(1);
    const search = (await gaEvents(page)).find((e) => e.name === "deals_search")!;
    expect(search.params.term).toBe("keyboard");
    expect(Number(search.params.result_count)).toBeGreaterThan(0);
  });
});

test.describe("tracking endpoint", () => {
  const GOOD = "00000000-0000-4000-8000-000000000000"; // a well-formed id that is no product

  test("takes a well-formed batch, but records nothing for a product that is not live", async ({ request }) => {
    const response = await request.post("/api/deals/track", { data: { impressions: [{ productId: GOOD, ref: "deals-trending" }] } });
    expect(response.status()).toBe(204);
  });

  test("turns away labels, ids and batches it should not accept", async ({ request }) => {
    const post = (data: unknown) => request.post("/api/deals/track", { data }).then((r) => r.status());
    expect(await post({ impressions: [{ productId: GOOD, ref: "blog-index-ambit" }] })).toBe(400);
    expect(await post({ impressions: [{ productId: "not-an-id", ref: "deals-trending" }] })).toBe(400);
    expect(await post({ impressions: [] })).toBe(400);
    expect(await post({})).toBe(400);
    expect(
      await post({ impressions: Array.from({ length: 41 }, () => ({ productId: GOOD, ref: "deals-trending" })) })
    ).toBe(400);
  });
});
