import { expect, test, type Page } from "@playwright/test";

// One test per click path in the Deals section. These run against real catalog
// data but never click through to a merchant and never write anything.

const catalogCards = (page: Page) => page.locator("section[aria-labelledby=catalog] article");

test.describe("navigation and entry points", () => {
  test("the nav has a highlighted Deals item that opens the hub", async ({ page }) => {
    await page.goto("/about");
    const deals = page.locator("nav").getByRole("link", { name: "Deals", exact: true }).first();
    await expect(deals).toBeVisible();
    await deals.click();
    await expect(page).toHaveURL(/\/deals$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Holiday deals/i);
  });

  test("the homepage strip and the footer both link to Deals", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Holiday Deals: top picks/ })).toBeVisible();
    await expect(page.locator("footer").getByRole("link", { name: "Deals", exact: true })).toBeVisible();
  });

  test("the sitemap lists the hub and every holiday page", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const slug of ["", "/thanksgiving-week", "/black-friday", "/cyber-monday", "/christmas-gifts", "/new-year-setup"]) {
      expect(xml).toContain(`/deals${slug}<`);
    }
  });

  test("the mobile menu has a Deals item", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/about");
    await page.getByRole("button", { name: /menu/i }).first().click();
    await expect(page.getByRole("link", { name: /^Deals/ }).first()).toBeVisible();
  });
});

test.describe("hub page", () => {
  test("shows the disclosure and the four rows in order: series, trending, catalog, guides", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByText(/We earn from qualifying purchases/).first()).toBeVisible();
    const headings = await page.locator("main h2").allInnerTexts();
    const order = ["Top 10 series", "Featured by product type", "Top products by category", "Buying guides"].map((h) =>
      headings.indexOf(h)
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("every product button goes through the tracked redirect with a deals ref and opens in a new tab", async ({ page }) => {
    await page.goto("/deals");
    const links = page.locator("a", { hasText: "View on Amazon" });
    const count = await links.count();
    expect(count).toBeGreaterThan(10);
    for (let i = 0; i < Math.min(count, 15); i++) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute("href", /^\/api\/affiliate\/go\/[0-9a-f-]{36}\?ref=deals-/);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /sponsored/);
    }
  });

  test("no product card states a price or a percent off", async ({ page }) => {
    await page.goto("/deals");
    const text = await page.locator("main article").allInnerTexts();
    for (const block of text) {
      expect(block).not.toMatch(/\$\s?\d/);
      expect(block).not.toMatch(/\d+\s?%\s?off/i);
    }
  });

  test("has an SEO title, description, canonical link and an ItemList", async ({ page }) => {
    await page.goto("/deals");
    await expect(page).toHaveTitle(/Holiday Deals 2026/);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description!.length).toBeGreaterThan(80);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/deals$/);
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(json!)["@type"]).toBe("ItemList");
  });
});

test.describe("row 1: the pinned Top 10 series", () => {
  test("is a carousel with a card per holiday list, each with its own niche", async ({ page }) => {
    await page.goto("/deals");
    const carousel = page.getByRole("region", { name: "Pinned Top 10 series" });
    await expect(carousel).toBeVisible();
    expect(await carousel.locator("li a").count()).toBeGreaterThanOrEqual(5);
    for (const name of ["Thanksgiving", "Black Friday", "Cyber Monday", "Christmas", "New Year"]) {
      await expect(carousel.locator("li a", { hasText: new RegExp(name) }).first()).toHaveAttribute("href", /\/deals\//);
    }
    const niches = await carousel.locator("li a span.uppercase").allInnerTexts();
    expect(new Set(niches).size).toBe(niches.length);
  });

  test("the arrow buttons scroll the row", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/deals");
    const carousel = page.getByRole("region", { name: "Pinned Top 10 series" });
    const track = carousel.locator("ul");
    const next = carousel.getByRole("button", { name: "Next Top 10 series" });
    const previous = carousel.getByRole("button", { name: "Previous Top 10 series" });
    await expect(previous).toBeDisabled();
    await next.click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
    await expect(previous).toBeEnabled();
  });

  test("a card opens its Top 10 page", async ({ page }) => {
    await page.goto("/deals");
    await page.getByRole("region", { name: "Pinned Top 10 series" }).locator("li a", { hasText: "Black Friday" }).first().click();
    await expect(page).toHaveURL(/\/deals\/black-friday$/);
  });
});

