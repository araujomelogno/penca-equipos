import { prisma } from "@/lib/prisma";
import type { MatchStatus } from "@/generated/prisma/client";
import { getFixtures } from "@/lib/api-football";
import { planFixtureSync } from "@/lib/sync-core";
import { recalculateMatchPoints } from "@/lib/scoring";
import { logger } from "@/lib/logger";

export interface MatchSyncResult {
  created: number;
  updated: number;
  recalculated: number;
  failed: string[];
}

/**
 * Pull fixtures from API-Football and reconcile them into our DB.
 *
 * Two responsibilities, both driven off the same API snapshot:
 *
 *  1. Fill the bracket. Knockout fixtures (R16, QF, …) start life with TBD teams
 *     in API-Football. As soon as the previous round finishes, the API resolves
 *     the real teams; we then CREATE that fixture with those teams. This is why
 *     the round of 16 populates automatically once the round of 32 is played —
 *     API-Football (not us) decides who advances, including on penalties.
 *  2. Keep scores/status current for fixtures we already hold.
 *
 * Matching reuses `planFixtureSync` (stage + unordered team pair, alias-aware),
 * so a knockout rematch is never confused with the group-stage fixture between
 * the same two teams. Unlike the manual `scripts/sync-fixtures.ts`, this is
 * TOLERANT of unresolved teams: an undecided knockout slot (TBD) is expected
 * mid-tournament, so it's skipped silently instead of aborting the whole run.
 *
 * Shared by the admin route (manual, admin-auth) and the cron route
 * (automated, CRON_SECRET-auth) to avoid duplicated logic.
 */
export interface MatchSyncOptions {
  /**
   * When true, only FINISHED results are persisted to scores/status; in-progress
   * (LIVE/HALFTIME) state is never written. Newly-resolved fixtures that haven't
   * kicked off yet are still CREATED (so the bracket fills), but stored as
   * SCHEDULED with null scores. Used by the automated cron. Defaults to false
   * (admin/manual sync also captures LIVE/HALFTIME).
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

  // Single snapshot of teams + matches (no per-fixture queries → no N+1).
  const [teams, dbMatches] = await Promise.all([
    prisma.team.findMany({ select: { id: true, name: true, code: true } }),
    prisma.match.findMany({
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        stage: true,
        status: true,
        homeScore: true,
        awayScore: true,
      },
    }),
  ]);
  const matchById = new Map(dbMatches.map((m) => [m.id, m]));

  let created = 0;
  let updated = 0;
  let recalculated = 0;
  const failed: string[] = [];

  for (const f of fixtures) {
    try {
      const plan = planFixtureSync(f, teams, dbMatches);

      // Undecided knockout slot (TBD team) — expected mid-tournament. Skip,
      // don't abort; it'll resolve once the previous round finishes.
      if (plan.status === "unmatched-team") continue;

      const apiStatus = plan.matchStatus as MatchStatus;
      const isFinished = apiStatus === "FINISHED";

      if (plan.status === "create") {
        // A fixture whose teams API-Football just resolved (e.g. an R16 tie
        // after its R32 feeders finished). Create it so the bracket fills.
        // In finishedOnly mode don't persist live/in-progress state: park it as
        // SCHEDULED with null scores unless it's already finished.
        const parkScheduled = finishedOnly && !isFinished;
        const storeStatus: MatchStatus = parkScheduled ? "SCHEDULED" : apiStatus;
        const storeHome = parkScheduled ? null : plan.homeScore;
        const storeAway = parkScheduled ? null : plan.awayScore;

        const fields = {
          homeTeamId: plan.homeTeamId,
          awayTeamId: plan.awayTeamId,
          kickoffTime: new Date(plan.kickoffTime),
          stage: plan.stage,
          venue: plan.venue,
          homeScore: storeHome,
          awayScore: storeAway,
          status: storeStatus,
          scoreSource: "API",
          lastSyncedAt: new Date(),
        };

        const match = await prisma.match.upsert({
          where: { apiFootballId: plan.apiFootballId },
          create: {
            apiFootballId: plan.apiFootballId,
            group: plan.group,
            ...fields,
          },
          update: fields,
        });
        created++;

        if (isFinished && storeHome !== null && storeAway !== null) {
          await markResult(match.id);
          recalculated += await recalculateMatchPoints(
            match.id,
            storeHome,
            storeAway,
          );
        }
        continue;
      }

      // plan.status === "update": a fixture we already hold.
      // Never persist in-progress state in finishedOnly mode, and there's
      // nothing to write for a still-scheduled match.
      if (finishedOnly && !isFinished) continue;
      if (apiStatus === "SCHEDULED") continue;

      const prev = matchById.get(plan.matchId);
      const newHomeScore = plan.homeScore;
      const newAwayScore = plan.awayScore;
      const scoreChanged =
        newHomeScore !== null &&
        newAwayScore !== null &&
        (prev?.homeScore !== newHomeScore || prev?.awayScore !== newAwayScore);

      await prisma.match.update({
        where: { id: plan.matchId },
        data: {
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          status: apiStatus,
          minuteClock: f.fixture.status.elapsed
            ? `${f.fixture.status.elapsed}'`
            : null,
          scoreSource: "API",
          lastSyncedAt: new Date(),
        },
      });
      updated++;

      // True the first time we see this match as FINISHED (`prev` is the
      // pre-update snapshot).
      const becameFinished = isFinished && prev?.status !== "FINISHED";
      if (becameFinished) {
        await markResult(plan.matchId);
      }

      // Recalculate points when FINISHED and we have a result — either it just
      // transitioned (score may already have been persisted during a LIVE sync,
      // so `scoreChanged` can be false) or a finished score was later corrected.
      if (
        isFinished &&
        newHomeScore !== null &&
        newAwayScore !== null &&
        (becameFinished || scoreChanged)
      ) {
        recalculated += await recalculateMatchPoints(
          plan.matchId,
          newHomeScore,
          newAwayScore,
        );
      }
    } catch (err) {
      logger.error({ err, fixtureId: f.fixture.id }, "Sync failed for fixture");
      failed.push(`${f.teams.home.name} vs ${f.teams.away.name}`);
    }
  }

  return { created, updated, recalculated, failed };
}

async function markResult(matchId: string): Promise<void> {
  await prisma.activity.upsert({
    where: { type_matchId: { type: "MATCH_RESULT", matchId } },
    create: { type: "MATCH_RESULT", matchId },
    update: {},
  });
}
