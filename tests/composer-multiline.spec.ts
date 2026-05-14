import { test, expect } from "@playwright/test";

// Shared login helper
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@pencachi.com");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL(/\/home/, { timeout: 10000 });
}

test.describe("Composer auto-resize", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Activity composer textarea grows when typing multiple lines", async ({ page }) => {
    await page.goto("/activity");
    const textarea = page.locator(".flex-col.gap-3 textarea").first();
    await expect(textarea).toBeVisible();

    const initialHeight = await textarea.evaluate((el: HTMLElement) => el.offsetHeight);

    await textarea.fill("Line 1\nLine 2\nLine 3\nLine 4");
    const expandedHeight = await textarea.evaluate((el: HTMLElement) => el.offsetHeight);

    expect(expandedHeight).toBeGreaterThan(initialHeight);
  });

  test("Activity composer textarea shrinks back after clearing", async ({ page }) => {
    await page.goto("/activity");
    const textarea = page.locator(".flex-col.gap-3 textarea").first();

    await textarea.fill("Line 1\nLine 2\nLine 3");
    const expandedHeight = await textarea.evaluate((el: HTMLElement) => el.offsetHeight);

    await textarea.fill("");
    const clearedHeight = await textarea.evaluate((el: HTMLElement) => el.offsetHeight);

    expect(clearedHeight).toBeLessThan(expandedHeight);
  });

  test("Match chat textarea grows when typing multiple lines", async ({ page }) => {
    await page.goto("/home");

    const matchRow = page.locator("a[href*='/matches/']").first();
    if (await matchRow.isVisible()) {
      await matchRow.click();
      await page.waitForURL(/\/matches\//);

      const chatTab = page.getByRole("button", { name: /chat/i });
      if (await chatTab.isVisible()) {
        await chatTab.click();

        const textarea = page.locator("textarea").first();
        await expect(textarea).toBeVisible({ timeout: 5000 });

        const initialHeight = await textarea.evaluate((el: HTMLElement) => el.offsetHeight);
        await textarea.fill("Line 1\nLine 2\nLine 3\nLine 4");
        const expandedHeight = await textarea.evaluate((el: HTMLElement) => el.offsetHeight);

        expect(expandedHeight).toBeGreaterThan(initialHeight);
      }
    }
  });
});

test.describe("Multiline text preserves line breaks", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Activity feed post preserves line breaks", async ({ page }) => {
    await page.goto("/activity");
    const textarea = page.locator(".flex-col.gap-3 textarea").first();
    const uniqueMarker = `e2e-${Date.now()}`;
    const fullText = `${uniqueMarker}\nSecond line\nThird line`;

    await textarea.fill(fullText);
    await page.getByRole("button", { name: /^post$/i }).click();

    // Wait for the post to appear — the detail text is inside a <p> tag
    const postParagraph = page.locator("p", { hasText: uniqueMarker }).first();
    await expect(postParagraph).toBeVisible({ timeout: 5000 });

    // The <p> element itself should have pre-wrap
    const whiteSpace = await postParagraph.evaluate((el) => getComputedStyle(el).whiteSpace);
    expect(whiteSpace).toMatch(/pre-wrap/);

    // Verify all lines are present
    const text = await postParagraph.textContent();
    expect(text).toContain("Second line");
    expect(text).toContain("Third line");
  });

  test("Activity reply preserves line breaks", async ({ page }) => {
    await page.goto("/activity");

    // Open replies on the first comment post
    const replyToggle = page.locator("button").filter({ has: page.locator("text=chat_bubble") }).first();
    await replyToggle.click();

    // The reply textarea appears inside the expanded replies section
    const replyTextarea = page.locator("textarea").nth(1);
    await expect(replyTextarea).toBeVisible({ timeout: 3000 });

    const uniqueMarker = `reply-${Date.now()}`;
    await replyTextarea.fill(`${uniqueMarker}\nReply line two\nReply line three`);
    await page.getByRole("button", { name: /^reply$/i }).first().click();

    // Wait for reply to appear — replies render inside a <p> tag
    const replyParagraph = page.locator("p", { hasText: uniqueMarker }).first();
    await expect(replyParagraph).toBeVisible({ timeout: 5000 });

    const whiteSpace = await replyParagraph.evaluate((el) => getComputedStyle(el).whiteSpace);
    expect(whiteSpace).toMatch(/pre-wrap/);
  });
});
