/**
 * Load / refresh World Cup fixtures from API-Football into our DB.
 *
 * Safe by design (see src/lib/sync-core.ts):
 *   - NEVER creates teams. Each API team name is resolved to an EXISTING seeded
 *     team (alias-aware). If ANY team can't be resolved the run ABORTS without
 *     writing anything (fail-closed) — add the missing alias and re-run.
 *   - Matches are keyed by (stage, team pair), so a knockout rematch is never
 *     confused with the group-stage fixture between the same two teams.
 *   - The seeded `group` letter is preserved (never derived from API strings).
 *
 * Defaults to DRY-RUN (like reconcile-fixtures.ts). Pass --write to apply.
 *
 *   npx tsx scripts/sync-fixtures.ts            # dry-run (no writes)
 *   npx tsx scripts/sync-fixtures.ts --write    # apply
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getFixtures } from "../src/lib/api-football";
import { planFixtureSync } from "../src/lib/sync-core";

type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "HALFTIME"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

async function main() {
  const write = process.argv.includes("--write");
  const mode = write ? "WRITE" : "DRY-RUN";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID || 1);
  const season = Number(process.env.API_FOOTBALL_SEASON || 2026);

  console.log(`[${mode}] Syncing fixtures for league ${leagueId}, season ${season}...`);
  const fixtures = await getFixtures(leagueId, season);
  console.log(`Fetched ${fixtures.length} fixtures from API-Football.`);

  const teams = await prisma.team.findMany({ select: { id: true, name: true, code: true } });
  const matches = await prisma.match.findMany({
    select: { id: true, homeTeamId: true, awayTeamId: true, stage: true },
  });
  console.log(`Loaded ${teams.length} teams and ${matches.length} matches from DB.\n`);

  // 1. Plan every fixture against a single snapshot (no per-fixture queries).
  const plans = fixtures.map((f) => ({ f, plan: planFixtureSync(f, teams, matches) }));

  // 2. Fail-closed: if ANY team can't be resolved, abort before writing.
  const unresolved = [
    ...new Set(
      plans.flatMap((p) => (p.plan.status === "unmatched-team" ? p.plan.unresolved : [])),
    ),
  ];
  if (unresolved.length > 0) {
    console.error(`✗ Aborting: ${unresolved.length} unresolved team name(s). Nothing was written.`);
    console.error(`  Add an alias in src/lib/team-matching.ts and re-run:`);
    console.error(`    ${unresolved.join(", ")}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const toCreate = plans.filter((p) => p.plan.status === "create");
  const toUpdate = plans.filter((p) => p.plan.status === "update");

  console.log("──────── Plan ────────");
  console.log(`  Create (new):  ${toCreate.length}`);
  console.log(`  Update (exist): ${toUpdate.length}`);
  for (const { f, plan } of toCreate) {
    console.log(`  + ${f.teams.home.name} vs ${f.teams.away.name} (${plan.status === "create" ? plan.stage : ""})`);
  }

  if (!write) {
    console.log("\nℹ️  Dry-run only. Re-run with --write to apply.");
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let updated = 0;
  for (const { plan } of plans) {
    if (plan.status === "create") {
      const match = await prisma.match.upsert({
        where: { apiFootballId: plan.apiFootballId },
        create: {
          apiFootballId: plan.apiFootballId,
          homeTeamId: plan.homeTeamId,
          awayTeamId: plan.awayTeamId,
          kickoffTime: new Date(plan.kickoffTime),
          stage: plan.stage,
          group: plan.group,
          venue: plan.venue,
          homeScore: plan.homeScore,
          awayScore: plan.awayScore,
          status: plan.matchStatus as MatchStatus,
          lastSyncedAt: new Date(),
        },
        update: {
          kickoffTime: new Date(plan.kickoffTime),
          stage: plan.stage,
          venue: plan.venue,
          homeScore: plan.homeScore,
          awayScore: plan.awayScore,
          status: plan.matchStatus as MatchStatus,
          lastSyncedAt: new Date(),
        },
      });
      created++;
      if (plan.matchStatus === "FINISHED") await markResult(prisma, match.id);
    } else if (plan.status === "update") {
      await prisma.match.update({
        where: { id: plan.matchId },
        data: {
          apiFootballId: plan.apiFootballId,
          kickoffTime: new Date(plan.kickoffTime),
          stage: plan.stage,
          venue: plan.venue,
          homeScore: plan.homeScore,
          awayScore: plan.awayScore,
          status: plan.matchStatus as MatchStatus,
          lastSyncedAt: new Date(),
        },
      });
      updated++;
      if (plan.matchStatus === "FINISHED") await markResult(prisma, plan.matchId);
    }
  }

  console.log(`\n✅ Done. Created ${created}, updated ${updated}.`);
  await prisma.$disconnect();
}

async function markResult(prisma: PrismaClient, matchId: string) {
  await prisma.activity.upsert({
    where: { type_matchId: { type: "MATCH_RESULT", matchId } },
    create: { type: "MATCH_RESULT", matchId },
    update: {},
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
