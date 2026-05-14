/**
 * Strip duplicate lifetime nuggets from existing DAILY_HIGHLIGHTS Activity rows.
 *
 * Walks rows in chronological order. Keeps the first occurrence of each dedupe key
 * and removes later occurrences from the highlightsJson. If a row ends up empty,
 * it is deleted.
 *
 * Run with --dry-run to preview, then without to apply.
 *
 *   npx tsx scripts/dedupe-existing-highlights.ts --dry-run
 *   npx tsx scripts/dedupe-existing-highlights.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { nuggetDedupeKey } from "../src/lib/highlights";
import type { HighlightNugget } from "../src/lib/highlight-templates";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const rows = await prisma.activity.findMany({
    where: { type: "DAILY_HIGHLIGHTS" },
    orderBy: { highlightsDate: "asc" },
    select: { id: true, highlightsDate: true, highlightsJson: true },
  });

  console.log(`Scanning ${rows.length} DAILY_HIGHLIGHTS rows (dry-run=${DRY_RUN})`);

  const seen = new Set<string>();
  let updated = 0;
  let deleted = 0;
  let totalRemovedNuggets = 0;

  for (const row of rows) {
    if (!row.highlightsDate || !row.highlightsJson) continue;
    const nuggets = row.highlightsJson as unknown as HighlightNugget[];
    if (!Array.isArray(nuggets)) continue;

    const kept: HighlightNugget[] = [];
    const dropped: string[] = [];

    for (const n of nuggets) {
      const key = nuggetDedupeKey(n, row.highlightsDate);
      if (seen.has(key)) {
        dropped.push(key);
        continue;
      }
      seen.add(key);
      kept.push(n);
    }

    if (dropped.length === 0) continue;

    totalRemovedNuggets += dropped.length;
    const dateStr = row.highlightsDate.toISOString().slice(0, 10);

    if (kept.length === 0) {
      console.log(`[${dateStr}] DELETE row ${row.id} — all ${dropped.length} nuggets were dupes`);
      if (!DRY_RUN) {
        await prisma.activity.delete({ where: { id: row.id } });
      }
      deleted++;
    } else {
      console.log(
        `[${dateStr}] UPDATE row ${row.id} — kept ${kept.length}, dropped ${dropped.length}: ${dropped.join(", ")}`,
      );
      if (!DRY_RUN) {
        await prisma.activity.update({
          where: { id: row.id },
          data: { highlightsJson: JSON.parse(JSON.stringify(kept)) },
        });
      }
      updated++;
    }
  }

  console.log("");
  console.log(`Summary: ${updated} rows updated, ${deleted} rows deleted, ${totalRemovedNuggets} nuggets removed`);
  if (DRY_RUN) console.log("(dry run — no changes written)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
