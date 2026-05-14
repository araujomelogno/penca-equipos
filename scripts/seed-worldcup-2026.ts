/**
 * Seed script: FIFA World Cup 2026 — Group Stage
 *
 * Loads all 48 teams (12 groups × 4) and 72 group-stage matches.
 * Teams with TBD playoff slots use placeholder names and will be
 * updated once qualifiers finish.
 *
 * apiFootballId values are temporary (2026xxx). The real sync script
 * (sync-fixtures.ts) will overwrite them when API-Football publishes
 * the 2026 season data.
 *
 * Run:  npx tsx scripts/seed-worldcup-2026.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Team data ───────────────────────────────────────────────────────
interface TeamSeed {
  name: string;
  code: string;
  group: string;
  apiFootballId: number; // temporary
  flagUrl: string;
}

// Flag URLs from flagcdn.com (ISO 3166-1 alpha-2 lowercase)
const flag = (iso2: string) =>
  `https://flagcdn.com/w80/${iso2.toLowerCase()}.png`;

const teams: TeamSeed[] = [
  // Group A
  { name: "Mexico", code: "MEX", group: "A", apiFootballId: 2026001, flagUrl: flag("mx") },
  { name: "South Africa", code: "RSA", group: "A", apiFootballId: 2026002, flagUrl: flag("za") },
  { name: "South Korea", code: "KOR", group: "A", apiFootballId: 2026003, flagUrl: flag("kr") },
  { name: "Czechia", code: "CZE", group: "A", apiFootballId: 2026004, flagUrl: flag("cz") },

  // Group B
  { name: "Canada", code: "CAN", group: "B", apiFootballId: 2026005, flagUrl: flag("ca") },
  { name: "Bosnia and Herzegovina", code: "BIH", group: "B", apiFootballId: 2026006, flagUrl: flag("ba") },
  { name: "Qatar", code: "QAT", group: "B", apiFootballId: 2026007, flagUrl: flag("qa") },
  { name: "Switzerland", code: "SUI", group: "B", apiFootballId: 2026008, flagUrl: flag("ch") },

  // Group C
  { name: "Brazil", code: "BRA", group: "C", apiFootballId: 2026009, flagUrl: flag("br") },
  { name: "Morocco", code: "MAR", group: "C", apiFootballId: 2026010, flagUrl: flag("ma") },
  { name: "Haiti", code: "HAI", group: "C", apiFootballId: 2026011, flagUrl: flag("ht") },
  { name: "Scotland", code: "SCO", group: "C", apiFootballId: 2026012, flagUrl: flag("gb-sct") },

  // Group D
  { name: "United States", code: "USA", group: "D", apiFootballId: 2026013, flagUrl: flag("us") },
  { name: "Paraguay", code: "PAR", group: "D", apiFootballId: 2026014, flagUrl: flag("py") },
  { name: "Australia", code: "AUS", group: "D", apiFootballId: 2026015, flagUrl: flag("au") },
  { name: "Turkey", code: "TUR", group: "D", apiFootballId: 2026016, flagUrl: flag("tr") },

  // Group E
  { name: "Germany", code: "GER", group: "E", apiFootballId: 2026017, flagUrl: flag("de") },
  { name: "Curaçao", code: "CUW", group: "E", apiFootballId: 2026018, flagUrl: flag("cw") },
  { name: "Ivory Coast", code: "CIV", group: "E", apiFootballId: 2026019, flagUrl: flag("ci") },
  { name: "Ecuador", code: "ECU", group: "E", apiFootballId: 2026020, flagUrl: flag("ec") },

  // Group F
  { name: "Netherlands", code: "NED", group: "F", apiFootballId: 2026021, flagUrl: flag("nl") },
  { name: "Japan", code: "JPN", group: "F", apiFootballId: 2026022, flagUrl: flag("jp") },
  { name: "Sweden", code: "SWE", group: "F", apiFootballId: 2026023, flagUrl: flag("se") },
  { name: "Tunisia", code: "TUN", group: "F", apiFootballId: 2026024, flagUrl: flag("tn") },

  // Group G
  { name: "Belgium", code: "BEL", group: "G", apiFootballId: 2026025, flagUrl: flag("be") },
  { name: "Egypt", code: "EGY", group: "G", apiFootballId: 2026026, flagUrl: flag("eg") },
  { name: "Iran", code: "IRN", group: "G", apiFootballId: 2026027, flagUrl: flag("ir") },
  { name: "New Zealand", code: "NZL", group: "G", apiFootballId: 2026028, flagUrl: flag("nz") },

  // Group H
  { name: "Spain", code: "ESP", group: "H", apiFootballId: 2026029, flagUrl: flag("es") },
  { name: "Cape Verde", code: "CPV", group: "H", apiFootballId: 2026030, flagUrl: flag("cv") },
  { name: "Saudi Arabia", code: "KSA", group: "H", apiFootballId: 2026031, flagUrl: flag("sa") },
  { name: "Uruguay", code: "URU", group: "H", apiFootballId: 2026032, flagUrl: flag("uy") },

  // Group I
  { name: "France", code: "FRA", group: "I", apiFootballId: 2026033, flagUrl: flag("fr") },
  { name: "Senegal", code: "SEN", group: "I", apiFootballId: 2026034, flagUrl: flag("sn") },
  { name: "Iraq", code: "IRQ", group: "I", apiFootballId: 2026035, flagUrl: flag("iq") },
  { name: "Norway", code: "NOR", group: "I", apiFootballId: 2026036, flagUrl: flag("no") },

  // Group J
  { name: "Argentina", code: "ARG", group: "J", apiFootballId: 2026037, flagUrl: flag("ar") },
  { name: "Algeria", code: "ALG", group: "J", apiFootballId: 2026038, flagUrl: flag("dz") },
  { name: "Austria", code: "AUT", group: "J", apiFootballId: 2026039, flagUrl: flag("at") },
  { name: "Jordan", code: "JOR", group: "J", apiFootballId: 2026040, flagUrl: flag("jo") },

  // Group K
  { name: "Portugal", code: "POR", group: "K", apiFootballId: 2026041, flagUrl: flag("pt") },
  { name: "DR Congo", code: "COD", group: "K", apiFootballId: 2026042, flagUrl: flag("cd") },
  { name: "Uzbekistan", code: "UZB", group: "K", apiFootballId: 2026043, flagUrl: flag("uz") },
  { name: "Colombia", code: "COL", group: "K", apiFootballId: 2026044, flagUrl: flag("co") },

  // Group L
  { name: "England", code: "ENG", group: "L", apiFootballId: 2026045, flagUrl: flag("gb-eng") },
  { name: "Croatia", code: "CRO", group: "L", apiFootballId: 2026046, flagUrl: flag("hr") },
  { name: "Ghana", code: "GHA", group: "L", apiFootballId: 2026047, flagUrl: flag("gh") },
  { name: "Panama", code: "PAN", group: "L", apiFootballId: 2026048, flagUrl: flag("pa") },
];

// ─── Match data ──────────────────────────────────────────────────────
// Times are in ET (Eastern Time) as published by FIFA/FOX.
// We convert to UTC by adding 4 hours (EDT, which applies in June).
interface MatchSeed {
  homeCode: string;
  awayCode: string;
  group: string;
  date: string;   // ISO date + ET time → converted to UTC below
  venue: string;
}

// Helper: parse "YYYY-MM-DD HH:mm ET" → UTC Date
function etToUtc(dateStr: string): Date {
  // dateStr = "2026-06-11 15:00"  (ET)
  const [datePart, timePart] = dateStr.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  // EDT = UTC-4
  return new Date(Date.UTC(y, m - 1, d, h + 4, min));
}

const matches: MatchSeed[] = [
  // ── Group A ──
  { homeCode: "MEX", awayCode: "RSA", group: "A", date: "2026-06-11 15:00", venue: "Estadio Azteca, Mexico City" },
  { homeCode: "KOR", awayCode: "CZE", group: "A", date: "2026-06-11 22:00", venue: "Estadio Akron, Guadalajara" },
  { homeCode: "CZE", awayCode: "RSA", group: "A", date: "2026-06-18 12:00", venue: "Mercedes-Benz Stadium, Atlanta" },
  { homeCode: "MEX", awayCode: "KOR", group: "A", date: "2026-06-18 21:00", venue: "Estadio Akron, Guadalajara" },
  { homeCode: "CZE", awayCode: "MEX", group: "A", date: "2026-06-24 21:00", venue: "Estadio Azteca, Mexico City" },
  { homeCode: "RSA", awayCode: "KOR", group: "A", date: "2026-06-24 21:00", venue: "Estadio BBVA, Monterrey" },

  // ── Group B ──
  { homeCode: "CAN", awayCode: "BIH", group: "B", date: "2026-06-12 15:00", venue: "BMO Field, Toronto" },
  { homeCode: "QAT", awayCode: "SUI", group: "B", date: "2026-06-13 15:00", venue: "Levi's Stadium, Santa Clara" },
  { homeCode: "SUI", awayCode: "BIH", group: "B", date: "2026-06-18 15:00", venue: "SoFi Stadium, Inglewood" },
  { homeCode: "CAN", awayCode: "QAT", group: "B", date: "2026-06-18 18:00", venue: "BC Place, Vancouver" },
  { homeCode: "SUI", awayCode: "CAN", group: "B", date: "2026-06-24 15:00", venue: "BC Place, Vancouver" },
  { homeCode: "BIH", awayCode: "QAT", group: "B", date: "2026-06-24 15:00", venue: "Lumen Field, Seattle" },

  // ── Group C ──
  { homeCode: "BRA", awayCode: "MAR", group: "C", date: "2026-06-13 18:00", venue: "MetLife Stadium, East Rutherford" },
  { homeCode: "HAI", awayCode: "SCO", group: "C", date: "2026-06-13 21:00", venue: "Gillette Stadium, Foxboro" },
  { homeCode: "SCO", awayCode: "MAR", group: "C", date: "2026-06-19 18:00", venue: "Gillette Stadium, Foxboro" },
  { homeCode: "BRA", awayCode: "HAI", group: "C", date: "2026-06-19 21:00", venue: "Lincoln Financial Field, Philadelphia" },
  { homeCode: "SCO", awayCode: "BRA", group: "C", date: "2026-06-24 18:00", venue: "Hard Rock Stadium, Miami" },
  { homeCode: "MAR", awayCode: "HAI", group: "C", date: "2026-06-24 18:00", venue: "Mercedes-Benz Stadium, Atlanta" },

  // ── Group D ──
  { homeCode: "USA", awayCode: "PAR", group: "D", date: "2026-06-12 21:00", venue: "SoFi Stadium, Inglewood" },
  { homeCode: "AUS", awayCode: "TUR", group: "D", date: "2026-06-13 00:00", venue: "BC Place, Vancouver" },
  { homeCode: "TUR", awayCode: "PAR", group: "D", date: "2026-06-19 00:00", venue: "Levi's Stadium, Santa Clara" },
  { homeCode: "USA", awayCode: "AUS", group: "D", date: "2026-06-19 15:00", venue: "Lumen Field, Seattle" },
  { homeCode: "TUR", awayCode: "USA", group: "D", date: "2026-06-25 22:00", venue: "SoFi Stadium, Inglewood" },
  { homeCode: "PAR", awayCode: "AUS", group: "D", date: "2026-06-25 22:00", venue: "Levi's Stadium, Santa Clara" },

  // ── Group E ──
  { homeCode: "GER", awayCode: "CUW", group: "E", date: "2026-06-14 13:00", venue: "NRG Stadium, Houston" },
  { homeCode: "CIV", awayCode: "ECU", group: "E", date: "2026-06-14 19:00", venue: "Lincoln Financial Field, Philadelphia" },
  { homeCode: "GER", awayCode: "CIV", group: "E", date: "2026-06-20 16:00", venue: "BMO Field, Toronto" },
  { homeCode: "ECU", awayCode: "CUW", group: "E", date: "2026-06-20 20:00", venue: "Arrowhead Stadium, Kansas City" },
  { homeCode: "CUW", awayCode: "CIV", group: "E", date: "2026-06-25 16:00", venue: "Lincoln Financial Field, Philadelphia" },
  { homeCode: "ECU", awayCode: "GER", group: "E", date: "2026-06-25 16:00", venue: "MetLife Stadium, East Rutherford" },

  // ── Group F ──
  { homeCode: "NED", awayCode: "JPN", group: "F", date: "2026-06-14 16:00", venue: "AT&T Stadium, Arlington" },
  { homeCode: "SWE", awayCode: "TUN", group: "F", date: "2026-06-14 22:00", venue: "Estadio BBVA, Monterrey" },
  { homeCode: "NED", awayCode: "SWE", group: "F", date: "2026-06-20 13:00", venue: "NRG Stadium, Houston" },
  { homeCode: "TUN", awayCode: "JPN", group: "F", date: "2026-06-20 00:00", venue: "Estadio BBVA, Monterrey" },
  { homeCode: "JPN", awayCode: "SWE", group: "F", date: "2026-06-25 19:00", venue: "AT&T Stadium, Arlington" },
  { homeCode: "TUN", awayCode: "NED", group: "F", date: "2026-06-25 19:00", venue: "Arrowhead Stadium, Kansas City" },

  // ── Group G ──
  { homeCode: "BEL", awayCode: "EGY", group: "G", date: "2026-06-15 15:00", venue: "Lumen Field, Seattle" },
  { homeCode: "IRN", awayCode: "NZL", group: "G", date: "2026-06-15 21:00", venue: "SoFi Stadium, Inglewood" },
  { homeCode: "BEL", awayCode: "IRN", group: "G", date: "2026-06-21 15:00", venue: "SoFi Stadium, Inglewood" },
  { homeCode: "NZL", awayCode: "EGY", group: "G", date: "2026-06-21 21:00", venue: "BC Place, Vancouver" },
  { homeCode: "EGY", awayCode: "IRN", group: "G", date: "2026-06-26 23:00", venue: "Lumen Field, Seattle" },
  { homeCode: "NZL", awayCode: "BEL", group: "G", date: "2026-06-26 23:00", venue: "BC Place, Vancouver" },

  // ── Group H ──
  { homeCode: "ESP", awayCode: "CPV", group: "H", date: "2026-06-15 12:00", venue: "Mercedes-Benz Stadium, Atlanta" },
  { homeCode: "KSA", awayCode: "URU", group: "H", date: "2026-06-15 18:00", venue: "Hard Rock Stadium, Miami" },
  { homeCode: "ESP", awayCode: "KSA", group: "H", date: "2026-06-21 12:00", venue: "Mercedes-Benz Stadium, Atlanta" },
  { homeCode: "URU", awayCode: "CPV", group: "H", date: "2026-06-21 18:00", venue: "Hard Rock Stadium, Miami" },
  { homeCode: "CPV", awayCode: "KSA", group: "H", date: "2026-06-26 20:00", venue: "NRG Stadium, Houston" },
  { homeCode: "URU", awayCode: "ESP", group: "H", date: "2026-06-26 20:00", venue: "Estadio Akron, Guadalajara" },

  // ── Group I ──
  { homeCode: "FRA", awayCode: "SEN", group: "I", date: "2026-06-16 15:00", venue: "MetLife Stadium, East Rutherford" },
  { homeCode: "IRQ", awayCode: "NOR", group: "I", date: "2026-06-16 18:00", venue: "Gillette Stadium, Foxboro" },
  { homeCode: "FRA", awayCode: "IRQ", group: "I", date: "2026-06-22 17:00", venue: "Lincoln Financial Field, Philadelphia" },
  { homeCode: "NOR", awayCode: "SEN", group: "I", date: "2026-06-22 20:00", venue: "MetLife Stadium, East Rutherford" },
  { homeCode: "NOR", awayCode: "FRA", group: "I", date: "2026-06-26 15:00", venue: "Gillette Stadium, Foxboro" },
  { homeCode: "SEN", awayCode: "IRQ", group: "I", date: "2026-06-26 15:00", venue: "BMO Field, Toronto" },

  // ── Group J ──
  { homeCode: "ARG", awayCode: "ALG", group: "J", date: "2026-06-16 21:00", venue: "Arrowhead Stadium, Kansas City" },
  { homeCode: "AUT", awayCode: "JOR", group: "J", date: "2026-06-17 00:00", venue: "Levi's Stadium, Santa Clara" },
  { homeCode: "ARG", awayCode: "AUT", group: "J", date: "2026-06-22 13:00", venue: "AT&T Stadium, Arlington" },
  { homeCode: "JOR", awayCode: "ALG", group: "J", date: "2026-06-22 23:00", venue: "Levi's Stadium, Santa Clara" },
  { homeCode: "JOR", awayCode: "ARG", group: "J", date: "2026-06-27 22:00", venue: "AT&T Stadium, Arlington" },
  { homeCode: "ALG", awayCode: "AUT", group: "J", date: "2026-06-27 22:00", venue: "Arrowhead Stadium, Kansas City" },

  // ── Group K ──
  { homeCode: "POR", awayCode: "COD", group: "K", date: "2026-06-17 13:00", venue: "NRG Stadium, Houston" },
  { homeCode: "UZB", awayCode: "COL", group: "K", date: "2026-06-17 22:00", venue: "Estadio Azteca, Mexico City" },
  { homeCode: "POR", awayCode: "UZB", group: "K", date: "2026-06-23 13:00", venue: "NRG Stadium, Houston" },
  { homeCode: "COL", awayCode: "COD", group: "K", date: "2026-06-23 22:00", venue: "Estadio Akron, Guadalajara" },
  { homeCode: "COL", awayCode: "POR", group: "K", date: "2026-06-27 19:30", venue: "Hard Rock Stadium, Miami" },
  { homeCode: "COD", awayCode: "UZB", group: "K", date: "2026-06-27 19:30", venue: "Mercedes-Benz Stadium, Atlanta" },

  // ── Group L ──
  { homeCode: "ENG", awayCode: "CRO", group: "L", date: "2026-06-17 16:00", venue: "AT&T Stadium, Arlington" },
  { homeCode: "GHA", awayCode: "PAN", group: "L", date: "2026-06-17 19:00", venue: "BMO Field, Toronto" },
  { homeCode: "ENG", awayCode: "GHA", group: "L", date: "2026-06-23 16:00", venue: "Gillette Stadium, Foxboro" },
  { homeCode: "PAN", awayCode: "CRO", group: "L", date: "2026-06-23 19:00", venue: "BMO Field, Toronto" },
  { homeCode: "PAN", awayCode: "ENG", group: "L", date: "2026-06-27 17:00", venue: "MetLife Stadium, East Rutherford" },
  { homeCode: "CRO", awayCode: "GHA", group: "L", date: "2026-06-27 17:00", venue: "Lincoln Financial Field, Philadelphia" },
];

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  // 1. Clear existing matches and teams (fresh seed)
  console.log("Clearing existing matches and teams...");
  await prisma.prediction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();

  // 2. Insert teams (batch)
  console.log("Inserting 48 teams...");
  await prisma.team.createMany({
    data: teams.map((t) => ({
      apiFootballId: t.apiFootballId,
      name: t.name,
      code: t.code,
      flagUrl: t.flagUrl || null,
      group: t.group,
    })),
  });

  // Build code → id map
  const allTeams = await prisma.team.findMany({ select: { id: true, code: true } });
  const teamMap = new Map(allTeams.map((t) => [t.code, t.id]));
  console.log(`  ✓ ${allTeams.length} teams inserted`);

  // 3. Insert matches (batch)
  console.log(`\nInserting ${matches.length} group-stage matches...`);
  let matchApiId = 2026100;

  const matchData = matches
    .map((m) => {
      const homeTeamId = teamMap.get(m.homeCode);
      const awayTeamId = teamMap.get(m.awayCode);
      if (!homeTeamId || !awayTeamId) {
        console.error(`  ✗ Team not found: ${m.homeCode} or ${m.awayCode}`);
        return null;
      }
      matchApiId++;
      return {
        apiFootballId: matchApiId,
        homeTeamId,
        awayTeamId,
        kickoffTime: etToUtc(m.date),
        stage: "GROUP" as const,
        group: m.group,
        venue: m.venue,
        status: "SCHEDULED" as const,
      };
    })
    .filter((m) => m !== null);

  await prisma.match.createMany({ data: matchData });
  console.log(`  ✓ ${matchData.length} matches inserted`);

  console.log(`\nDone! Seeded ${teams.length} teams and ${matches.length} matches.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
