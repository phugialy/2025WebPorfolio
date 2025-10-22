import { test, expect } from "@playwright/test";

test.describe("Weather Widget", () => {
  test("should show weather widget in header", async ({ page }) => {
    await page.goto("/");
    
    // Check if weather widget is visible in the header using the specific data-testid
    const weatherWidget = page.locator('[data-testid="weather-widget"]');
    
    await expect(weatherWidget).toBeVisible({ timeout: 10000 });
  });

  test("should show temperature toggle", async ({ page }) => {
    await page.goto("/");
    
    // Wait for weather widget to load
    await page.waitForTimeout(3000);
    
    // First check if weather widget is visible
    const weatherWidget = page.locator('[data-testid="weather-widget"]');
    await expect(weatherWidget).toBeVisible({ timeout: 5000 });
    
    // Check if it's showing the initial "Weather" button or actual weather data
    const weatherButton = weatherWidget.locator('text=Weather');
    const tempToggle = weatherWidget.locator('text=°C').or(weatherWidget.locator('text=°F'));
    const loadingText = weatherWidget.locator('text=Loading');
    
    // Wait for either weather data to load or show the weather button
    await expect(
      tempToggle.or(weatherButton).or(loadingText)
    ).toBeVisible({ timeout: 10000 });
    
    // If showing weather button, click it to get weather data
    if (await weatherButton.isVisible()) {
      await weatherButton.click();
      await page.waitForTimeout(3000); // Wait for weather data to load
    }
    
    // Now check for temperature toggle (it might take time to load)
    await expect(tempToggle).toBeVisible({ timeout: 10000 });
  });

  test("should be integrated in header", async ({ page }) => {
    await page.goto("/");
    
    // Check that the weather widget is in the header navigation
    const weatherWidget = page.locator('[data-testid="weather-widget"]');
    const header = page.locator('header');
    
    await expect(weatherWidget).toBeVisible();
    await expect(header).toContainElement(weatherWidget);
  });
});
