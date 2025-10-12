# Testing Guide

## Current Test Status

✅ **10 out of 15 tests passing** (67% pass rate)

### Passing Tests
- Homepage loads successfully ✅
- Hero section displays ✅  
- Theme toggle works ✅
- Keyboard accessibility ✅
- Blog index loads ✅
- Blog posts display ✅
- Blog post structure ✅
- Blog headings focusable ✅
- Weather page loads ✅
- Weather button displays ✅

### Known Issues

**Next.js Dev Overlay**  
Some click tests fail in dev mode due to Next.js overlay blocking elements. This is a known issue in development mode only.

**Workaround:**
```bash
# Run tests in production mode
pnpm build
pnpm start
pnpm e2e
```

Or disable the overlay in `next.config.ts` for testing:
```typescript
const nextConfig: NextConfig = {
  // Disable dev overlay for E2E testing
  devIndicators: {
    appIsrStatus: false,
  },
};
```

## Running Tests

### Install Browsers
```bash
pnpm exec playwright install
```

### Run All Tests
```bash
pnpm e2e
```

### Run Specific Test File
```bash
pnpm exec playwright test tests/e2e/home.spec.ts
```

### Run with UI Mode (Interactive)
```bash
pnpm e2e:ui
```

### Run in Headed Mode (See Browser)
```bash
pnpm e2e:headed
```

### Debug Mode
```bash
pnpm exec playwright test --debug
```

## Test Configuration

Tests run in **Chromium only** by default for speed. To enable full cross-browser testing, uncomment browsers in `playwright.config.ts`:

```typescript
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },   // Uncomment
  { name: "webkit", use: { ...devices["Desktop Safari"] } },      // Uncomment
  { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },      // Uncomment
  { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },    // Uncomment
],
```

## Writing New Tests

### Test Structure
```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/path");
    
    // Your assertions
    const element = page.getByRole("button", { name: "Click Me" });
    await expect(element).toBeVisible();
  });
});
```

### Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByText`, `getByLabel`
2. **Wait for elements**: Use `await expect().toBeVisible()` not manual waits
3. **Test user behavior**: Test what users do, not implementation details
4. **Isolated tests**: Each test should be independent
5. **Descriptive names**: Use clear test descriptions

### Example Test
```typescript
test("should submit contact form", async ({ page }) => {
  await page.goto("/contact");
  
  // Fill form
  await page.getByLabel("Name").fill("John Doe");
  await page.getByLabel("Email").fill("john@example.com");
  await page.getByLabel("Message").fill("Hello!");
  
  // Submit
  await page.getByRole("button", { name: "Send Message" }).click();
  
  // Verify success
  await expect(page.getByText("Message Sent!")).toBeVisible();
});
```

## Type Checking & Linting

### Type Check
```bash
pnpm typecheck
```

### Lint
```bash
pnpm lint
```

### Fix Lint Issues
```bash
pnpm lint --fix
```

## CI/CD Testing

Tests run automatically on GitHub Actions:
- On every push to `main`
- On every pull request
- Full cross-browser testing in CI

See `.github/workflows/ci.yml` for configuration.

## Troubleshooting

### Tests Timeout
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Look for console errors in test output

### Element Not Found
- Check if element selector is correct
- Verify element is visible (not hidden by CSS)
- Use `await page.pause()` to debug interactively

### Flaky Tests
- Add explicit waits: `await page.waitForLoadState("networkidle")`
- Use `toBeVisible()` instead of checking existence
- Avoid time-based waits (`waitForTimeout`)

### Dev Server Issues
```bash
# Kill any hanging processes
taskkill /F /IM node.exe

# Restart dev server
pnpm dev
```

## Test Coverage Goals

- ✅ Homepage navigation
- ✅ Blog functionality  
- ✅ Weather feature
- 🎯 Contact form submission (requires Convex)
- 🎯 Guestbook posting (requires Convex)
- 🎯 Theme persistence
- 🎯 Responsive design
- 🎯 Accessibility (ARIA, keyboard nav)

## Performance Testing

After deployment, run Lighthouse audits:

```bash
lighthouse https://www.phugialy.com --view
```

**Targets:**
- Performance: ≥ 95
- Accessibility: ≥ 95
- Best Practices: ≥ 95
- SEO: ≥ 95

## Accessibility Testing

```bash
# Install axe-core
pnpm add -D @axe-core/playwright

# Run accessibility tests
pnpm exec playwright test --grep @a11y
```

---

**Note**: Full test suite will pass once:
1. Convex is initialized (for contact/guestbook tests)
2. Tests run in production mode (to avoid dev overlay issues)

