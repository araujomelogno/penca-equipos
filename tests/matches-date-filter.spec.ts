import { test, expect } from "@playwright/test";

test.describe("Matches date filter toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("today pill defaults to today, toggles to all, then back to today", async ({ page }) => {
    await page.goto("/matches");

    // By default (no date param) the "today" pill is highlighted/active and shows
    // the localized "Today/Hoy" label.
    const todayPill = page.getByRole("link", { name: /today|hoy/i });
    await expect(todayPill).toBeVisible({ timeout: 5000 });

    // Clicking the active today pill toggles to the "all matches" view.
    await todayPill.click();
    await expect(page).toHaveURL(/[?&]date=all/);

    // No pill is highlighted now → the "Today/Hoy" label is gone.
    await expect(page.getByRole("link", { name: /today|hoy/i })).toHaveCount(0);

    // Clicking the same pill again selects today (date param = a YYYY-MM-DD).
    const allPills = page.locator('a[href*="date="]');
    await allPills.last().click();
    await expect(page).toHaveURL(/[?&]date=\d{4}-\d{2}-\d{2}/);
  });
});
