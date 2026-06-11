import { test, expect } from "@playwright/test";

// Requires local DB with knockout matches seeded (scripts/dev-seed-knockout.ts)
test.describe("Knockout stage labels (ES locale)", () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "es", url: baseURL ?? "http://localhost:3040" },
    ]);
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in|ingresar/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("/predictions shows translated round names, never raw English labels", async ({ page }) => {
    await page.goto("/predictions");

    // Tab pill and/or section header for R32 must be in Spanish
    await expect(page.getByText("Dieciseisavos").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Round of 32")).toHaveCount(0);
  });

  test("/matches filter shortens group labels once knockout rounds are present", async ({ page }) => {
    await page.goto("/matches");

    // Knockout tab present and translated
    await expect(page.getByRole("link", { name: "Dieciseisavos" }).first()).toBeVisible({ timeout: 5000 });

    // Groups collapse to their short letter form: no more "GRUPO A"
    await expect(page.getByRole("link", { name: "GRUPO A", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "A", exact: true }).first()).toBeVisible();
  });
});
