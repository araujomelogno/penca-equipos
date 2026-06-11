/**
 * Backfill prediction points for FINISHED matches that were never scored (or
 * were scored wrong).
 *
 * Why this exists: a bug in src/lib/match-sync.ts gated the points recalculation
 * behind `scoreChanged`. When a match's final score had already been persisted
 * during a LIVE sync, the LIVE->FINISHED transition saw `scoreChanged === false`
 * and never ran recalculateMatchPoints, leaving those predictions with
 * `points = null` (so they vanish from the leaderboard, which filters
 * `points: { not: null }`).
 *
 * This script recomputes the expected points for every prediction on every
 * FINISHED match with a result, compares against the stored value, and (with
 * --write) re-scores any match that has at least one mismatch via the same
 * recalculateMatchPoints used by the app. Idempotent — safe to re-run.
 *
 * Installation-agnostic: point DATABASE_URL at any affected DB.
 *
 * Usage:
 *   npx tsx scripts/backfill-match-points.ts            # dry-run (default, no writes)
 *   npx tsx scripts/backfill-match-points.ts --write    # apply fixes
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculatePoints, recalculateMatchPoints } from "../src/lib/scoring";

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log(`[${mode}] Scanning FINISHED matches for mis-scored predictions...\n`);

    // FINISHED matches that actually have a result to score against.
    const matches = await prisma.match.findMany({
      where: {
        status: "FINISHED",
        homeScore: { not: null },
        awayScore: { not: null },
      },
      select: {
        id: true,
        homeScore: true,
        awayScore: true,
        homeTeam: { select: { code: true } },
        awayTeam: { select: { code: true } },
      },
    });

    if (matches.length === 0) {
      console.log("No FINISHED matches with a result found. Nothing to do.");
      return;
    }

    // Pull every prediction for those matches in ONE query (no N+1).
    const matchIds = matches.map((m) => m.id);
    const predictions = await prisma.prediction.findMany({
      where: { matchId: { in: matchIds } },
      select: {
        matchId: true,
        homeScore: true,
        awayScore: true,
        points: true,
      },
    });

    const byMatch = new Map<string, typeof predictions>();
    for (const p of predictions) {
      const list = byMatch.get(p.matchId) ?? [];
      list.push(p);
      byMatch.set(p.matchId, list);
    }

    let matchesToFix = 0;
    let predsToFix = 0;
    let nullPreds = 0;

    for (const m of matches) {
      const preds = byMatch.get(m.id) ?? [];
      if (preds.length === 0) continue;

      // homeScore/awayScore are guaranteed non-null by the query filter.
      const actualHome = m.homeScore!;
      const actualAway = m.awayScore!;

      let mismatches = 0;
      let nulls = 0;
      for (const p of preds) {
        const expected = calculatePoints(
          p.homeScore,
          p.awayScore,
          actualHome,
          actualAway,
        );
        if (p.points !== expected) {
          mismatches++;
          if (p.points === null) nulls++;
        }
      }

      if (mismatches === 0) continue;

      matchesToFix++;
      predsToFix += mismatches;
      nullPreds += nulls;

      const label = `${m.homeTeam.code}-${m.awayTeam.code} ${actualHome}-${actualAway}`;
      console.log(
        `  ${label} (match ${m.id}): ${mismatches} prediction(s) off` +
          (nulls > 0 ? `, ${nulls} never scored (null)` : ""),
      );

      if (write) {
        const count = await recalculateMatchPoints(m.id, actualHome, actualAway);
        console.log(`    -> re-scored ${count} prediction(s)`);
      }
    }

    console.log("");
    if (matchesToFix === 0) {
      console.log("All FINISHED matches are correctly scored. Nothing to fix.");
      return;
    }

    console.log(
      `${mode}: ${matchesToFix} match(es) need fixing — ` +
        `${predsToFix} prediction(s) off (${nullPreds} never scored).`,
    );
    if (!write) {
      console.log("Re-run with --write to apply the fixes.");
    } else {
      console.log("Done. Predictions re-scored.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
