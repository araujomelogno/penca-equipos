/**
 * Seed curated bilingual analysis for the 16 World Cup 2026 R32 matches.
 *
 * Text lives in src/lib/r32-analysis-content.ts (es: relator rioplatense,
 * en: tactical analyst). Keyed by "${homeCode}-${awayCode}".
 *
 *   npx tsx scripts/seed-r32-analysis.ts            # dry-run (no writes)
 *   npx tsx scripts/seed-r32-analysis.ts --write    # apply
 *
 * Against prod:
 *   bash scripts/_run-sync-prod.sh scripts/seed-r32-analysis.ts --write
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { R32_ANALYSIS, R32_PAIRS } from "../src/lib/r32-analysis-content";

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const matches = await prisma.match.findMany({
    where: { stage: "R32" },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });

  console.log(`[${mode}] ${matches.length} R32 matches found.\n`);

  const seenKeys = new Set<string>();
  let updated = 0;
  let missing = 0;

  for (const m of matches) {
    const key = `${m.homeTeam.code}-${m.awayTeam.code}`;
    const entry = R32_ANALYSIS[key];
    seenKeys.add(key);

    if (!entry) {
      console.error(`  ⚠️  NO CURATED TEXT for ${key} (${m.homeTeam.name} vs ${m.awayTeam.name})`);
      missing++;
      continue;
    }

    console.log(`  ${key}  ${m.homeTeam.name} vs ${m.awayTeam.name} → es+en ready`);

    if (write) {
      await prisma.match.update({
        where: { id: m.id },
        data: { analysisEs: entry.es, analysisEn: entry.en },
      });
      updated++;
    }
  }

  // Loud-fail on curated entries that never matched a fixture.
  const unmatched = R32_PAIRS.filter((p) => !seenKeys.has(p));
  if (unmatched.length > 0) {
    console.error(`\n⚠️  ${unmatched.length} curated pair(s) had no matching DB fixture: ${unmatched.join(", ")}`);
  }

  if (missing > 0) {
    console.error(`\n❌ ${missing} R32 match(es) have no curated text. Fix src/lib/r32-analysis-content.ts and re-run.`);
  }

  if (write) {
    console.log(`\n✅ Done. Updated ${updated} matches.`);
  } else {
    console.log("\nℹ️  Dry-run only. Re-run with --write to apply.");
  }

  await prisma.$disconnect();
  if (missing > 0 || unmatched.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
