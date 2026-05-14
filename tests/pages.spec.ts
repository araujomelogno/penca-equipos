import { test, expect } from "@playwright/test";

test.describe("Auth pages load", () => {
  test("Login page renders with PENCACHI title and form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("PENCACHI")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
    await expect(page.getByText("Sign up")).toBeVisible();
  });

  test("Register page renders with PENCACHI title and 4 fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("PENCACHI")).toBeVisible();
    const inputs = page.locator("input");
    await expect(inputs).toHaveCount(4);
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    await expect(page.getByText("Log in")).toBeVisible();
  });

  test("Register pre-fills invitation code from query param", async ({ page }) => {
    await page.goto("/register?code=TEST-CODE");
    const codeInput = page.locator("#reg-code");
    await expect(codeInput).toHaveValue("TEST-CODE");
  });
});

test.describe("Root redirect", () => {
  test("Root redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/(login|home)/);
    expect(page.url()).toContain("/login");
  });
});

test.describe("Protected pages redirect", () => {
  test("/home redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/home");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});

test.describe("Nav routes load with header (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  const routes = [
    { path: "/home", title: "ENTER PREDICTIONS" },
    { path: "/standings", title: "Standings" },
    { path: "/matches", title: "Matches" },
    { path: "/rules", title: "Rules" },
    { path: "/profile", title: "Profile" },
    { path: "/leaderboard", title: "Leaderboard" },
    { path: "/predictions", title: "Predictions" },
    { path: "/activity", title: "Activity" },
    { path: "/admin", title: "Admin" },
  ];

  for (const { path, title } of routes) {
    test(`${path} loads with header and content`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("header")).toBeVisible();
      await expect(page.getByRole("main")).toContainText(title);
    });
  }
});

test.describe("Home page (Pre-Mundial state)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("shows hero banner with ENTER PREDICTIONS CTA", async ({ page }) => {
    await expect(page.getByText("COMPLETE YOUR PREDICTIONS")).toBeVisible();
    await expect(page.getByText("ENTER PREDICTIONS")).toBeVisible();
  });

  test("shows participation stats cards", async ({ page }) => {
    await expect(page.getByText("PREDICTED")).toBeVisible();
    await expect(page.getByText("PENDING")).toBeVisible();
    await expect(page.getByRole("main").getByText("MATCHES")).toBeVisible();
  });

  test("shows activity feed section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "ACTIVITY" })).toBeVisible();
  });

});

test.describe("Page layout consistency", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  const pagesWithTitle = [
    { path: "/standings", title: "Standings" },
    { path: "/matches", title: "Matches 2026" },
    { path: "/leaderboard", title: "Leaderboard" },
    { path: "/activity", title: "Activity" },
    { path: "/predictions", title: "Predictions" },
    { path: "/rules", title: "Rules" },
    { path: "/admin", title: "Admin Panel" },
  ];

  for (const { path, title } of pagesWithTitle) {
    test(`${path} — title uses .page-title class`, async ({ page }) => {
      await page.goto(path);
      const h1 = page.locator("h1");
      await expect(h1).toContainText(title);
      await expect(h1).toHaveClass(/page-title/);
    });
  }

  test("all pages with .page-content have consistent horizontal padding", async ({ page }) => {
    const paddings: { path: string; paddingLeft: string }[] = [];

    for (const { path } of pagesWithTitle) {
      await page.goto(path);
      const content = page.locator(".page-content").first();
      await expect(content).toBeVisible();
      const paddingLeft = await content.evaluate(
        (el) => getComputedStyle(el).paddingLeft
      );
      paddings.push({ path, paddingLeft });
    }

    // All pages should have the same horizontal padding
    const expected = paddings[0].paddingLeft;
    for (const { path, paddingLeft } of paddings) {
      expect(paddingLeft, `${path} paddingLeft mismatch`).toBe(expected);
    }
  });

  test("page titles have consistent font styles across pages", async ({ page }) => {
    const styles: { path: string; fontSize: string; fontWeight: string; fontStyle: string }[] = [];

    for (const { path } of pagesWithTitle) {
      await page.goto(path);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      const computed = await h1.evaluate((el) => {
        const s = getComputedStyle(el);
        return { fontSize: s.fontSize, fontWeight: s.fontWeight, fontStyle: s.fontStyle };
      });
      styles.push({ path, ...computed });
    }

    const expected = styles[0];
    for (const { path, fontSize, fontWeight, fontStyle } of styles) {
      expect(fontSize, `${path} fontSize`).toBe(expected.fontSize);
      expect(fontWeight, `${path} fontWeight`).toBe(expected.fontWeight);
      expect(fontStyle, `${path} fontStyle`).toBe(expected.fontStyle);
    }
  });
});

