import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { MatchStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-guard";
import { getFixtures, mapApiStatus } from "@/lib/api-football";
import { recalculateMatchPoints } from "@/lib/scoring";
import { logger } from "@/lib/logger";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID || 1);
  const season = Number(process.env.API_FOOTBALL_SEASON || 2026);

  let fixtures;
  try {
    fixtures = await getFixtures(leagueId, season);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Sync failed: ${message}` },
      { status: 500 },
    );
  }

  let updated = 0;
  let recalculated = 0;
  const failed: string[] = [];

  for (const f of fixtures) {
    const apiStatus = mapApiStatus(f.fixture.status.short);

    // Only process matches that have started or finished
    if (apiStatus === "SCHEDULED") continue;

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

      // Recalculate points if match is FINISHED and score changed
      if (
        apiStatus === "FINISHED" &&
        scoreChanged &&
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

  return NextResponse.json({
    updated,
    recalculated,
    failed,
  });
}
