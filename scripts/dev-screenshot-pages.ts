/**
 * Dev helper: take full-page screenshots of every page for visual regression
 * during the design-tokens sweep.
 *
 * Usage:
 *   npx tsx scripts/dev-screenshot-pages.ts baseline   # before changes
 *   npx tsx scripts/dev-screenshot-pages.ts after      # after changes
 *
 * Output: .screenshots/<label>/<page>.png (gitignored, dev-only)
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3030";
const label = process.argv[2] || "baseline";
const outDir = path.join(".screenshots", label);

const PAGES: { name: string; path: string }[] = [
  { name: "home", path: "/home" },
  { name: "matches", path: "/matches" },
  { name: "standings", path: "/standings" },
  { name: "fixture", path: "/fixture" },
  { name: "predictions", path: "/predictions" },
  { name: "activity", path: "/activity" },
  { name: "leaderboard", path: "/leaderboard" },
  { name: "prediction-arena", path: "/prediction-arena" },
  { name: "rules", path: "/rules" },
  { name: "profile", path: "/profile" },
  { name: "admin", path: "/admin" },
  { name: "admin-match-review", path: "/admin/match-review" },
  { name: "admin-prediction-arena", path: "/admin/prediction-arena" },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  // Login (dev credentials, same as E2E tests)
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill("admin@pencachi.com");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: /log in|ingresar/i }).click();
  await page.waitForURL(/home/, { timeout: 15000 });

  for (const p of PAGES) {
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500); // settle fonts/images
    await page.screenshot({
      path: path.join(outDir, `${p.name}.png`),
      fullPage: true,
    });
    console.log(`✓ ${p.name}`);
  }

  // Match detail: first match link on /matches
  await page.goto(`${BASE_URL}/matches`, { waitUntil: "networkidle" });
  const href = await page
    .locator('a[href^="/matches/"]')
    .first()
    .getAttribute("href");
  if (href) {
    await page.goto(`${BASE_URL}${href}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(outDir, "match-detail.png"),
      fullPage: true,
    });
    console.log(`✓ match-detail (${href})`);
  } else {
    console.warn("⚠ no match link found for match-detail");
  }

  await browser.close();
  console.log(`\nDone → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