test.describe("row 2: featured by product type", () => {
  const featured = (page: Page) => page.locator("section[aria-labelledby=featured]");

  test("has a tab and a slide for each product type, with a lead pick and four more in each", async ({ page }) => {
    await page.goto("/deals");
    const tabs = featured(page).getByRole("tab");
    expect(await tabs.count()).toBeGreaterThanOrEqual(4);
    const slides = featured(page).locator("li[aria-roledescription=slide]");
    expect(await slides.count()).toBe(await tabs.count());
    await expect(slides.first().locator("article")).toHaveCount(5);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  });

  test("the arrows and the tabs move between product types, and a slide links to its full row", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/deals");
    const tabs = featured(page).getByRole("tab");
    await featured(page).getByRole("button", { name: "Next product type" }).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await featured(page).getByRole("button", { name: "Previous product type" }).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    // The active slide's "See all" link jumps to a real row further down the page.
    const see = featured(page).locator("li[aria-roledescription=slide]").nth(1).getByRole("link", { name: /See all/ });
    const href = await see.getAttribute("href");
    expect(href).toMatch(/^#category-/);
    await expect(page.locator(href!)).toHaveCount(1);
  });

  test("the type tabs work from the keyboard: arrows move between them, and only the selected tab is tabbable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/deals");
    const tabs = featured(page).getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("tabindex", "0");
    await expect(tabs.first()).toHaveAttribute("tabindex", "-1");
    await page.keyboard.press("End");
    await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    // Each tab controls a panel that exists.
    const controls = await tabs.first().getAttribute("aria-controls");
    await expect(page.locator(`[id="${controls}"]`)).toHaveCount(1);
  });

  test("no page id is used twice on the hub, even though products appear in the carousel and in their rows", async ({ page }) => {
    await page.goto("/deals");
    const ids = await page.evaluate(() => [...document.querySelectorAll("[id]")].map((el) => el.id));
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(repeated).toEqual([]);
  });

  test("nothing moves on its own", async ({ page }) => {
    await page.goto("/deals");
    const tabs = featured(page).getByRole("tab");
    await page.waitForTimeout(6000);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("the Amazon deals placement", () => {
  test("is a large, tagged, sponsored link to Amazon's deals page near the top, with no price claim", async ({ page }) => {
    await page.goto("/deals");
    const banner = page.getByRole("complementary", { name: "Amazon holiday deals" });
    await expect(banner).toBeVisible();
    const link = banner.getByRole("link", { name: /See today's Amazon deals/ });
    await expect(link).toHaveAttribute("href", /^https:\/\/www\.amazon\.com\/deals\?tag=/);
    await expect(link).toHaveAttribute("rel", /sponsored/);
    await expect(link).toHaveAttribute("target", "_blank");
    const box = (await link.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(await banner.innerText()).not.toMatch(/\$\s?\d|\d\s?%/);
    // It sits above the first section, and the disclosure is right beside it.
    const bannerTop = (await banner.boundingBox())!.y;
    const seriesTop = (await page.locator("#series").boundingBox())!.y;
    expect(bannerTop).toBeLessThan(seriesTop);
    await expect(page.getByText(/We earn from qualifying purchases/).first()).toBeVisible();
  });
});

test.describe("row 3: category rows", () => {
  const rowsIn = (page: Page) => page.locator("section[aria-labelledby=catalog] section");

  test("has one titled row per product category, each product shown once", async ({ page }) => {
    await page.goto("/deals");
    const rows = rowsIn(page);
    expect(await rows.count()).toBeGreaterThanOrEqual(5);
    // Rows are named for what shoppers look for, not for holidays.
    for (const name of ["Mini PCs and AI hardware", "Monitors", "Keyboards and mice"]) {
      await expect(page.locator("section[aria-labelledby=catalog]").getByRole("heading", { level: 3, name: new RegExp(`^${name}`) })).toBeVisible();
    }
    for (const holiday of ["Thanksgiving", "Christmas"]) {
      await expect(page.locator("section[aria-labelledby=catalog]").getByRole("heading", { level: 3, name: new RegExp(`^${holiday}`) })).toHaveCount(0);
    }
    for (let i = 0; i < (await rows.count()); i++) {
      expect(await rows.nth(i).locator("article").count()).toBeGreaterThanOrEqual(2);
    }
    // No product appears in two rows.
    const ids = await page.locator("section[aria-labelledby=catalog] section article").evaluateAll((els) => els.map((el) => el.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("there is no Books row", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.locator("section[aria-labelledby=catalog]").getByRole("heading", { level: 3, name: /^Books/ })).toHaveCount(0);
  });

  test("a row scrolls sideways with its arrows, and Back starts disabled", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/deals");
    const row = rowsIn(page).first();
    const list = row.locator("ul");
    expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const back = row.getByRole("button", { name: /back$/ });
    const forward = row.getByRole("button", { name: /forward$/ });
    await expect(back).toBeDisabled();
    await forward.click();
    await expect.poll(() => list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
    await expect(back).toBeEnabled();
  });

  test("searching swaps the rows for matches, and a search with no match offers to clear", async ({ page }) => {
    await page.goto("/deals");
    await page.getByLabel("Search products").fill("keyboard");
    await expect(page.getByRole("status").filter({ hasText: /match/ })).toBeVisible();
    await expect(rowsIn(page)).toHaveCount(0);
    await page.getByLabel("Search products").fill("zzzzqqqq");
    await expect(page.getByText("Nothing matches that search.")).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    expect(await rowsIn(page).count()).toBeGreaterThanOrEqual(3);
  });

  test("shop by size narrows the catalog to one size of purchase and shows no price", async ({ page }) => {
    await page.goto("/deals");
    const catalog = page.locator("section[aria-labelledby=catalog]");
    const group = catalog.getByRole("radiogroup", { name: "Size of purchase" });
    await expect(group).toBeVisible();
    await expect(group.getByRole("radio", { name: /^Everything/ })).toHaveAttribute("aria-checked", "true");
    await expect(catalog.getByText(/describe the kind of product, not today's price/)).toBeVisible();

    await group.getByRole("radio", { name: /^Big purchases/ }).click();
    await expect(group.getByRole("radio", { name: /^Big purchases/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("status").filter({ hasText: /match/ })).not.toHaveText(/^0 /);
    await expect(rowsIn(page)).toHaveCount(0);
    const labels = catalog.locator("[data-deals-size-label]");
    expect(await labels.count()).toBeGreaterThan(3);
    for (const label of await labels.all()) await expect(label).toHaveAttribute("data-deals-size-label", "big");
    // No dollar amount anywhere in the catalog results.
    expect(await catalog.innerText()).not.toMatch(/\$\s?\d/);

    // Clearing brings the category rows back.
    await group.getByRole("radio", { name: /^Everything/ }).click();
    expect(await rowsIn(page).count()).toBeGreaterThanOrEqual(3);
  });

  test("works by keyboard: tab to the search box, type, and the list updates", async ({ page }) => {
    await page.goto("/deals");
    await page.getByLabel("Search products").focus();
    await page.keyboard.type("mini");
    await expect(page.getByRole("status").filter({ hasText: /match/ })).not.toHaveText(/^0 /);
  });

  test("every product link is a tracked sponsored link that opens in a new tab", async ({ page }) => {
    await page.goto("/deals");
    // A card can also carry a "Read the guide" link to our own article. It is
    // not a product link: it is internal, same tab, and not sponsored.
    const links = page.locator("section[aria-labelledby=catalog] article a:not([data-deals-guide])");
    expect(await links.count()).toBeGreaterThan(10);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("rel", /sponsored/);
      await expect(link).toHaveAttribute("href", /\/api\/affiliate\/go\//);
      await expect(link).toHaveAttribute("target", "_blank");
    }
    for (const guide of await page.locator("section[aria-labelledby=catalog] article a[data-deals-guide]").all()) {
      await expect(guide).toHaveAttribute("href", /^\/blog\//);
      await expect(guide).not.toHaveAttribute("rel", /sponsored/);
      await expect(guide).not.toHaveAttribute("target", "_blank");
    }
  });

  test("no product shows the Amazon placeholder logo as its picture", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.locator('img[src*="share-icons"], img[src$="/amazon.png"]')).toHaveCount(0);
  });
});

test.describe("row 4: buying guides", () => {
  test("is present, with the guides or a pointer to the Top 10 lists", async ({ page }) => {
    await page.goto("/deals");
    const section = page.locator("section[aria-labelledby=guides]");
    await expect(section).toBeVisible();
    await expect(section.locator("a").first()).toBeVisible();
  });
});

test.describe("page length", () => {
  test("the page is a sensible length on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/deals");
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThan(15000);
  });
});

test.describe("holiday landing pages", () => {
  for (const [slug, name] of [
    ["thanksgiving-week", "Thanksgiving"],
    ["black-friday", "Black Friday"],
    ["cyber-monday", "Cyber Monday"],
    ["christmas-gifts", "Christmas"],
    ["new-year-setup", "New Year"],
  ]) {
    test(`${name}: a numbered Top 10 with SEO tags, breadcrumbs and structured data`, async ({ page }) => {
      await page.goto(`/deals/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Top 10");
      await expect(page).toHaveTitle(new RegExp(name));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/deals/${slug}$`));
      const cards = page.locator("ol > li article");
      const count = await cards.count();
      expect(count).toBeGreaterThan(3);
      expect(count).toBeLessThanOrEqual(10);
      await expect(cards.first()).toContainText("#1");
      const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
        (t) => JSON.parse(t)["@type"]
      );
      expect(types).toEqual(expect.arrayContaining(["BreadcrumbList", "ItemList"]));
      await expect(page.getByText(/We earn from qualifying purchases/).first()).toBeVisible();
    });
  }

  test("the other holiday links navigate between lists", async ({ page }) => {
    await page.goto("/deals/black-friday");
    await page.getByRole("link", { name: "Cyber Monday" }).last().click();
    await expect(page).toHaveURL(/\/deals\/cyber-monday$/);
  });

  test("an unknown holiday is a 404", async ({ page }) => {
    const response = await page.goto("/deals/not-a-holiday");
    expect(response?.status()).toBe(404);
  });
});

test.describe("newsletter card on the Deals pages", () => {
  test("signing up from the hub records the deals-page source", async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route("**/api/newsletter/subscribe", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.goto("/deals");
    const card = page.getByRole("complementary", { name: "Subscribe to the daily email" });
    await card.scrollIntoViewIfNeeded();
    await card.getByLabel("Email address").fill("reader@example.com");
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByText(/Check your inbox/)).toBeVisible();
    expect(body).toMatchObject({ email: "reader@example.com", source: "deals-page" });
  });

  test("the sticky signup bar stays off the Deals pages, which carry their own card", async ({ page }) => {
    for (const path of ["/deals", "/deals/black-friday"]) {
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(600);
      await expect(page.getByText("The top AI stories, in your inbox every day.")).toHaveCount(0);
    }
  });

  test("rail headings read with a separator, not as 'Thanksgiving30'", async ({ page }) => {
    await page.goto("/deals");
    const heading = page.locator("section[aria-labelledby=catalog] h3").first();
    expect(await heading.textContent()).toMatch(/^[A-Za-z ]+: ?\d+$/);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the hub fits a phone screen without sideways scrolling", async ({ page }) => {
    await page.goto("/deals");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
  test("a row scrolls by itself, not the page", async ({ page }) => {
    await page.goto("/deals");
    const list = page.locator("section[aria-labelledby=catalog] section ul").first();
    await expect(list).toBeVisible();
    expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
  test("a Top 10 page leads with a full-width picture and shows later picks as short rows", async ({ page }) => {
    await page.goto("/deals/black-friday");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const cards = page.locator("main ol > li article");
    await expect(cards).toHaveCount(10);
    // The lead pick's picture spans (nearly) the whole phone width.
    const lead = await cards.nth(0).locator("img, div.bg-muted").first().boundingBox();
    expect(lead!.width).toBeGreaterThan(390 * 0.85);
    // Picks four and later are rows: much shorter than the lead card.
    const leadHeight = (await cards.nth(0).boundingBox())!.height;
    const tileHeight = (await cards.nth(5).boundingBox())!.height;
    expect(tileHeight).toBeLessThan(leadHeight * 0.6);
  });
});

test.describe("Deals manager (admin only)", () => {
  const id = "aede1291-e3e7-427b-9b7e-6e7b484d224b";
  test("the list and every edit refuse a visitor who is not signed in as admin", async ({ request }) => {
    expect([401, 403]).toContain((await request.get("/api/admin/deals")).status());
    expect([401, 403]).toContain((await request.patch(`/api/admin/deals/${id}`, { data: { hidden: true } })).status());
    expect([401, 403]).toContain((await request.delete(`/api/admin/deals/${id}`)).status());
  });
  test("the manager page does not show products to a visitor", async ({ page }) => {
    await page.goto("/admin/deals");
    await expect(page.getByTestId("deals-manager-row")).toHaveCount(0);
  });
});
