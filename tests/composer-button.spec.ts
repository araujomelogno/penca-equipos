import { test, expect } from "@playwright/test";

test.describe("Composer Post button styling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("Post button always has gold gradient background", async ({ page }) => {
    await page.goto("/activity");
    await expect(page.locator("h1")).toContainText("Activity");

    const postBtn = page.getByRole("button", { name: /^post$/i });

    // When disabled (no text), button should have flat bg (no gradient)
    await expect(postBtn).toBeDisabled();
    const bgDisabled = await postBtn.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bgDisabled).toBe("none");

    // Type something so the button becomes enabled
    const input = page.locator(".flex-col.gap-3 textarea").first();
    await input.fill("test");
    await expect(postBtn).toBeEnabled();

    // Enabled button should have gold gradient
    const bgEnabled = await postBtn.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bgEnabled).toContain("gradient");
    expect(bgEnabled).toContain("rgb(255, 225, 158)"); // #ffe19e
    expect(bgEnabled).toContain("rgb(233, 196, 106)"); // #e9c46a

    // Enabled should be fully opaque
    const opacity = await postBtn.evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
  });
});