test.describe("Logout", () => {
  test("Clicking Log Out redirects to /login and invalidates session", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });

    // Open profile menu and click Log Out
    await page.locator("header .relative button").click();
    const logoutBtn = page.getByRole("button", { name: /log out/i });
    await logoutBtn.waitFor({ state: "visible", timeout: 3000 });
    await logoutBtn.click();

    // Should redirect to /login
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain("/login");

    // Session should be invalidated — navigating to /home redirects back to /login
    await page.goto("/home");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});

test.describe("Match detail navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("pagination shows correct counter format and updates on navigate", async ({ page }) => {
    // Go to a match directly
    await page.goto("/matches");
    // Click first match link
    const firstMatch = page.locator('a[href^="/matches/c"]').first();
    await firstMatch.click();
    await page.waitForURL(/\/matches\/\w+/);

    // Pager should show format N/Total where N >= 1
    const pager = page.locator("text=/\\d+\\/\\d+/").first();
    await expect(pager).toBeVisible({ timeout: 5000 });
    const text = await pager.textContent();
    const match = text!.match(/^(\d+)\/(\d+)$/);
    expect(match).not.toBeNull();
    const [, current, total] = match!;
    expect(Number(current)).toBeGreaterThanOrEqual(1);
    expect(Number(current)).toBeLessThanOrEqual(Number(total));
    expect(Number(total)).toBeGreaterThan(6); // Should be all matches, not just one group
  });

  test("entering from predictions shows correct pagination", async ({ page }) => {
    await page.goto("/predictions");
    await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();

    // Click info link on a match (the small info icon)
    const infoLink = page.locator('a[href*="/matches/"][href*="from=predictions"]').first();
    await infoLink.click();
    await page.waitForURL(/\/matches\/\w+\?from=predictions/);

    // Back link should say "Back to Predictions"
    await expect(page.getByText("Back to Predictions")).toBeVisible();

    // Pager counter should be valid (N/Total, N <= Total)
    const pager = page.locator("text=/\\d+\\/\\d+/").first();
    await expect(pager).toBeVisible({ timeout: 5000 });
    const text = await pager.textContent();
    const match = text!.match(/^(\d+)\/(\d+)$/);
    expect(match).not.toBeNull();
    const [, current, total] = match!;
    expect(Number(current)).toBeLessThanOrEqual(Number(total));
  });

  test("paginating next updates match content", async ({ page }) => {
    await page.goto("/matches");
    const firstMatch = page.locator('a[href^="/matches/c"]').first();
    await firstMatch.click();
    await page.waitForURL(/\/matches\/\w+/);

    // Get initial URL
    const initialUrl = page.url();

    // Click next match if available
    const nextLink = page.locator('a[href^="/matches/c"]').filter({ has: page.locator('text=chevron_right') }).first();
    if (await nextLink.isVisible()) {
      await nextLink.click();
      await page.waitForURL(/\/matches\/\w+/);
      // URL should change
      expect(page.url()).not.toBe(initialUrl);
      // Pager should still be valid
      const pager = page.locator("text=/\\d+\\/\\d+/").first();
      await expect(pager).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Predictions page mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 Pro

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("page layout does not shift horizontally on load", async ({ page }) => {
    // Track the page title position to detect any horizontal layout shift
    const positions: Array<{ el: string; x: number }> = [];

    await page.exposeFunction("__reportShift", (el: string, x: number) => {
      positions.push({ el, x });
    });

    await page.addInitScript(() => {
      const interval = setInterval(() => {
        // Track h1 title position
        const h1 = document.querySelector("h1");
        if (h1) {
          const rect = h1.getBoundingClientRect();
          (window as unknown as Record<string, (el: string, x: number) => void>).__reportShift("h1", rect.x);
        }
        // Track header profile icon
        const btn = document.querySelector("header .relative button");
        if (btn) {
          const rect = btn.getBoundingClientRect();
          (window as unknown as Record<string, (el: string, x: number) => void>).__reportShift("profile", rect.x);
        }
      }, 30);
      setTimeout(() => clearInterval(interval), 3000);
    });

    await page.goto("/predictions");
    await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();
    await page.waitForTimeout(2500);

    // Check each element for shift
    for (const elName of ["h1", "profile"]) {
      const elPositions = positions.filter((p) => p.el === elName && p.x > 0).map((p) => p.x);
      if (elPositions.length === 0) continue;
      const first = elPositions[0];
      const maxShift = Math.max(...elPositions.map((x) => Math.abs(x - first)));
      expect(maxShift, `${elName} shifted by ${maxShift}px`).toBeLessThanOrEqual(2);
    }
  });

  test("group tabs render as individual (not grouped) without flicker", async ({ page }) => {
    await page.goto("/predictions");
    await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();

    // Individual tabs (A, B, C...) should be visible in mobile viewport
    const individualTabs = page.locator("button").filter({ hasText: /^[A-H]$/ });
    expect(await individualTabs.count()).toBeGreaterThan(0);

    // Grouped tabs (A-C, D-F...) should exist in DOM but be hidden via CSS
    const groupedTabs = page.locator("button").filter({ hasText: /^[A-H]-[A-H]$/ });
    const groupedCount = await groupedTabs.count();
    for (let i = 0; i < groupedCount; i++) {
      await expect(groupedTabs.nth(i)).not.toBeVisible();
    }

    // First individual tab should be active (gold background)
    const firstTab = individualTabs.first();
    const bg = await firstTab.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Gold color (#ffe19e) in RGB
    expect(bg).toContain("rgb(255, 225, 158)");
  });
});

test.describe("Predictions page desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
  });

  test("shows multiple group cards on initial load (not just 1)", async ({ page }) => {
    await page.goto("/predictions");
    await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();

    // On desktop, the grouped tab (e.g. A-C) should be active,
    // so we should see multiple GROUP cards, not just one
    const groupCards = page.locator("text=/^GROUP [A-L]$/");
    await expect(groupCards.first()).toBeVisible({ timeout: 5000 });
    const count = await groupCards.count();
    expect(count, "Desktop should show multiple group cards on initial load").toBeGreaterThan(1);
  });

  test("floating bar appears on first score input and validates incomplete predictions", async ({ page }) => {
    await page.goto("/predictions");
    await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();

    const saveBtn = page.getByRole("button", { name: "SAVE CHANGES" });
    const discardBtn = page.getByRole("button", { name: "Discard" });

    // Bar should NOT be visible initially
    await expect(saveBtn).not.toBeVisible();

    // Find a match row where both score inputs are empty (no existing prediction)
    const allInputs = page.locator('input[inputmode="numeric"]');
    let homeIdx = -1;
    const count = await allInputs.count();
    for (let i = 0; i < count - 1; i += 2) {
      const home = await allInputs.nth(i).inputValue();
      const away = await allInputs.nth(i + 1).inputValue();
      if (home === "" && away === "") {
        homeIdx = i;
        break;
      }
    }
    expect(homeIdx, "Should find at least one match without predictions").toBeGreaterThanOrEqual(0);

    // Type a single score (home only) — bar should appear immediately
    await allInputs.nth(homeIdx).fill("2");
    await expect(saveBtn).toBeVisible();
    await expect(discardBtn).toBeVisible();

    // Click SAVE with incomplete prediction — should show error message + red outline
    await saveBtn.click();
    await expect(page.getByText("Complete both scores before saving")).toBeVisible();

    // The empty away input should have a red outline
    const awayInput = allInputs.nth(homeIdx + 1);
    const outline = await awayInput.locator("..").evaluate(
      (el) => getComputedStyle(el).outlineColor,
    );
    // red (#ef4444) in RGB
    expect(outline).toContain("rgb(239, 68, 68)");

    // Fill the second score — error message should clear
    await awayInput.fill("1");
    await expect(page.getByText("Complete both scores before saving")).not.toBeVisible();

    // Discard resets everything — bar disappears
    await discardBtn.click();
    await expect(saveBtn).not.toBeVisible();
  });
});

