import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@pencachi.com");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: /log in|ingresar/i }).click();
  await page.waitForURL(/\/home/, { timeout: 10000 });
}

test.describe("Rules page (EN)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/rules");
  });

  test("shows penca scoring tiers with point values", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main).toContainText("Rules");
    await expect(main).toContainText("Exact score");
    await expect(main).toContainText("5 pts");
    await expect(main).toContainText("3 pts");
  });

  test("explains deadlines and knockout rule", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main).toContainText(/locks at kickoff/i);
    await expect(main).toContainText(/extra time/i);
  });

  test("shows Arena section as a separate game", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main).toContainText("Prediction Arena");
    await expect(main).toContainText(/don't count toward/i);
  });
});

test.describe("Rules page (ES)", () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "es", url: baseURL ?? "http://localhost:3040" },
    ]);
    await login(page);
    await page.goto("/rules");
  });

  test("shows localized scoring tiers and Arena section", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main).toContainText("Reglas");
    await expect(main).toContainText("Resultado exacto");
    await expect(main).toContainText("5 pts");
    await expect(main).toContainText("Prediction Arena");
  });
});
