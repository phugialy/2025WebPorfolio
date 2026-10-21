import { expect, test, type Page } from "@playwright/test";

// One test per click path on the newsletter signup. The subscribe API is
// mocked for the form-state tests so no real email is sent and no real row is
// written; the "real route" tests only use inputs the server rejects before
// touching the database or the mailer.

const SUBSCRIBE_URL = "**/api/newsletter/subscribe";

async function mockSubscribe(page: Page, status: number, body: Record<string, unknown>) {
  const calls: unknown[] = [];
  await page.route(SUBSCRIBE_URL, async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  return calls;
}

// Skip the bar's 8 second delay by scrolling, which also triggers it.
async function revealBar(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByRole("region", { name: "Subscribe to the daily email" })).toBeVisible({ timeout: 30000 });
}

test.describe("slim bar", () => {
  test("appears on the homepage after scrolling, and offers an email field", async ({ page }) => {
    await page.goto("/");
    await revealBar(page);
    const bar = page.locator("div[role=region][aria-label='Subscribe to the daily email']");
    await expect(bar.getByLabel("Email address")).toBeVisible();
    await expect(bar.getByRole("button", { name: "Subscribe" })).toBeVisible();
  });

  test("appears on a blog page", async ({ page }) => {
    await page.goto("/blog");
    await revealBar(page);
  });

  test("does not appear on login, privacy or admin pages", async ({ page }) => {
    for (const path of ["/login", "/privacy", "/admin"]) {
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(1500);
      await expect(
        page.locator("div[role=region][aria-label='Subscribe to the daily email']")
      ).toHaveCount(0);
    }
  });

  test("dismiss hides it and it stays hidden after a reload", async ({ page }) => {
    await page.goto("/");
    await revealBar(page);
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.locator("div[role=region][aria-label='Subscribe to the daily email']")).toHaveCount(0);
    await page.reload();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1500);
    await expect(page.locator("div[role=region][aria-label='Subscribe to the daily email']")).toHaveCount(0);
  });

  test("Escape dismisses it from the keyboard", async ({ page }) => {
    await page.goto("/");
    await revealBar(page);
    await page
      .locator("div[role=region][aria-label='Subscribe to the daily email']")
      .getByLabel("Email address")
      .focus();
    await page.keyboard.press("Escape");
    await expect(page.locator("div[role=region][aria-label='Subscribe to the daily email']")).toHaveCount(0);
  });

  test("does not shift the page layout when it appears", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");
    const before = await page.evaluate(() => document.documentElement.scrollHeight);
    await revealBar(page);
    const after = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(Math.abs(after - before)).toBeLessThan(40);
  });
});

test.describe("form states", () => {
  test("an invalid email shows an inline error and sends no request", async ({ page }) => {
    const calls = await mockSubscribe(page, 200, { ok: true });
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();
    const footerForm = page.locator("footer").getByRole("form", { name: "Subscribe to the daily email" });
    await footerForm.getByLabel("Email address").fill("not-an-email");
    await footerForm.getByRole("button", { name: "Subscribe" }).click();
    await expect(footerForm.getByRole("alert")).toContainText("doesn't look like an email");
    expect(calls).toHaveLength(0);
  });

  test("a valid email shows the check-your-inbox message and sends campaign details", async ({ page }) => {
    const calls = (await mockSubscribe(page, 200, { ok: true })) as Record<string, unknown>[];
    await page.goto("/?utm_source=newsletter-test&utm_medium=e2e&utm_campaign=spring");
    await page.locator("footer").scrollIntoViewIfNeeded();
    const footerForm = page.locator("footer").getByRole("form", { name: "Subscribe to the daily email" });
    await footerForm.getByLabel("Email address").fill("Reader@Example.com");
    await footerForm.getByRole("button", { name: "Subscribe" }).click();
    const message = page.getByText(/Check your inbox for an email from phu@phugialy.com/);
    await expect(message).toBeVisible();
    await expect(message).toBeFocused();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      email: "reader@example.com",
      source: "footer",
      utmSource: "newsletter-test",
      utmMedium: "e2e",
      utmCampaign: "spring",
    });
  });

  test("a server error shows a plain message and keeps the form editable", async ({ page }) => {
    await mockSubscribe(page, 502, { error: "send_failed" });
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();
    const footerForm = page.locator("footer").getByRole("form", { name: "Subscribe to the daily email" });
    await footerForm.getByLabel("Email address").fill("reader@example.com");
    await footerForm.getByRole("button", { name: "Subscribe" }).click();
    await expect(footerForm.getByRole("alert")).toContainText("couldn't send the confirmation email");
    await expect(footerForm.getByLabel("Email address")).toBeEditable();
    await expect(footerForm.getByRole("button", { name: "Subscribe" })).toBeEnabled();
  });

  test("subscribing hides the bar on the next page", async ({ page }) => {
    await mockSubscribe(page, 200, { ok: true });
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();
    const footerForm = page.locator("footer").getByRole("form", { name: "Subscribe to the daily email" });
    await footerForm.getByLabel("Email address").fill("reader@example.com");
    await footerForm.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByText(/Check your inbox/)).toBeVisible();
    await page.goto("/blog");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1500);
    await expect(page.locator("div[role=region][aria-label='Subscribe to the daily email']")).toHaveCount(0);
  });

  test("works by keyboard alone: tab to the field, type, press Enter", async ({ page }) => {
    const calls = await mockSubscribe(page, 200, { ok: true });
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();
    const field = page.locator("footer").getByLabel("Email address");
    await field.focus();
    await page.keyboard.type("keyboard@example.com");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Check your inbox/)).toBeVisible();
    expect(calls).toHaveLength(1);
  });
});

