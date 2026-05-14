/**
 * Backfill the PublishedHighlight ledger from existing DAILY_HIGHLIGHTS Activity rows.
 *
 * Walks every DAILY_HIGHLIGHTS Activity in chronological order, computes the dedupe
 * key for each nugget in its highlightsJson, and inserts ledger rows with
 * skipDuplicates so already-announced lifetime nuggets are recorded as published.
 *
 * Idempotent — safe to run multiple times.
 *
 * Run:  npx tsx scripts/backfill-published-highlights.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { nuggetDedupeKey } from "../src/lib/highlights";
import type { HighlightNugget } from "../src/lib/highlight-templates";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const rows = await prisma.activity.findMany({
    where: { type: "DAILY_HIGHLIGHTS" },
    orderBy: { highlightsDate: "asc" },
    select: { id: true, highlightsDate: true, highlightsJson: true },
  });

  console.log(`Found ${rows.length} DAILY_HIGHLIGHTS rows`);

  const ledger: {
    nuggetType: string;
    dedupeKey: string;
    userId: string | null;
    matchId: string | null;
  }[] = [];

  for (const row of rows) {
    if (!row.highlightsDate || !row.highlightsJson) continue;
    const nuggets = row.highlightsJson as unknown as HighlightNugget[];
    if (!Array.isArray(nuggets)) continue;

    for (const n of nuggets) {
      ledger.push({
        nuggetType: n.type,
        dedupeKey: nuggetDedupeKey(n, row.highlightsDate),
        userId: n.entities.users?.[0] ?? null,
        matchId: n.entities.matches?.[0] ?? null,
      });
    }
  }

  console.log(`Computed ${ledger.length} ledger entries`);

  if (ledger.length === 0) {
    console.log("Nothing to insert");
    return;
  }

  const result = await prisma.publishedHighlight.createMany({
    data: ledger,
    skipDuplicates: true,
  });

  console.log(`Inserted ${result.count} new ledger rows (others were already present)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
