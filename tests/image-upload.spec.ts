import { test, expect } from "@playwright/test";
import { join } from "path";

test.describe("Image upload persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("image uploaded in activity composer persists after page reload", async ({ page }) => {
    await page.goto("/activity");
    await expect(page.locator("h1")).toContainText("Activity");

    // Set a unique text so we can find this specific comment after reload
    const uniqueText = `img-test-${Date.now()}`;

    // Type the comment text (placeholder is random, use the textarea in the composer)
    const input = page.locator(".flex-col.gap-3 textarea").first();
    await input.fill(uniqueText);

    // Upload a test image via the file input (create a synthetic 1x1 PNG)
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = join(__dirname, "fixtures", "test-image.png");
    await fileInput.setInputFiles(testImagePath);

    // Verify image preview appears before posting
    await expect(page.locator('img[alt="Preview"]')).toBeVisible();

    // Click Post
    await page.getByRole("button", { name: /post/i }).click();

    // Wait for our unique text to appear in the feed, then find the image inside
    // the *same* comment row (parent of the text element). Scoping to the parent
    // avoids matching attachment images from other comments that contain similar text.
    await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 10000 });
    const commentImage = page.getByText(uniqueText).locator("xpath=..").locator("img[alt='Attachment']");
    await expect(commentImage).toBeVisible({ timeout: 10000 });

    // Grab the image src — it should be a /uploads/ URL, not a blob: or data: URL
    const imgSrc = await commentImage.getAttribute("src");
    expect(imgSrc).toBeTruthy();
    expect(imgSrc).toMatch(/^\/uploads\//);

    // --- F5: Full page reload ---
    await page.reload();

    // Wait for the page to load again
    await expect(page.locator("h1")).toContainText("Activity");

    // The same comment text should still be visible
    await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 10000 });

    // The image should still be visible with the same /uploads/ src — scoped to
    // the same parent so we re-find the image in the original comment row.
    const reloadedImage = page.getByText(uniqueText).locator("xpath=..").locator("img[alt='Attachment']");
    await expect(reloadedImage).toBeVisible({ timeout: 10000 });
    const reloadedSrc = await reloadedImage.getAttribute("src");
    expect(reloadedSrc).toBe(imgSrc);
  });
});
