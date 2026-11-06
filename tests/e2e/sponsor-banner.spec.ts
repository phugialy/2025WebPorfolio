import { expect, test, type Page } from "@playwright/test";

// The sponsor strip on the blog index. The partner list and the impression
// endpoint are faked, so this never reads live partner rows and never writes a
// real impression.

const AMBIT = {
  id: "25aa1e2c-a0f7-4c24-aeb4-cbc28fd440a9",
  name: "Ambit Energy",
  brand: "Ambit Energy",
  is_partner: true,
  status: "active",
  network: "other",
  category: "Energy & Utilities",
  image_url: "/brand/ambit/ambit-independent-consultant-logo.svg",
  description: "Ambit Energy is a retail energy provider.",
  tags: [],
};
const ELEVEN = {
  id: "c1de703d-33dd-4a38-8964-00ac5da515e9",
  name: "ElevenLabs",
  brand: "ElevenLabs",
  is_partner: true,
  status: "active",
  network: "other",
  category: "AI Voice & Audio Tools",
  image_url: null,
  description: "AI voice platform for realistic text-to-speech and voice cloning.",
  tags: [],
};

async function openBlog(page: Page, partners: unknown[]) {
  const impressions: Array<{ productId: string; ref: string }> = [];
  await page.route("**/api/resources", (route) => route.fulfill({ json: partners }));
  await page.route("**/api/affiliate/impression", async (route) => {
    impressions.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.goto("/blog");
  await expect(page.getByTestId("sponsor-banner")).toBeVisible({ timeout: 30000 });
  return impressions;
}

const active = (page: Page) => page.locator("[data-testid=sponsor-slide][data-active=true]");

test.describe("sponsor banner", () => {
  test("shows Ambit first and ElevenLabs right after, with Ambit's fine print intact", async ({ page }) => {
    await openBlog(page, [ELEVEN, AMBIT]);
    const slides = page.getByTestId("sponsor-slide");
    await expect(slides).toHaveCount(2);
    await expect(active(page)).toContainText("Interested in reducing your monthly energy costs?");
    await expect(active(page)).toContainText("Ambit Texas, LLC REP #10117");
    await page.getByRole("button", { name: "Show sponsor 2 of 2" }).click();
    await expect(active(page)).toContainText("ElevenLabs");
    await expect(active(page)).toContainText("Paid partnership");
    await expect(active(page).getByRole("link", { name: /Try ElevenLabs/ })).toHaveAttribute(
      "href",
      `/api/affiliate/go/${ELEVEN.id}?ref=blog-index-partner`
    );
  });

  test("the slide that is not showing is hidden from keyboard and screen readers", async ({ page }) => {
    await openBlog(page, [AMBIT, ELEVEN]);
    const hidden = page.locator("[data-testid=sponsor-slide][data-active=false]");
    await expect(hidden).toHaveCount(1);
    await expect(hidden).toHaveAttribute("aria-hidden", "true");
    await expect(hidden).toBeHidden();
  });

  test("it changes slides on its own, and pause stops it", async ({ page }) => {
    await page.clock.install();
    await openBlog(page, [AMBIT, ELEVEN]);
    await expect(active(page)).toContainText("Interested in reducing");
    await page.clock.fastForward(9500);
    await expect(active(page)).toContainText("ElevenLabs");
    await page.getByRole("button", { name: "Pause rotating sponsors" }).click();
    await page.clock.fastForward(30000);
    await expect(active(page)).toContainText("ElevenLabs");
    await page.getByRole("button", { name: "Resume rotating sponsors" }).click();
    // The pointer is still over the strip, which also holds it still; move it away.
    await page.mouse.move(2, 2);
    await page.locator("body").click({ position: { x: 2, y: 2 } });
    // Wait for the button to flip back, so the timer is re-armed before time moves.
    await expect(page.getByRole("button", { name: "Pause rotating sponsors" })).toBeVisible();
    await page.clock.fastForward(9500);
    await expect(active(page)).toContainText("Interested in reducing");
  });

  test("it does not rotate for someone who asked for less motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await openBlog(page, [AMBIT, ELEVEN]);
    await page.clock.fastForward(40000);
    await expect(active(page)).toContainText("Interested in reducing");
    await expect(page.getByRole("button", { name: /rotating sponsors/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Show sponsor 2 of 2" }).click();
    await expect(active(page)).toContainText("ElevenLabs");
  });

  test("hovering holds the slide still", async ({ page }) => {
    await page.clock.install();
    await openBlog(page, [AMBIT, ELEVEN]);
    await page.getByTestId("sponsor-banner").hover();
    await page.clock.fastForward(30000);
    await expect(active(page)).toContainText("Interested in reducing");
  });

  test("each slide logs one impression, only once it is showing", async ({ page }) => {
    const impressions = await openBlog(page, [AMBIT, ELEVEN]);
    await page.getByTestId("sponsor-banner").scrollIntoViewIfNeeded();
    await expect.poll(() => impressions.length).toBe(1);
    expect(impressions[0]).toEqual({ productId: AMBIT.id, ref: "blog-index-ambit" });
    await page.getByRole("button", { name: "Show sponsor 2 of 2" }).click();
    await expect.poll(() => impressions.length).toBe(2);
    expect(impressions[1]).toEqual({ productId: ELEVEN.id, ref: "blog-index-partner" });
    await page.getByRole("button", { name: "Show sponsor 1 of 2" }).click();
    await page.waitForTimeout(500);
    expect(impressions.length).toBe(2);
  });

  test("with only Ambit it stays a still banner with no controls", async ({ page }) => {
    await openBlog(page, [AMBIT]);
    await expect(page.getByTestId("sponsor-slide")).toHaveCount(1);
    await expect(page.getByRole("button", { name: /sponsor/i })).toHaveCount(0);
  });

  test("with only ElevenLabs it still shows, and Ambit is not forced in", async ({ page }) => {
    await openBlog(page, [ELEVEN]);
    await expect(page.getByTestId("sponsor-slide")).toHaveCount(1);
    await expect(page.getByTestId("sponsor-banner")).not.toContainText("Ambit");
  });

  test("no partners means no banner", async ({ page }) => {
    await page.route("**/api/resources", (route) => route.fulfill({ json: [] }));
    await page.goto("/blog");
    await expect(page.getByTestId("blog-rows")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("sponsor-banner")).toHaveCount(0);
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openBlog(page, [AMBIT, ELEVEN]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
