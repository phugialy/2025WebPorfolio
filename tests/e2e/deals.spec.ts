import { expect, test } from "@playwright/test";

// One test per click path in the Deals section. These run against real catalog
// data but never click through to a merchant and never write anything.

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
    for (const slug of ["", "/black-friday", "/cyber-monday", "/christmas-gifts", "/new-year-setup"]) {
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
  test("shows the disclosure, the holiday lists, trending products and the finder", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByText(/We earn from qualifying purchases/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top 10 by holiday" })).toBeVisible();
    for (const name of ["Black Friday", "Cyber Monday", "Christmas", "New Year"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${name}`) }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Trending now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Find a product" })).toBeVisible();
  });

  test("every product button goes through the tracked redirect with a deals ref and opens in a new tab", async ({ page }) => {
    await page.goto("/deals");
    const links = page.locator("a", { hasText: "View on Amazon" });
    const count = await links.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < Math.min(count, 12); i++) {
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

test.describe("the product finder", () => {
  test("searching narrows the list, and a search with no match offers to clear", async ({ page }) => {
    await page.goto("/deals");
    const status = page.getByRole("status").filter({ hasText: /products?$/ });
    const before = parseInt((await status.innerText()).split(" ")[0], 10);
    expect(before).toBeGreaterThan(10);
    await page.getByLabel("Search products").fill("keyboard");
    const after = parseInt((await status.innerText()).split(" ")[0], 10);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    await page.getByLabel("Search products").fill("zzzzqqqq");
    await expect(page.getByText("Nothing matches that search.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    expect(parseInt((await status.innerText()).split(" ")[0], 10)).toBe(before);
  });

  test("a category chip filters, and is marked pressed", async ({ page }) => {
    await page.goto("/deals");
    const group = page.getByRole("group", { name: "Filter by category" });
    const status = page.getByRole("status").filter({ hasText: /products?$/ });
    const before = parseInt((await status.innerText()).split(" ")[0], 10);
    const monitors = group.getByRole("button", { name: "Monitors and displays" });
    await monitors.click();
    await expect(monitors).toHaveAttribute("aria-pressed", "true");
    const after = parseInt((await status.innerText()).split(" ")[0], 10);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    await group.getByRole("button", { name: "All", exact: true }).click();
    expect(parseInt((await status.innerText()).split(" ")[0], 10)).toBe(before);
  });

  test("sorting by name puts the results in alphabetical order", async ({ page }) => {
    await page.goto("/deals");
    await page.getByLabel("Sort").selectOption("name");
    const names = await page.locator("#explore ~ div article h3, section[aria-labelledby=explore] article h3").allInnerTexts();
    expect(names.length).toBeGreaterThan(5);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test("works by keyboard: tab to the search box, type, and the count updates", async ({ page }) => {
    await page.goto("/deals");
    await page.getByLabel("Search products").focus();
    await page.keyboard.type("book");
    await expect(page.getByRole("status").filter({ hasText: /products?$/ })).not.toHaveText(/^0 /);
  });
});

test.describe("page length and images", () => {
  test("the finder shows 12 at first and Show more reveals the next batch", async ({ page }) => {
    await page.goto("/deals");
    const cards = page.locator("section[aria-labelledby=explore] article");
    await expect(cards).toHaveCount(12);
    const more = page.getByRole("button", { name: /^Show \d+ more/ });
    await more.click();
    await expect(cards).toHaveCount(24);
  });

  test("changing the search or a filter goes back to the first 12", async ({ page }) => {
    await page.goto("/deals");
    const cards = page.locator("section[aria-labelledby=explore] article");
    await page.getByRole("button", { name: /^Show \d+ more/ }).click();
    await expect(cards).toHaveCount(24);
    await page.getByRole("group", { name: "Filter by category" }).getByRole("button", { name: "All", exact: true }).click();
    await expect(cards).toHaveCount(12);
  });

  test("no product shows Amazon's placeholder logo as its picture", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.locator('img[src*="share-icons"], img[src$="/amazon.png"]')).toHaveCount(0);
    const more = page.getByRole("button", { name: /^Show \d+ more/ });
    while (await more.isVisible().catch(() => false)) await more.click();
    await expect(page.locator('img[src*="share-icons"], img[src$="/amazon.png"]')).toHaveCount(0);
  });

  test("the page is a sensible length on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/deals");
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThan(20000);
  });
});

test.describe("holiday landing pages", () => {
  for (const [slug, name] of [
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
});
