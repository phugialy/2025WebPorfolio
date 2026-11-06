import { expect, test, type Page } from "@playwright/test";

// The blog index as rows. These read the real article feed but never write anything.

const rows = (page: Page) => page.locator("[data-testid=blog-rows] section");
const openBlog = async (page: Page) => {
  await page.goto("/blog");
  await expect(page.getByTestId("blog-rows")).toBeVisible({ timeout: 20000 });
};

test.describe("blog rows", () => {
  test("starts with two New rows, then Trending and Most read, then topic rows", async ({ page }) => {
    await openBlog(page);
    const titles = await rows(page).locator("h3").allInnerTexts();
    expect(titles.slice(0, 4).map((t) => t.trim())).toEqual(["Just in", "New this week", "Trending now", "Most read"]);
    expect(titles.length).toBeGreaterThanOrEqual(7);
    expect(titles.join(" ")).toMatch(/Engineering and software/);
  });

  test("every row has several notes, and the top story is not repeated in them", async ({ page }) => {
    await openBlog(page);
    const lead = await page.locator("section[aria-label='Latest story'] a").first().getAttribute("href");
    for (let i = 0; i < (await rows(page).count()); i++) {
      expect(await rows(page).nth(i).locator("article").count()).toBeGreaterThanOrEqual(3);
    }
    expect(lead).toMatch(/^\/blog\//);
    await expect(page.locator(`[data-testid=blog-rows] a[href="${lead}"]`)).toHaveCount(0);
  });

  test("a card opens its note", async ({ page }) => {
    await openBlog(page);
    await rows(page).first().locator("a").first().click();
    await expect(page).toHaveURL(/\/blog\/.+/, { timeout: 45000 });
  });

  test("a row scrolls sideways with its arrows", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openBlog(page);
    const row = rows(page).nth(1);
    const list = row.locator("ul");
    expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(row.getByRole("button", { name: /back$/ })).toBeDisabled();
    await row.getByRole("button", { name: /forward$/ }).click();
    await expect.poll(() => list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
  });

  test("search and the Filters button stay on screen while you scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openBlog(page);
    await rows(page).nth(5).scrollIntoViewIfNeeded();
    await expect(page.getByLabel("Search stories")).toBeInViewport();
    await expect(page.getByRole("button", { name: /^Filters/ })).toBeInViewport();
  });

  test("no chip bands sit above the rows; the filters stay hidden until asked for", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openBlog(page);
    await expect(page.getByTestId("filter-drawer")).toBeHidden();
    // The panel's groups are not in the accessibility tree while it is closed.
    await expect(page.getByRole("group", { name: "Browse by theme" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Tags" })).toHaveCount(0);
    const top = await rows(page).first().locator("h3").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    expect(top).toBeGreaterThan(0);
  });

  test("Filters opens a side panel with topics, focus areas and tags, and Escape closes it", async ({ page }) => {
    await openBlog(page);
    const button = page.getByRole("button", { name: /^Filters/ });
    await button.click();
    const drawer = page.getByRole("dialog", { name: "Filters" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("group", { name: "Browse by theme" }).getByRole("button")).toHaveCount(6);
    await expect(drawer.getByRole("group", { name: "Focus area" }).getByRole("button").first()).toBeVisible();
    await expect(drawer.getByRole("group", { name: "Tags" }).getByRole("button").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("clicking outside the panel closes it", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openBlog(page);
    await page.getByRole("button", { name: /^Filters/ }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await page.mouse.click(100, 400);
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeHidden();
  });

  test("a topic swaps the rows for that topic's notes, shows a pill and a count, and Clear brings the rows back", async ({ page }) => {
    await openBlog(page);
    await page.getByRole("button", { name: /^Filters/ }).click();
    const drawer = page.getByRole("dialog", { name: "Filters" });
    const chip = drawer.getByRole("group", { name: "Browse by theme" }).getByRole("button", { name: "Business and work" });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await drawer.getByRole("button", { name: /^Show \d+ (story|stories)$/ }).click();
    await expect(drawer).toBeHidden();
    await expect(page.getByTestId("blog-rows")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Matching stories" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove filter Business and work" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Filters/ })).toContainText("1");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByTestId("blog-rows")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Remove filter/ })).toHaveCount(0);
  });

  test("a tag can be found by typing, picked, and removed from its pill", async ({ page }) => {
    await openBlog(page);
    await page.getByRole("button", { name: /^Filters/ }).click();
    const drawer = page.getByRole("dialog", { name: "Filters" });
    await drawer.getByLabel("Find a tag").fill("agent");
    const first = drawer.getByRole("group", { name: "Tags" }).getByRole("button").first();
    const name = (await first.innerText()).trim();
    expect(name.toLowerCase()).toContain("agent");
    await first.click();
    await drawer.getByRole("button", { name: /^Show \d+ (story|stories)$/ }).click();
    await expect(page.getByTestId("blog-rows")).toHaveCount(0);
    await page.getByRole("button", { name: `Remove filter ${name}` }).click();
    await expect(page.getByTestId("blog-rows")).toBeVisible();
  });

  test("See all on a topic row filters to that topic", async ({ page }) => {
    await openBlog(page);
    await page.getByRole("button", { name: /^See all/ }).first().click();
    await expect(page.getByTestId("blog-rows")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Remove filter/ })).toHaveCount(1);
  });

  test("searching still works and hides the rows", async ({ page }) => {
    await openBlog(page);
    await page.getByLabel("Search stories").fill("agents");
    await expect(page.getByTestId("blog-rows")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: /matching/ })).toBeVisible();
  });

  test("the guides tile links to Deals", async ({ page }) => {
    await openBlog(page);
    await expect(page.getByTestId("blog-rows").getByRole("link", { name: /Holiday buying guides/ })).toHaveAttribute("href", "/deals");
  });

  test("the archive is still there with every other note", async ({ page }) => {
    await openBlog(page);
    await expect(page.getByRole("heading", { name: "All stories" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /in the archive/ })).toBeVisible();
  });
});

test.describe("blog rows on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the page does not scroll sideways, but a row does", async ({ page }) => {
    await openBlog(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const list = rows(page).first().locator("ul");
    expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });
});