test.describe("placements", () => {
  test("the footer form is on every public page", async ({ page }) => {
    for (const path of ["/", "/blog", "/resources", "/about"]) {
      await page.goto(path);
      await expect(
        page.locator("footer").getByRole("form", { name: "Subscribe to the daily email" })
      ).toBeVisible();
    }
  });

  test("an article ends with a subscribe card", async ({ page, request }) => {
    const sitemap = await request.get("/sitemap.xml");
    const xml = await sitemap.text();
    const slug = /\/blog\/([a-z0-9-]+)</.exec(xml)?.[1];
    test.skip(!slug, "no published article found in the sitemap");
    await page.goto(`/blog/${slug}`);
    const card = page.getByRole("complementary", { name: "Subscribe to the daily email" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("form", { name: "Subscribe to the daily email" })).toBeVisible();
  });
});

test.describe("real routes (inputs the server rejects before any database or email work)", () => {
  test("subscribe: invalid email gives 400", async ({ request }) => {
    const response = await request.post("/api/newsletter/subscribe", { data: { email: "nope" } });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
  });

  test("subscribe: malformed body gives 400", async ({ request }) => {
    const response = await request.post("/api/newsletter/subscribe", {
      headers: { "content-type": "application/json" },
      data: "[1,2,3]",
    });
    expect(response.status()).toBe(400);
  });

  test("subscribe: a filled honeypot looks like success but does nothing", async ({ request }) => {
    const response = await request.post("/api/newsletter/subscribe", {
      data: { email: "bot@example.com", trap: "http://spam.example" },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("one-click unsubscribe with a malformed token gives 400", async ({ request }) => {
    const response = await request.post("/api/newsletter/unsubscribe?token=short");
    expect(response.status()).toBe(400);
  });
});

test.describe("confirm and unsubscribe pages", () => {
  test("a malformed confirm link shows the invalid-link page with a way to retry", async ({ page }) => {
    await page.goto("/newsletter/confirm?token=short");
    await expect(page.getByRole("heading", { name: "That link isn't valid." })).toBeVisible();
    await expect(page.getByRole("main").getByRole("form", { name: "Subscribe to the daily email" })).toBeVisible();
  });

  test("a malformed unsubscribe link explains what to do instead", async ({ page }) => {
    await page.goto("/newsletter/unsubscribe?token=short");
    await expect(page.getByRole("heading", { name: "That link isn't valid." })).toBeVisible();
    await expect(page.getByText(/reply to any email/)).toBeVisible();
  });

  test("the privacy page loads and names the contact address", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "phu@phugialy.com" }).first()).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bar fits the screen without sideways scrolling", async ({ page }) => {
    await page.goto("/");
    await revealBar(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const box = await page.locator("div[role=region][aria-label='Subscribe to the daily email']").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(390);
  });
});
