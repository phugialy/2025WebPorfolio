import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Phu Gia Ly/);
  });

  test("should display hero section", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { name: /Phu Gia Ly/i });
    await expect(heading).toBeVisible();
  });

  test("should have working navigation", async ({ page }) => {
    await page.goto("/");
    
    // Test navigation links (use first occurrence in nav)
    const workLink = page.locator("nav").getByRole("link", { name: "Work" });
    await expect(workLink).toBeVisible();
    await workLink.click();
    await expect(page).toHaveURL("/work");
  });

  test("should have theme toggle", async ({ page }) => {
    await page.goto("/");
    const themeToggle = page.getByRole("button", { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();
    
    // Click theme toggle
    await themeToggle.click();
    // Wait for transition
    await page.waitForTimeout(300);
  });

  test("should have no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        // Filter out known React prop warnings
        const text = msg.text();
        if (!text.includes("asChild")) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    expect(consoleErrors).toHaveLength(0);
  });

  test("should be keyboard accessible", async ({ page }) => {
    await page.goto("/");
    
    // Tab through elements
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    
    // Check that focus is visible
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});