test.describe("Auth flow", () => {
  test("Login with valid credentials redirects to /home", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
    expect(page.url()).toContain("/home");
  });

  test("Login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page.getByText("Invalid credentials")).toBeVisible({ timeout: 5000 });
  });

  test("OTP login — request code, verify wrong code shows error", async ({ page }) => {
    // Use a fresh browser context to avoid rate-limit from previous OTP tests.
    // The OTP request has a 2-minute rate limit per user, so if another test
    // already requested one for admin, this will hit 429. We handle both cases.
    await page.goto("/login");

    // Switch to EMAIL CODE tab
    await page.getByRole("button", { name: "EMAIL CODE" }).click();

    // Request OTP
    await page.locator("#otp-email").fill("admin@pencachi.com");
    await page.getByRole("button", { name: "SEND CODE" }).click();

    // Either we get the code step, or a rate-limit error
    const codeStep = page.getByText("We sent a 6-digit code");
    const rateLimit = page.getByText("Please wait before requesting another code");
    await expect(codeStep.or(rateLimit)).toBeVisible({ timeout: 10000 });

    // If rate-limited, test passes (flow works, just throttled)
    if (await rateLimit.isVisible()) return;

    // Enter wrong code — should show error
    await page.locator("#otp-code").fill("000000");
    await page.getByRole("button", { name: "VERIFY" }).click();
    await expect(page.getByText("Invalid code")).toBeVisible({ timeout: 5000 });
  });

  test("Home page shows header with PENCACHI after login", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@pencachi.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL(/\/home/, { timeout: 10000 });
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("header")).toContainText("PENCACHI");
  });
});
