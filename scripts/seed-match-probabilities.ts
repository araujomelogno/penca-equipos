/**
 * Seed match probabilities & AI analysis for all World Cup 2026 group-stage matches.
 *
 * Uses tournament (outright winner) odds to derive per-match win/draw/loss
 * probabilities via a simple strength-ratio model.
 *
 * Odds source: FanDuel (via Sports Illustrated), June 2026 — ~10 days before
 * kickoff, refreshed from the original NBC/Sky Bet March 2026 numbers now that
 * the playoff teams are decided. Algeria's number (400/1) is from Squawka.
 *
 * Run:  npx tsx scripts/seed-match-probabilities.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Team strength from tournament odds ──────────────────────────────
// American odds → implied probability of winning the tournament.
// We use this as a proxy for team "strength".

const tournamentOdds: Record<string, number> = {
  // Top favorites
  ESP: 420, FRA: 460, ENG: 650, BRA: 850, POR: 1000, ARG: 1000,
  GER: 1300, NED: 1600, BEL: 2200,
  // Contenders
  NOR: 3500, COL: 4000, JPN: 4500,
  MAR: 6000, USA: 6000, URU: 6000, MEX: 6500, SUI: 6500, CRO: 7000,
  TUR: 8000, ECU: 10000,
  // Outsiders
  SEN: 12500, AUT: 12500, CAN: 17500, SWE: 17500, CIV: 17500,
  PAR: 20000, EGY: 25000, SCO: 30000, ALG: 40000, BIH: 40000,
  GHA: 60000, CZE: 60000, KOR: 70000, IRN: 100000, TUN: 200000,
  // Longest shots (+250000)
  CPV: 250000, UZB: 250000, HAI: 250000, PAN: 250000, CUW: 250000,
  QAT: 250000, KSA: 250000, NZL: 250000, AUS: 250000, COD: 250000,
  IRQ: 250000, JOR: 250000, RSA: 250000,
};

/** Convert American odds (+X) to implied probability */
function oddsToProb(americanOdds: number): number {
  return 100 / (americanOdds + 100);
}

/** Get team strength (higher = stronger) */
function getStrength(code: string): number {
  const odds = tournamentOdds[code];
  if (!odds) return oddsToProb(80000); // unknown team → very weak
  return oddsToProb(odds);
}

/**
 * Derive match probabilities from team strengths.
 *
 * Model:
 * 1. Compute raw home/away win ratio from strength differential
 * 2. Apply a base draw probability (~23% for World Cup group stage,
 *    scaled down when the strength gap is large)
 * 3. Distribute remaining probability proportionally
 */
function matchProbabilities(
  homeCode: string,
  awayCode: string
): { homeWin: number; draw: number; awayWin: number } {
  const sH = getStrength(homeCode);
  const sA = getStrength(awayCode);

  // Strength ratio (with small home advantage ~8%)
  const homeAdv = 1.08;
  const rH = sH * homeAdv;
  const rA = sA;
  const total = rH + rA;

  // Raw win probabilities (no draw)
  const rawHome = rH / total;
  const rawAway = rA / total;

  // Draw probability: base 23%, reduced when gap is large
  const gap = Math.abs(rawHome - rawAway);
  const baseDraw = 0.23;
  const drawProb = Math.max(0.10, baseDraw * (1 - gap * 0.8));

  // Distribute remaining probability
  const remaining = 1 - drawProb;
  const homeWin = Math.round(rawHome * remaining * 100);
  const awayWin = Math.round(rawAway * remaining * 100);
  const draw = 100 - homeWin - awayWin;

  return { homeWin, draw, awayWin };
}

// ─── Analysis generation ─────────────────────────────────────────────

