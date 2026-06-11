import { prisma } from "@/lib/prisma";
import type { MatchStatus } from "@/generated/prisma/client";
import { getFixtures, mapApiStatus } from "@/lib/api-football";
import { recalculateMatchPoints } from "@/lib/scoring";
import { logger } from "@/lib/logger";

export interface MatchSyncResult {
  updated: number;
  recalculated: number;
  failed: string[];
}

/**
 * Pull current scores/status from API-Football and update matches that have
 * started or finished. Matches by `apiFootballId`, so the DB must already hold
 * REAL ids (run scripts/reconcile-fixtures.ts once after seeding).
 *
 * Shared by the admin route (manual, admin-auth) and the cron route
 * (automated, CRON_SECRET-auth) to avoid duplicated logic.
 */
export interface MatchSyncOptions {
  /**
   * When true, only FINISHED fixtures are persisted (final results only, never
   * in-progress state). Used by the automated cron so the app reflects results
   * shortly after each match ends, not live. Defaults to false (admin/manual
   * sync also captures LIVE/HALFTIME).
   */
  finishedOnly?: boolean;
}

export async function syncMatchResults(
  options: MatchSyncOptions = {},
): Promise<MatchSyncResult> {
  const { finishedOnly = false } = options;
  const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID || 1);
  const season = Number(process.env.API_FOOTBALL_SEASON || 2026);

  const fixtures = await getFixtures(leagueId, season);

  let updated = 0;
  let recalculated = 0;
  const failed: string[] = [];

  for (const f of fixtures) {
    const apiStatus = mapApiStatus(f.fixture.status.short);

    // Skip not-yet-started matches; in finishedOnly mode skip in-progress too.
    if (apiStatus === "SCHEDULED") continue;
    if (finishedOnly && apiStatus !== "FINISHED") continue;

    try {
      const match = await prisma.match.findUnique({
        where: { apiFootballId: f.fixture.id },
        select: { id: true, status: true, homeScore: true, awayScore: true },
      });

      if (!match) continue;

      const newHomeScore = f.goals.home;
      const newAwayScore = f.goals.away;
      const scoreChanged =
        newHomeScore !== null &&
        newAwayScore !== null &&
        (match.homeScore !== newHomeScore || match.awayScore !== newAwayScore);

      await prisma.match.update({
        where: { apiFootballId: f.fixture.id },
        data: {
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          status: apiStatus as MatchStatus,
          minuteClock: f.fixture.status.elapsed
            ? `${f.fixture.status.elapsed}'`
            : null,
          scoreSource: "API",
          lastSyncedAt: new Date(),
        },
      });

      updated++;

      // Create activity when transitioning to FINISHED
      if (apiStatus === "FINISHED" && match.status !== "FINISHED") {
        await prisma.activity.upsert({
          where: { type_matchId: { type: "MATCH_RESULT", matchId: match.id } },
          create: { type: "MATCH_RESULT", matchId: match.id },
          update: {},
        });
      }

      // Recalculate points when transitioning to FINISHED, or when a
      // FINISHED match's score is corrected. The justFinished branch is
      // critical: when the score was already persisted during a LIVE sync,
      // scoreChanged is false on the LIVE→FINISHED tick and predictions
      // would never get scored.
      const justFinished =
        apiStatus === "FINISHED" && match.status !== "FINISHED";
      if (
        apiStatus === "FINISHED" &&
        (justFinished || scoreChanged) &&
        newHomeScore !== null &&
        newAwayScore !== null
      ) {
        const count = await recalculateMatchPoints(
          match.id,
          newHomeScore,
          newAwayScore,
        );
        recalculated += count;
      }
    } catch (err) {
      logger.error({ err, fixtureId: f.fixture.id }, "Sync failed for fixture");
      failed.push(`${f.teams.home.name} vs ${f.teams.away.name}`);

      // Mark as failed if we have the match in DB
      await prisma.match
        .update({
          where: { apiFootballId: f.fixture.id },
          data: { scoreSource: "FAILED", lastSyncedAt: new Date() },
        })
        .catch(() => {});
    }
  }

  return { updated, recalculated, failed };
}
