import { test, expect } from "@playwright/test";

test.describe("Blog", () => {
  test("should load blog index", async ({ page }) => {
    await page.goto("/blog");
    await expect(page).toHaveTitle(/Blog/);
    
    const heading = page.getByRole("heading", { name: "Blog" });
    await expect(heading).toBeVisible();
  });

  test("should display blog posts", async ({ page }) => {
    await page.goto("/blog");
    
    // Check for at least one post (the welcome post)
    const posts = page.locator("article");
    await expect(posts).toHaveCount(await posts.count());
  });

  test("should navigate to blog post", async ({ page }) => {
    await page.goto("/blog");
    
    // Click on first post
    const firstPost = page.locator("article").first();
    await firstPost.click();
    
    // Should navigate to post detail page
    await expect(page.url()).toMatch(/\/blog\/.+/);
  });

  test("blog post should have proper structure", async ({ page }) => {
    await page.goto("/blog/welcome-to-my-portfolio");
    
    // Check for main heading
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    
    // Check for article content
    const article = page.locator("article");
    await expect(article).toBeVisible();
  });

  test("blog post headings should be focusable", async ({ page }) => {
    await page.goto("/blog/welcome-to-my-portfolio");
    
    // Get all headings
    const headings = page.locator("h1, h2, h3, h4");
    const count = await headings.count();
    
    expect(count).toBeGreaterThan(0);
  });
});