const teamDescriptions: Record<string, string> = {
  ESP: "Spain, the reigning European champions, bring a possession-based style and one of the deepest squads in the tournament",
  ENG: "England, perennial contenders with Premier League-tested talent across every position",
  FRA: "France, with a wealth of world-class attackers and a proven tournament pedigree",
  BRA: "Brazil, looking to rediscover their samba magic and end a long World Cup drought",
  ARG: "Argentina, the defending world champions led by a golden generation",
  POR: "Portugal, combining experienced veterans with exciting emerging talent",
  GER: "Germany, undergoing a tactical renovation while maintaining their trademark efficiency",
  NED: "The Netherlands, blending Dutch total football philosophy with modern tactical flexibility",
  NOR: "Norway, led by one of the world's most prolific strikers and a golden generation of talent",
  BEL: "Belgium, still boasting a talented squad despite their golden generation entering its twilight",
  COL: "Colombia, an exciting South American side with pace and creativity in abundance",
  MAR: "Morocco, building on their historic 2022 semifinal run with tactical discipline and flair",
  USA: "The United States, co-hosts with home-crowd advantage and a young, ambitious squad",
  URU: "Uruguay, a perennial overachiever with a warrior mentality and South American grit",
  MEX: "Mexico, co-hosts seeking to finally break their Round of 16 curse on home soil",
  ECU: "Ecuador, a young and dynamic South American side with speed and physicality",
  SUI: "Switzerland, a disciplined and well-organized European side capable of upsetting favorites",
  CRO: "Croatia, the 2022 semifinalists known for their midfield mastery and big-game mentality",
  JPN: "Japan, a technically gifted side that has consistently troubled European powers in recent tournaments",
  SEN: "Senegal, one of Africa's strongest teams with a blend of European league experience and raw athleticism",
  AUT: "Austria, a tactically astute side that has grown into a genuine threat under modern management",
  PAR: "Paraguay, returning to the World Cup with determination and South American defensive resilience",
  SCO: "Scotland, a passionate side eager to make their mark on the biggest stage",
  CAN: "Canada, co-hosts looking to build on their 2022 World Cup return after a 36-year absence",
  CIV: "Ivory Coast, the reigning African champions bringing speed, skill, and experience",
  EGY: "Egypt, one of Africa's most storied football nations with a passionate following",
  KOR: "South Korea, a disciplined and technically sound Asian powerhouse with World Cup pedigree",
  ALG: "Algeria, a talented North African side with pace and technical quality across the pitch",
  GHA: "Ghana, the Black Stars bringing African flair and a never-say-die attitude",
  RSA: "South Africa, returning to the World Cup with pride and a new generation of talent",
  TUN: "Tunisia, a tactically organized North African side with a strong defensive foundation",
  IRN: "Iran, Asia's representatives bringing discipline and counterattacking ability",
  CPV: "Cape Verde, making their historic World Cup debut as the tournament's ultimate underdog story",
  KSA: "Saudi Arabia, fresh off their stunning 2022 upset of Argentina, hoping to replicate that magic",
  QAT: "Qatar, the 2022 hosts bringing Asian Cup experience and ambition",
  PAN: "Panama, a Central American side with fighting spirit and growing international experience",
  NZL: "New Zealand, Oceania's lone representative bringing heart and determination",
  HAI: "Haiti, making a historic World Cup debut and representing Caribbean football on the biggest stage",
  UZB: "Uzbekistan, Central Asia's debutants bringing technical skill and tactical discipline",
  JOR: "Jordan, making their remarkable World Cup debut after a surprising qualification campaign",
  CUW: "Curaçao, the tiny Caribbean island making a fairy-tale World Cup debut",
  // Playoff qualifiers (decided March 2026)
  TUR: "Turkey, a technically gifted side full of in-form European league talent after coming through the UEFA playoffs",
  SWE: "Sweden, a physical and well-drilled Scandinavian side that battled through the playoffs",
  BIH: "Bosnia and Herzegovina, a spirited side with quality in midfield that edged Italy in the playoffs",
  CZE: "Czechia, a disciplined and organized European side with a knack for frustrating bigger nations",
  COD: "DR Congo, a powerful and athletic African side making the most of their intercontinental playoff run",
  IRQ: "Iraq, an emerging Asian side that earned their place through the intercontinental playoffs",
  AUS: "Australia, the Socceroos bringing trademark grit and tournament experience from Asia",
};

