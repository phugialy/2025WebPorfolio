import { test, expect } from "@playwright/test";

test.describe("Weather", () => {
  test("should load weather page", async ({ page }) => {
    await page.goto("/weather");
    await expect(page).toHaveTitle(/Weather/);
  });

  test("should show get weather button", async ({ page }) => {
    await page.goto("/weather");
    
    const button = page.getByRole("button", { name: /get my weather/i });
    await expect(button).toBeVisible();
  });

  test("should handle geolocation request", async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.0060 });

    await page.goto("/weather");
    
    // Mock the API response
    await page.route("**/api/weather*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          current_weather: {
            temperature: 20,
            windspeed: 10,
            weathercode: 0,
            time: new Date().toISOString(),
          },
          daily: {
            temperature_2m_max: [22, 23, 24, 25, 26, 27, 28],
            temperature_2m_min: [18, 19, 20, 21, 22, 23, 24],
            time: Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i);
              return date.toISOString().split("T")[0];
            }),
          },
        }),
      });
    });

    const button = page.getByRole("button", { name: /get my weather/i });
    await button.click();

    // Should show weather data
    await expect(page.locator("text=/°C/")).toBeVisible({ timeout: 5000 });
  });

  test("should handle geolocation denial", async ({ page, context }) => {
    await page.goto("/weather");

    // Deny geolocation
    await context.setGeolocation(null as any);

    const button = page.getByRole("button", { name: /get my weather/i });
    await button.click();

    // Should show error message (with longer timeout for permission prompt)
    await expect(page.locator("text=/error/i")).toBeVisible({ timeout: 10000 });
  });
});

