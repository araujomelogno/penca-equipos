/**
 * Betting-market-derived match probability model.
 *
 * Source of truth: a static snapshot of tournament (outright-winner) betting
 * odds (FanDuel via Sports Illustrated, June 2026), used as a team "strength"
 * proxy. Per-match win/draw/loss probabilities are SYNTHESIZED from the
 * strength differential — they are NOT live per-match 1X2 odds.
 *
 * Venues are neutral by default (no home advantage). The only exception is a
 * co-host nation (USA, Mexico, Canada) playing in ITS OWN country, which gets a
 * small home-advantage boost. The advantaged side is decided by the venue, so a
 * co-host playing at another co-host's stadium gets NO boost.
 */

// ─── Team strength from tournament odds ──────────────────────────────
// American odds (+X) → implied probability of winning the tournament.
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

/** Convert American odds (+X) to implied probability. */
export function oddsToProb(americanOdds: number): number {
  return 100 / (americanOdds + 100);
}

/** Team strength (higher = stronger). Unknown team → very weak. */
export function getStrength(code: string): number {
  const odds = tournamentOdds[code];
  if (!odds) return oddsToProb(80000);
  return oddsToProb(odds);
}

// ─── Host-nation home advantage ──────────────────────────────────────
export type HostCountry = "USA" | "MEX" | "CAN";
export type AdvantagedSide = "home" | "away" | null;

/** Co-host team codes that can earn home advantage in their own country. */
export const CO_HOST_CODES: ReadonlySet<string> = new Set<HostCountry>([
  "USA",
  "MEX",
  "CAN",
]);

/** Home-advantage strength multiplier applied to the advantaged side. */
export const HOME_ADVANTAGE = 1.08;

// Lower-cased keywords (stadium names + host cities) that identify the
// hosting country of a "<stadium>, <city>" venue string.
const HOST_VENUE_KEYWORDS: Record<HostCountry, string[]> = {
  USA: [
    "atlanta", "mercedes-benz",
    "foxboro", "foxborough", "gillette", "boston",
    "arlington", "at&t", "dallas",
    "houston", "nrg",
    "kansas city", "arrowhead",
    "inglewood", "sofi", "los angeles",
    "miami", "hard rock",
    "east rutherford", "metlife", "new york", "new jersey",
    "philadelphia", "lincoln financial",
    "santa clara", "levi", "san francisco",
    "seattle", "lumen",
  ],
  MEX: [
    "guadalajara", "zapopan", "akron",
    "mexico city", "ciudad de m", "azteca", "banorte",
    "monterrey", "bbva",
  ],
  CAN: [
    "toronto", "bmo",
    "vancouver", "bc place",
  ],
};

/** Resolve the hosting country of a venue string, or null if unknown. */
export function hostCountryForVenue(venue: string | null | undefined): HostCountry | null {
  if (!venue) return null;
  const v = venue.toLowerCase();
  for (const country of Object.keys(HOST_VENUE_KEYWORDS) as HostCountry[]) {
    if (HOST_VENUE_KEYWORDS[country].some((kw) => v.includes(kw))) {
      return country;
    }
  }
  return null;
}

/**
 * Decide which side gets the home-advantage boost: a co-host playing in its own
 * country. Returns null for neutral venues, unknown venues, or co-hosts playing
 * outside their country.
 */
export function pickAdvantagedSide(
  homeCode: string,
  awayCode: string,
  venue: string | null | undefined,
): AdvantagedSide {
  const host = hostCountryForVenue(venue);
  if (!host) return null;
  if (homeCode === host) return "home";
  if (awayCode === host) return "away";
  return null;
}

// ─── Match probabilities ─────────────────────────────────────────────
/**
 * Derive win/draw/loss probabilities (integers summing to 100) from team
 * strengths. `advantagedSide` applies the host-nation boost to one side; pass
 * null for a fully neutral venue.
 */
export function matchProbabilities(
  homeCode: string,
  awayCode: string,
  advantagedSide: AdvantagedSide = null,
): { homeWin: number; draw: number; awayWin: number } {
  const sH = getStrength(homeCode);
  const sA = getStrength(awayCode);

  const rH = sH * (advantagedSide === "home" ? HOME_ADVANTAGE : 1);
  const rA = sA * (advantagedSide === "away" ? HOME_ADVANTAGE : 1);
  const total = rH + rA;

  const rawHome = rH / total;
  const rawAway = rA / total;

  // Draw probability: base 23%, reduced when the strength gap is large.
  const gap = Math.abs(rawHome - rawAway);
  const baseDraw = 0.23;
  const drawProb = Math.max(0.1, baseDraw * (1 - gap * 0.8));

  const remaining = 1 - drawProb;
  const homeWin = Math.round(rawHome * remaining * 100);
  const awayWin = Math.round(rawAway * remaining * 100);
  const draw = 100 - homeWin - awayWin;

  return { homeWin, draw, awayWin };
}

export type Tier = "heavy_favorite" | "clear_favorite" | "slight_favorite" | "balanced";

/** Favoritism tier from the win-probability spread (drives analysis prose). */
export function getTier(homeWin: number, awayWin: number): Tier {
  const diff = Math.abs(homeWin - awayWin);
  if (diff > 40) return "heavy_favorite";
  if (diff > 20) return "clear_favorite";
  if (diff > 8) return "slight_favorite";
  return "balanced";
}