function getDesc(code: string): string {
  return teamDescriptions[code] ?? `${code}, bringing determination to compete at the World Cup`;
}

type Tier = "heavy_favorite" | "clear_favorite" | "slight_favorite" | "balanced";

function getTier(homeWin: number, awayWin: number): Tier {
  const diff = Math.abs(homeWin - awayWin);
  if (diff > 40) return "heavy_favorite";
  if (diff > 20) return "clear_favorite";
  if (diff > 8) return "slight_favorite";
  return "balanced";
}

function generateAnalysis(
  homeCode: string,
  awayCode: string,
  probs: { homeWin: number; draw: number; awayWin: number }
): string {
  const homeDesc = getDesc(homeCode);
  const awayDesc = getDesc(awayCode);
  const tier = getTier(probs.homeWin, probs.awayWin);
  const favCode = probs.homeWin >= probs.awayWin ? homeCode : awayCode;
  const undCode = probs.homeWin >= probs.awayWin ? awayCode : homeCode;
  const favDesc = getDesc(favCode);
  const undDesc = getDesc(undCode);

  const templates: Record<Tier, string[]> = {
    heavy_favorite: [
      `${favDesc}. They enter this match as heavy favorites against ${undCode}, who will need a monumental effort to take points. Expect the favorites to control possession and create chances at will, though World Cup upsets are never impossible.`,
      `A significant quality gap on paper sees ${favCode} as overwhelming favorites. ${undDesc}, but they face a daunting challenge. The key for the underdog will be defensive organization and hoping to capitalize on set pieces or counterattacks.`,
    ],
    clear_favorite: [
      `${favDesc}. They are clear favorites in this matchup, but ${undDesc}. The underdog has the quality to make this competitive, particularly if they can neutralize the favorite's strengths early and stay in the game.`,
      `${favCode} should have enough quality to prevail, but underestimating ${undCode} would be a mistake. ${undDesc}, and they'll look to press high and disrupt the favorite's rhythm. A draw is not out of the question if ${undCode} can maintain defensive discipline.`,
    ],
    slight_favorite: [
      `A competitive matchup where ${favCode} holds a slight edge. ${homeDesc}. Meanwhile, ${awayDesc.toLowerCase()}. Both sides have realistic chances, and this could easily go either way. Tactical adjustments and individual moments could decide the outcome.`,
      `${homeDesc}. ${awayDesc}. The margins are thin in this encounter, with both teams capable of taking all three points. Expect a cagey affair where the first goal could prove decisive.`,
    ],
    balanced: [
      `This promises to be one of the most evenly matched fixtures in the group stage. ${homeDesc}. ${awayDesc}. Neither side can afford to lose, and the tactical battle will be fascinating. A draw feels like a real possibility.`,
      `A true coin-flip encounter. ${homeDesc}. On the other side, ${awayDesc.toLowerCase()}. Both teams will see this as a must-win, creating an intense and unpredictable clash where small margins will decide everything.`,
    ],
  };

  const options = templates[tier];
  // Deterministic pick based on team codes
  const hash = (homeCode.charCodeAt(0) + awayCode.charCodeAt(0)) % options.length;
  return options[hash];
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const matches = await prisma.match.findMany({
    where: { stage: "GROUP" },
    include: { homeTeam: true, awayTeam: true },
  });

  console.log(`Updating ${matches.length} matches with probabilities & analysis...\n`);

  for (const m of matches) {
    const probs = matchProbabilities(m.homeTeam.code, m.awayTeam.code);
    const analysis = generateAnalysis(m.homeTeam.code, m.awayTeam.code, probs);

    await prisma.match.update({
      where: { id: m.id },
      data: {
        homeWinProb: probs.homeWin,
        drawProb: probs.draw,
        awayWinProb: probs.awayWin,
        analysis,
      },
    });

    console.log(
      `  ${m.homeTeam.code} vs ${m.awayTeam.code} → ${probs.homeWin}% / ${probs.draw}% / ${probs.awayWin}%`
    );
  }

  console.log("\nDone!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
