/**
 * Reconcile seeded World Cup matches with real API-Football fixtures.
 *
 * The seed inserts matches with synthetic apiFootballId values (2026xxx).
 * This script matches each real API fixture to the seeded match by team pair
 * (alias-aware, see src/lib/reconcile-core.ts) and writes the REAL apiFootballId
 * plus the current score/status — without creating duplicates.
 *
 * Installation-agnostic: point DATABASE_URL at any DB seeded with the same
 * fixtures (dev / trunk / prod / the parallel install) and it works.
 *
 * Usage:
 *   npx tsx scripts/reconcile-fixtures.ts            # dry-run (default, no writes)
 *   npx tsx scripts/reconcile-fixtures.ts --write    # apply changes
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getFixtures } from "../src/lib/api-football";
import { planFixtureReconciliation } from "../src/lib/reconcile-core";

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID || 1);
  const season = Number(process.env.API_FOOTBALL_SEASON || 2026);

  console.log(`[${mode}] Reconciling league ${leagueId}, season ${season}...`);

  const fixtures = await getFixtures(leagueId, season);
  console.log(`Fetched ${fixtures.length} fixtures from API-Football.`);

  const teams = await prisma.team.findMany({ select: { id: true, name: true, code: true } });
  const matches = await prisma.match.findMany({
    select: { id: true, homeTeamId: true, awayTeamId: true, kickoffTime: true },
  });
  const kickoffById = new Map(matches.map((m) => [m.id, m.kickoffTime]));
  console.log(`Loaded ${teams.length} teams and ${matches.length} matches from DB.\n`);

  const unmatchedTeam: string[][] = [];
  const unmatchedFixture: string[] = [];
  const seenMatchIds = new Set<string>();
  const seenApiIds = new Set<number>();
  let matched = 0;
  let withScore = 0;
  let duplicates = 0;
  let kickoffChanges = 0;

  for (const f of fixtures) {
    const plan = planFixtureReconciliation(f, teams, matches);

    if (plan.status === "unmatched-team") {
      unmatchedTeam.push(plan.unresolved);
      continue;
    }
    if (plan.status === "unmatched-fixture") {
      unmatchedFixture.push(`${plan.homeCode} vs ${plan.awayCode}`);
      continue;
    }

    // matched
    matched++;
    if (seenMatchIds.has(plan.matchId) || seenApiIds.has(plan.apiFootballId)) {
      duplicates++;
      console.warn(`  ⚠ duplicate mapping: matchId=${plan.matchId} apiId=${plan.apiFootballId}`);
    }
    seenMatchIds.add(plan.matchId);
    seenApiIds.add(plan.apiFootballId);
    if (plan.homeScore !== null || plan.awayScore !== null) withScore++;

    const apiKickoff = new Date(plan.kickoffTime);
    const currentKickoff = kickoffById.get(plan.matchId);
    if (!currentKickoff || currentKickoff.getTime() !== apiKickoff.getTime()) {
      kickoffChanges++;
      console.log(
        `  kickoff change: ${plan.apiFootballId} ${currentKickoff?.toISOString() ?? "—"} → ${apiKickoff.toISOString()}`,
      );
    }

    if (write) {
      await prisma.match.update({
        where: { id: plan.matchId },
        data: {
          apiFootballId: plan.apiFootballId,
          kickoffTime: apiKickoff,
          homeScore: plan.homeScore,
          awayScore: plan.awayScore,
          status: plan.matchStatus as
            | "SCHEDULED"
            | "LIVE"
            | "HALFTIME"
            | "FINISHED"
            | "POSTPONED"
            | "CANCELLED",
          lastSyncedAt: new Date(),
        },
      });
      if (plan.matchStatus === "FINISHED") {
        await prisma.activity.upsert({
          where: { type_matchId: { type: "MATCH_RESULT", matchId: plan.matchId } },
          create: { type: "MATCH_RESULT", matchId: plan.matchId },
          update: {},
        });
      }
    }
  }

  console.log("\n──────── Summary ────────");
  console.log(`  Matched:            ${matched}/${fixtures.length}`);
  console.log(`  Kickoff changes:    ${kickoffChanges}`);
  console.log(`  With score/status:  ${withScore}`);
  console.log(`  Duplicates:         ${duplicates}`);
  console.log(`  Unmatched (team):   ${unmatchedTeam.length}`);
  console.log(`  Unmatched (pair):   ${unmatchedFixture.length}`);
  if (unmatchedTeam.length) {
    console.log(`    unresolved names: ${[...new Set(unmatchedTeam.flat())].join(", ")}`);
  }
  if (unmatchedFixture.length) {
    console.log(`    unresolved pairs: ${unmatchedFixture.join("; ")}`);
  }
  console.log(write ? "\n✅ Changes written." : "\nℹ️  Dry-run only. Re-run with --write to apply.");

  await prisma.$disconnect();

  if (duplicates > 0 || unmatchedTeam.length > 0 || unmatchedFixture.length > 0) {
    if (!write) process.exitCode = 1; // surface problems in dry-run
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
