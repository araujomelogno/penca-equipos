/**
 * Roll the Prediction Arena over to the current week.
 *
 * 1. If a RESOLVED week wrongly occupies the current-week slot (weekStart ==
 *    this Monday) — as happens when an arena was created mid-week — shift its
 *    dates back 7 days to its true week, freeing the slot.
 * 2. Create the new OPEN arena for this Monday with the 6 default events
 *    (text from messages/{DEFAULT_LOCALE}.json), deadline Tuesday 23:00 UTC.
 *
 * Idempotent: if an OPEN/CLOSED week already occupies this week's slot, it
 * skips creation. Installation-agnostic — point DATABASE_URL at any install.
 *
 *   npx tsx scripts/rollover-arena-week.ts            # dry-run (default)
 *   npx tsx scripts/rollover-arena-week.ts --write    # apply
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_WEEKLY_EVENTS } from "../src/lib/prediction-arena-defaults";

const DAY = 24 * 60 * 60 * 1000;

function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const locale = process.env.DEFAULT_LOCALE || "en";
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8"));
  const defaults = messages.arena.defaults as Record<string, { title: string; description: string }>;
  const events = DEFAULT_WEEKLY_EVENTS.map((e, i) => ({
    orderIndex: i + 1,
    emoji: e.emoji,
    title: defaults[e.key].title,
    description: defaults[e.key].description,
  }));

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const thisMonday = mondayOf(new Date());
    const weekEnd = new Date(thisMonday.getTime() + 6 * DAY);
    weekEnd.setUTCHours(23, 59, 59, 999);
    const deadline = new Date(thisMonday.getTime() + 1 * DAY);
    deadline.setUTCHours(23, 0, 0, 0);

    console.log(`[${mode}] Target week starts ${thisMonday.toISOString()} (deadline ${deadline.toISOString()}).`);

    // Step 1: free the slot if a RESOLVED week mis-occupies it.
    const occupant = await prisma.weeklyHitsWeek.findUnique({ where: { weekStart: thisMonday } });
    if (occupant) {
      if (occupant.status !== "RESOLVED") {
        console.log(`An ${occupant.status} week (#${occupant.weekNumber}) already occupies this slot — nothing to do.`);
        return;
      }
      const shiftedStart = new Date(occupant.weekStart.getTime() - 7 * DAY);
      const collision = await prisma.weeklyHitsWeek.findUnique({ where: { weekStart: shiftedStart } });
      if (collision) {
        throw new Error(`Cannot shift resolved week #${occupant.weekNumber} back 7d — a week already exists at ${shiftedStart.toISOString()}.`);
      }
      console.log(`Step 1: shift RESOLVED week #${occupant.weekNumber} back 7d -> weekStart ${shiftedStart.toISOString()}.`);
      if (write) {
        await prisma.weeklyHitsWeek.update({
          where: { id: occupant.id },
          data: {
            weekStart: shiftedStart,
            weekEnd: new Date(occupant.weekEnd.getTime() - 7 * DAY),
            deadline: new Date(occupant.deadline.getTime() - 7 * DAY),
          },
        });
      }
    } else {
      console.log("Step 1: slot is free, no re-dating needed.");
    }

    // Step 2: create the new OPEN week.
    const weekCount = await prisma.weeklyHitsWeek.count();
    const weekNumber = weekCount + 1;
    console.log(`Step 2: create OPEN week #${weekNumber} with ${events.length} default events (locale ${locale}).`);
    for (const e of events) console.log(`   ${e.emoji} ${e.title}`);

    if (write) {
      const created = await prisma.weeklyHitsWeek.create({
        data: {
          weekStart: thisMonday,
          weekEnd,
          weekNumber,
          status: "OPEN",
          deadline,
          events: { create: events },
        },
        select: { id: true, weekNumber: true },
      });
      console.log(`\n[WRITE] Created week #${created.weekNumber} (${created.id}), status OPEN.`);
    } else {
      console.log("\n[DRY-RUN] No changes written. Re-run with --write to apply.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
