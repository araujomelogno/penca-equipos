import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getFixtures,
  mapApiStatus,
  mapApiStage,
} from "../src/lib/api-football";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID || 1);
  const season = Number(process.env.API_FOOTBALL_SEASON || 2026);

  console.log(`Fetching fixtures for league ${leagueId}, season ${season}...`);
  const fixtures = await getFixtures(leagueId, season);
  console.log(`Found ${fixtures.length} fixtures.`);

  for (const f of fixtures) {
    const homeTeam = await prisma.team.upsert({
      where: { apiFootballId: f.teams.home.id },
      update: { name: f.teams.home.name, flagUrl: f.teams.home.logo },
      create: {
        apiFootballId: f.teams.home.id,
        name: f.teams.home.name,
        code: f.teams.home.name.substring(0, 3).toUpperCase(),
        flagUrl: f.teams.home.logo,
      },
    });

    const awayTeam = await prisma.team.upsert({
      where: { apiFootballId: f.teams.away.id },
      update: { name: f.teams.away.name, flagUrl: f.teams.away.logo },
      create: {
        apiFootballId: f.teams.away.id,
        name: f.teams.away.name,
        code: f.teams.away.name.substring(0, 3).toUpperCase(),
        flagUrl: f.teams.away.logo,
      },
    });

    const stage = mapApiStage(f.league.round);
    const group = stage === "GROUP" ? f.league.round.replace(/.*Group\s*/i, "").trim() : null;

    const apiStatus = mapApiStatus(f.fixture.status.short) as "SCHEDULED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED" | "CANCELLED";

    const matchRecord = await prisma.match.upsert({
      where: { apiFootballId: f.fixture.id },
      update: {
        kickoffTime: new Date(f.fixture.date),
        stage,
        group,
        venue: f.fixture.venue ? `${f.fixture.venue.name}, ${f.fixture.venue.city}` : null,
        homeScore: f.goals.home,
        awayScore: f.goals.away,
        status: apiStatus,
        lastSyncedAt: new Date(),
      },
      create: {
        apiFootballId: f.fixture.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffTime: new Date(f.fixture.date),
        stage,
        group,
        venue: f.fixture.venue ? `${f.fixture.venue.name}, ${f.fixture.venue.city}` : null,
        homeScore: f.goals.home,
        awayScore: f.goals.away,
        status: apiStatus,
        lastSyncedAt: new Date(),
      },
    });

    if (apiStatus === "FINISHED") {
      await prisma.activity.upsert({
        where: { type_matchId: { type: "MATCH_RESULT", matchId: matchRecord.id } },
        create: { type: "MATCH_RESULT", matchId: matchRecord.id },
        update: {},
      });
    }

    console.log(
      `  ${f.teams.home.name} vs ${f.teams.away.name} (${stage}${group ? ` - Group ${group}` : ""})`
    );
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
