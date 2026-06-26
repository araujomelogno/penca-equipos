/**
 * Roll the Prediction Arena over to the current week (manual / one-off).
 *
 * The real logic lives in src/lib/prediction-arena-rollover.ts and is shared
 * with the cron route (src/app/api/cron/arena/rollover). This wrapper just
 * points a standalone Prisma client at any install's DATABASE_URL and prints a
 * dry-run preview before writing.
 *
 * Behaviour: if a RESOLVED week wrongly occupies this week's slot it is shifted
 * back 7 days; then a new OPEN week is created with the 6 rotated events
 * (text from messages/{DEFAULT_LOCALE}.json), deadline Tuesday 23:00 UTC.
 * Idempotent: if an OPEN/CLOSED week already occupies the slot, it skips.
 *
 *   npx tsx scripts/rollover-arena-week.ts            # dry-run (default)
 *   npx tsx scripts/rollover-arena-week.ts --write    # apply
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  arenaWeekSlot,
  buildDefaultArenaEvents,
  rolloverArenaWeek,
} from "../src/lib/prediction-arena-rollover";

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const locale = process.env.DEFAULT_LOCALE || "en";
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8"));

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const { weekStart, deadline } = arenaWeekSlot();
    const weekCount = await prisma.weeklyHitsWeek.count();
    const previewWeekNumber = weekCount + 1;
    const events = buildDefaultArenaEvents(messages, previewWeekNumber);
    console.log(`[${mode}] Target week starts ${weekStart.toISOString()} (deadline ${deadline.toISOString()}).`);
    console.log(`Rotated events for week #${previewWeekNumber} (locale ${locale}):`);
    for (const e of events) console.log(`   ${e.emoji} ${e.title} [${e.kind}]`);

    if (!write) {
      const occupant = await prisma.weeklyHitsWeek.findUnique({ where: { weekStart } });
      if (occupant) {
        console.log(
          `\n[DRY-RUN] Slot occupied by ${occupant.status} week #${occupant.weekNumber}. ` +
            (occupant.status === "RESOLVED"
              ? "Would shift it back 7d and create a new OPEN week."
              : "Would skip (nothing to do)."),
        );
      } else {
        console.log("\n[DRY-RUN] Slot is free. Would create a new OPEN week.");
      }
      console.log("Re-run with --write to apply.");
      return;
    }

    const result = await rolloverArenaWeek(prisma, messages);
    if (result.action === "created") {
      console.log(`\n[WRITE] Created week #${result.weekNumber} (${result.weekId}), status OPEN.`);
    } else {
      console.log(`\n[WRITE] Skipped: ${result.reason}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
