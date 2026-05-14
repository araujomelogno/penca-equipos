import { test, expect } from "@playwright/test";

test.describe("Match prediction input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("clicking PREDICT shows inputs that can be focused and typed into", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByText("Matches 2026")).toBeVisible();

    // Find a PREDICT or EDIT button (scheduled match)
    const predictBtn = page.getByRole("button", { name: /predict|edit/i }).first();
    await expect(predictBtn).toBeVisible({ timeout: 5000 });

    // Click PREDICT to enter editing mode
    await predictBtn.click();

    // Score inputs should appear (type=number with placeholder "-")
    const scoreInputs = page.locator('input[type="number"]');
    await expect(scoreInputs.first()).toBeVisible({ timeout: 3000 });
    expect(await scoreInputs.count()).toBe(2);

    // Click the first input — it should receive focus
    const homeInput = scoreInputs.first();
    await homeInput.click();
    await expect(homeInput).toBeFocused();

    // Type a score — the value should update
    await homeInput.fill("2");
    await expect(homeInput).toHaveValue("2");

    // Same for away input
    const awayInput = scoreInputs.nth(1);
    await awayInput.click();
    await expect(awayInput).toBeFocused();
    await awayInput.fill("1");
    await expect(awayInput).toHaveValue("1");
  });
});
