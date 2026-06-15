/**
 * DEV-ONLY throwaway helper: insert a few R32 knockout matches into the local DB
 * so you can SEE the knockout UI impact (round pills in /predictions & /standings,
 * progress denominator growth, home banner) before any real knockout data exists.
 *
 * NOT for prod. NOT committed as part of the feature. Uses synthetic apiFootballId
 * in the 2026200+ range to avoid colliding with seeded (2026101-172) or real ids.
 *
 *   npx tsx scripts/dev-seed-knockout.ts            # insert (idempotent upsert)
 *   npx tsx scripts/dev-seed-knockout.ts --remove   # delete them (+ their predictions)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

interface KoDef {
  n: number; // FIFA match number → apiFootballId = 2026200 + n
  homeCode: string;
  awayCode: string;
  date: string; // ISO UTC
  venue: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
}

const R32: KoDef[] = [
  { n: 73, homeCode: "ESP", awayCode: "CRO", date: "2026-06-29T19:00:00Z", venue: "SoFi Stadium, Inglewood", homeWinProb: 58, drawProb: 25, awayWinProb: 17 },
  { n: 74, homeCode: "ARG", awayCode: "AUS", date: "2026-06-29T23:00:00Z", venue: "AT&T Stadium, Arlington", homeWinProb: 78, drawProb: 15, awayWinProb: 7 },
  { n: 75, homeCode: "FRA", awayCode: "SEN", date: "2026-06-30T19:00:00Z", venue: "MetLife Stadium, East Rutherford", homeWinProb: 64, drawProb: 22, awayWinProb: 14 },
  { n: 76, homeCode: "ENG", awayCode: "ECU", date: "2026-06-30T23:00:00Z", venue: "Gillette Stadium, Foxboro", homeWinProb: 62, drawProb: 24, awayWinProb: 14 },
  { n: 77, homeCode: "BRA", awayCode: "KOR", date: "2026-07-01T19:00:00Z", venue: "Hard Rock Stadium, Miami", homeWinProb: 70, drawProb: 20, awayWinProb: 10 },
  { n: 78, homeCode: "POR", awayCode: "URU", date: "2026-07-01T23:00:00Z", venue: "Estadio Akron, Guadalajara", homeWinProb: 45, drawProb: 28, awayWinProb: 27 },
  { n: 79, homeCode: "GER", awayCode: "SUI", date: "2026-07-02T19:00:00Z", venue: "NRG Stadium, Houston", homeWinProb: 60, drawProb: 25, awayWinProb: 15 },
  { n: 80, homeCode: "NED", awayCode: "JPN", date: "2026-07-02T23:00:00Z", venue: "Lincoln Financial Field, Philadelphia", homeWinProb: 57, drawProb: 26, awayWinProb: 17 },
];

const ID_BASE = 2026200;

async function main() {
  const remove = process.argv.includes("--remove");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const ids = R32.map((m) => ID_BASE + m.n);

  if (remove) {
    const matches = await prisma.match.findMany({
      where: { apiFootballId: { in: ids } },
      select: { id: true },
    });
    const matchIds = matches.map((m) => m.id);
    const delPreds = await prisma.prediction.deleteMany({ where: { matchId: { in: matchIds } } });
    const delMatches = await prisma.match.deleteMany({ where: { apiFootballId: { in: ids } } });
    console.log(`Removed ${delMatches.count} R32 matches and ${delPreds.count} predictions.`);
    await prisma.$disconnect();
    return;
  }

  const codes = [...new Set(R32.flatMap((m) => [m.homeCode, m.awayCode]))];
  const teams = await prisma.team.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true },
  });
  const teamId = new Map(teams.map((t) => [t.code, t.id]));

  const missing = codes.filter((c) => !teamId.has(c));
  if (missing.length) {
    console.error(`Missing teams in DB: ${missing.join(", ")}. Aborting.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  let count = 0;
  for (const m of R32) {
    const apiFootballId = ID_BASE + m.n;
    await prisma.match.upsert({
      where: { apiFootballId },
      create: {
        apiFootballId,
        homeTeamId: teamId.get(m.homeCode)!,
        awayTeamId: teamId.get(m.awayCode)!,
        kickoffTime: new Date(m.date),
        stage: "R32",
        group: null,
        venue: m.venue,
        status: "SCHEDULED",
        homeWinProb: m.homeWinProb,
        drawProb: m.drawProb,
        awayWinProb: m.awayWinProb,
      },
      update: {
        homeTeamId: teamId.get(m.homeCode)!,
        awayTeamId: teamId.get(m.awayCode)!,
        kickoffTime: new Date(m.date),
        stage: "R32",
        group: null,
        venue: m.venue,
        status: "SCHEDULED",
        homeWinProb: m.homeWinProb,
        drawProb: m.drawProb,
        awayWinProb: m.awayWinProb,
      },
    });
    count++;
  }

  console.log(`Upserted ${count} R32 matches (${R32[0].homeCode} vs ${R32[0].awayCode} … ${R32[R32.length - 1].homeCode} vs ${R32[R32.length - 1].awayCode}).`);
  console.log("Remove later with: npx tsx scripts/dev-seed-knockout.ts --remove");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
