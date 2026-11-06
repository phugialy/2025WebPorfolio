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
    const order = ["Top 10 series", "Trending now", "Top products by category", "Buying guides"].map((h) =>
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

test.describe("row 2: trending", () => {
  test("shows five ranked products", async ({ page }) => {
    await page.goto("/deals");
    const cards = page.locator("section[aria-labelledby=trending] article");
    await expect(cards).toHaveCount(5);
    await expect(cards.first()).toContainText("#1");
  });
});

test.describe("row 3: the catalog grid", () => {
  test("starts on Trends with 10 products a page and a count line", async ({ page }) => {
    await page.goto("/deals");
    const group = page.getByRole("group", { name: "Browse by category" });
    await expect(group.getByRole("button", { name: "Trends", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(catalogCards(page)).toHaveCount(10);
    await expect(page.getByRole("status").filter({ hasText: /^Showing 1 to 10 of \d+ products$/ })).toBeVisible();
  });

  test("has tabs for Trends, the holidays and the niches", async ({ page }) => {
    await page.goto("/deals");
    const group = page.getByRole("group", { name: "Browse by category" });
    for (const name of ["Trends", "Thanksgiving", "Christmas", "Technology", "AI"]) {
      await expect(group.getByRole("button", { name, exact: true })).toBeVisible();
    }
  });

  test("a tab changes the list, is marked pressed, and goes back to page 1", async ({ page }) => {
    await page.goto("/deals");
    const group = page.getByRole("group", { name: "Browse by category" });
    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Showing 11 to/ })).toBeVisible();
    const ai = group.getByRole("button", { name: "AI", exact: true });
    await ai.click();
    await expect(ai).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("status").filter({ hasText: /^Showing 1 to/ })).toBeVisible();
  });

  test("paging: page 2 shows the next 10 with ranks 11 to 20, and back again", async ({ page }) => {
    await page.goto("/deals");
    const first = await catalogCards(page).first().locator("h3").innerText();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    await expect(catalogCards(page).first()).toContainText("#11");
    expect(await catalogCards(page).first().locator("h3").innerText()).not.toBe(first);
    await expect(page.getByRole("button", { name: "Previous page" })).toBeEnabled();
    await page.getByRole("button", { name: "Page 1" }).click();
    await expect(catalogCards(page).first()).toContainText("#1");
    await expect(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  test("a tab never has more than 3 pages", async ({ page }) => {
    await page.goto("/deals");
    const pageButtons = page.getByRole("navigation", { name: "Catalog pages" }).getByRole("button", { name: /^Page \d+$/ });
    expect(await pageButtons.count()).toBeLessThanOrEqual(3);
    expect(await pageButtons.count()).toBeGreaterThanOrEqual(2);
  });

  test("searching narrows the list, and a search with no match offers to clear", async ({ page }) => {
    await page.goto("/deals");
    await page.getByLabel("Search products").fill("keyboard");
    await expect(page.getByRole("status").filter({ hasText: /^Showing/ })).toBeVisible();
    await page.getByLabel("Search products").fill("zzzzqqqq");
    await expect(page.getByText("Nothing matches that search.")).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(catalogCards(page)).toHaveCount(10);
  });

  test("works by keyboard: tab to the search box, type, and the list updates", async ({ page }) => {
    await page.goto("/deals");
    await page.getByLabel("Search products").focus();
    await page.keyboard.type("mini");
    await expect(page.getByRole("status").filter({ hasText: /^Showing/ })).not.toHaveText(/of 0 /);
  });

  test("no product shows the Amazon placeholder logo as its picture, on any page", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.locator('img[src*="share-icons"], img[src$="/amazon.png"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Next page" }).click();
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
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the hub fits a phone screen without sideways scrolling", async ({ page }) => {
    await page.goto("/deals");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
  test("the tab strip scrolls by itself, not the page", async ({ page }) => {
    await page.goto("/deals");
    const group = page.getByRole("group", { name: "Browse by category" });
    await expect(group).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
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
