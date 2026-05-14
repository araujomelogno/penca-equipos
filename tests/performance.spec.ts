import { test, expect } from "@playwright/test";

const TTFB_THRESHOLD_MS = 1500;

test.describe("Performance — TTFB", () => {
  test.describe.configure({ retries: 1 });
  const publicRoutes = ["/login", "/register"];

  const authRoutes = [
    "/home",
    "/standings",
    "/matches",
    "/rules",
    "/predictions",
    "/activity",
    "/leaderboard",
    "/profile",
    "/admin",
  ];

  for (const path of publicRoutes) {
    test(`${path} TTFB < ${TTFB_THRESHOLD_MS}ms`, async ({ page }) => {
      const start = Date.now();
      await page.goto(path, { waitUntil: "commit" });
      const ttfb = Date.now() - start;

      expect(ttfb, `${path} TTFB was ${ttfb}ms`).toBeLessThan(
        TTFB_THRESHOLD_MS
      );
    });
  }

  test.describe("authenticated routes", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.locator('input[type="email"]').fill("admin@pencachi.com");
      await page.locator('input[type="password"]').fill("admin123");
      await page.getByRole("button", { name: /log in/i }).click();
      await page.waitForURL(/\/home/, { timeout: 10000 });
    });

    for (const path of authRoutes) {
      test(`${path} TTFB < ${TTFB_THRESHOLD_MS}ms`, async ({ page }) => {
        const start = Date.now();
        await page.goto(path, { waitUntil: "commit" });
        const ttfb = Date.now() - start;

        expect(ttfb, `${path} TTFB was ${ttfb}ms`).toBeLessThan(
          TTFB_THRESHOLD_MS
        );
      });
    }
  });
});
