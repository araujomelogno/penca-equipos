import { prisma } from "@/lib/prisma";

// --- FIFA 2026 Official Bracket Structure ---

// R32 matchups (match numbers from FIFA schedule)
// Third-place slots show possible groups — resolved after group stage
export interface BracketSlot {
  label: string; // e.g. "1A", "2B", "3rd C/D/E"
  teamCode?: string;
  teamName?: string;
  flagUrl?: string | null;
  score?: number | null;
}

export interface BracketMatch {
  matchNumber: number;
  stage: string;
  home: BracketSlot;
  away: BracketSlot;
  status: string; // SCHEDULED, LIVE, FINISHED
  feedsInto?: number; // which match number this winner feeds into
}

// The official FIFA 2026 bracket (source: Wikipedia / FIFA schedule)
// R32: 16 matches (73-88)
// R16: 8 matches (89-96)
// QF:  4 matches (97-100)
// SF:  2 matches (101-102)
// F:   1 match (104)

interface R32Def {
  matchNumber: number;
  home: string; // "1A" = winner group A, "2B" = runner-up group B, "3rd X/Y/Z" = best 3rd
  away: string;
}

const R32_BRACKET: R32Def[] = [
  { matchNumber: 73, home: "2A", away: "2B" },
  { matchNumber: 74, home: "1E", away: "3rd A/B/C/D/F" },
  { matchNumber: 75, home: "1F", away: "2C" },
  { matchNumber: 76, home: "1C", away: "2F" },
  { matchNumber: 77, home: "1I", away: "3rd C/D/F/G/H" },
  { matchNumber: 78, home: "2E", away: "2I" },
  { matchNumber: 79, home: "1A", away: "3rd C/E/F/H/I" },
  { matchNumber: 80, home: "1L", away: "3rd E/H/I/J/K" },
  { matchNumber: 81, home: "1D", away: "3rd B/E/F/I/J" },
  { matchNumber: 82, home: "1G", away: "3rd A/E/H/I/J" },
  { matchNumber: 83, home: "2K", away: "2L" },
  { matchNumber: 84, home: "1H", away: "2J" },
  { matchNumber: 85, home: "1B", away: "3rd E/F/G/I/J" },
  { matchNumber: 86, home: "1J", away: "2H" },
  { matchNumber: 87, home: "1K", away: "3rd D/E/I/J/L" },
  { matchNumber: 88, home: "2D", away: "2G" },
];

// R16 pairings: which R32 winners meet
const R16_FEEDS: { matchNumber: number; homeFrom: number; awayFrom: number }[] = [
  { matchNumber: 89, homeFrom: 74, awayFrom: 77 },
  { matchNumber: 90, homeFrom: 73, awayFrom: 75 },
  { matchNumber: 91, homeFrom: 76, awayFrom: 78 },
  { matchNumber: 92, homeFrom: 79, awayFrom: 80 },
  { matchNumber: 93, homeFrom: 83, awayFrom: 84 },
  { matchNumber: 94, homeFrom: 81, awayFrom: 82 },
  { matchNumber: 95, homeFrom: 86, awayFrom: 88 },
  { matchNumber: 96, homeFrom: 85, awayFrom: 87 },
];

const QF_FEEDS: { matchNumber: number; homeFrom: number; awayFrom: number }[] = [
  { matchNumber: 97, homeFrom: 89, awayFrom: 90 },
  { matchNumber: 98, homeFrom: 93, awayFrom: 94 },
  { matchNumber: 99, homeFrom: 91, awayFrom: 92 },
  { matchNumber: 100, homeFrom: 95, awayFrom: 96 },
];

const SF_FEEDS: { matchNumber: number; homeFrom: number; awayFrom: number }[] = [
  { matchNumber: 101, homeFrom: 97, awayFrom: 98 },
  { matchNumber: 102, homeFrom: 99, awayFrom: 100 },
];

const FINAL_FEED = { matchNumber: 104, homeFrom: 101, awayFrom: 102 };

export interface BracketData {
  r32: BracketMatch[];
  r16: BracketMatch[];
  qf: BracketMatch[];
  sf: BracketMatch[];
  final: BracketMatch;
}

export async function getBracketData(): Promise<BracketData> {
  // Fetch all knockout matches + group standings for resolving labels
  const [knockoutMatches, groupStandings] = await Promise.all([
    prisma.match.findMany({
      where: { stage: { not: "GROUP" } },
      select: {
        id: true,
        stage: true,
        status: true,
        homeTeam: { select: { name: true, code: true, flagUrl: true } },
        awayTeam: { select: { name: true, code: true, flagUrl: true } },
        homeScore: true,
        awayScore: true,
        kickoffTime: true,
      },
      orderBy: { kickoffTime: "asc" },
    }),
    getGroupPositions(),
  ]);

  // Map knockout matches by stage for lookup
  // We'll match by kickoff order within each stage
  const matchesByStage = new Map<string, typeof knockoutMatches>();
  for (const m of knockoutMatches) {
    const arr = matchesByStage.get(m.stage) ?? [];
    arr.push(m);
    matchesByStage.set(m.stage, arr);
  }

  function makeSlot(label: string): BracketSlot {
    // Try to resolve from group standings
    // "1A" → position 1 in group A, "2B" → position 2 in group B
    const posMatch = label.match(/^([12])([A-L])$/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]) - 1;
      const group = posMatch[2];
      const team = groupStandings.get(group)?.[pos];
      if (team) {
        return { label, teamCode: team.code, teamName: team.name, flagUrl: team.flagUrl };
      }
    }
    return { label };
  }

  function makeSlotFromTeam(team: { name: string; code: string; flagUrl: string | null }, score: number | null, label: string): BracketSlot {
    return { label, teamCode: team.code, teamName: team.name, flagUrl: team.flagUrl, score };
  }

  // Build R32
  const r32Matches = matchesByStage.get("R32") ?? [];
  const r32: BracketMatch[] = R32_BRACKET.map((def, i) => {
    const dbMatch = r32Matches[i];
    if (dbMatch) {
      return {
        matchNumber: def.matchNumber,
        stage: "R32",
        home: makeSlotFromTeam(dbMatch.homeTeam, dbMatch.homeScore, def.home),
        away: makeSlotFromTeam(dbMatch.awayTeam, dbMatch.awayScore, def.away),
        status: dbMatch.status,
      };
    }
    return {
      matchNumber: def.matchNumber,
      stage: "R32",
      home: makeSlot(def.home),
      away: makeSlot(def.away),
      status: "SCHEDULED",
    };
  });

  function buildRound(
    feeds: { matchNumber: number; homeFrom: number; awayFrom: number }[],
    stage: string,
    dbMatches: typeof knockoutMatches,
  ): BracketMatch[] {
    return feeds.map((feed, i) => {
      const dbMatch = dbMatches[i];
      if (dbMatch) {
        return {
          matchNumber: feed.matchNumber,
          stage,
          home: makeSlotFromTeam(dbMatch.homeTeam, dbMatch.homeScore, `W${feed.homeFrom}`),
          away: makeSlotFromTeam(dbMatch.awayTeam, dbMatch.awayScore, `W${feed.awayFrom}`),
          status: dbMatch.status,
        };
      }
      return {
        matchNumber: feed.matchNumber,
        stage,
        home: { label: `W${feed.homeFrom}` },
        away: { label: `W${feed.awayFrom}` },
        status: "SCHEDULED",
      };
    });
  }

  const r16 = buildRound(R16_FEEDS, "R16", matchesByStage.get("R16") ?? []);
  const qf = buildRound(QF_FEEDS, "QF", matchesByStage.get("QF") ?? []);
  const sf = buildRound(SF_FEEDS, "SF", matchesByStage.get("SF") ?? []);

  const finalMatches = matchesByStage.get("FINAL") ?? [];
  const finalMatch = finalMatches[0];
  const final: BracketMatch = finalMatch
    ? {
        matchNumber: FINAL_FEED.matchNumber,
        stage: "FINAL",
        home: makeSlotFromTeam(finalMatch.homeTeam, finalMatch.homeScore, `W${FINAL_FEED.homeFrom}`),
        away: makeSlotFromTeam(finalMatch.awayTeam, finalMatch.awayScore, `W${FINAL_FEED.awayFrom}`),
        status: finalMatch.status,
      }
    : {
        matchNumber: FINAL_FEED.matchNumber,
        stage: "FINAL",
        home: { label: `W${FINAL_FEED.homeFrom}` },
        away: { label: `W${FINAL_FEED.awayFrom}` },
        status: "SCHEDULED",
      };

  return { r32, r16, qf, sf, final };
}

// Get current group positions (top teams per group)
async function getGroupPositions(): Promise<Map<string, { code: string; name: string; flagUrl: string | null }[]>> {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({
      where: { group: { not: null } },
      select: { id: true, name: true, code: true, flagUrl: true, group: true },
    }),
    prisma.match.findMany({
      where: { stage: "GROUP", status: "FINISHED" },
      select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, group: true },
    }),
  ]);

  // Build points per team
  const pointsMap = new Map<string, number>();
  const gdMap = new Map<string, number>();
  const gfMap = new Map<string, number>();

  for (const t of teams) {
    pointsMap.set(t.id, 0);
    gdMap.set(t.id, 0);
    gfMap.set(t.id, 0);
  }

  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    gfMap.set(m.homeTeamId, (gfMap.get(m.homeTeamId) ?? 0) + m.homeScore);
    gfMap.set(m.awayTeamId, (gfMap.get(m.awayTeamId) ?? 0) + m.awayScore);
    gdMap.set(m.homeTeamId, (gdMap.get(m.homeTeamId) ?? 0) + m.homeScore - m.awayScore);
    gdMap.set(m.awayTeamId, (gdMap.get(m.awayTeamId) ?? 0) + m.awayScore - m.homeScore);

    if (m.homeScore > m.awayScore) {
      pointsMap.set(m.homeTeamId, (pointsMap.get(m.homeTeamId) ?? 0) + 3);
    } else if (m.homeScore < m.awayScore) {
      pointsMap.set(m.awayTeamId, (pointsMap.get(m.awayTeamId) ?? 0) + 3);
    } else {
      pointsMap.set(m.homeTeamId, (pointsMap.get(m.homeTeamId) ?? 0) + 1);
      pointsMap.set(m.awayTeamId, (pointsMap.get(m.awayTeamId) ?? 0) + 1);
    }
  }

  const groupMap = new Map<string, { code: string; name: string; flagUrl: string | null }[]>();

  // Track which groups have at least one finished match
  const groupsWithResults = new Set(matches.map((m) => m.group).filter(Boolean));

  const groupTeams = new Map<string, typeof teams>();
  for (const t of teams) {
    if (!t.group) continue;
    const arr = groupTeams.get(t.group) ?? [];
    arr.push(t);
    groupTeams.set(t.group, arr);
  }

  for (const [group, gTeams] of groupTeams) {
    // Only resolve teams if the group has played at least one match
    if (!groupsWithResults.has(group)) continue;

    const sorted = [...gTeams].sort((a, b) => {
      const ptsA = pointsMap.get(a.id) ?? 0;
      const ptsB = pointsMap.get(b.id) ?? 0;
      if (ptsB !== ptsA) return ptsB - ptsA;
      const gdA = gdMap.get(a.id) ?? 0;
      const gdB = gdMap.get(b.id) ?? 0;
      if (gdB !== gdA) return gdB - gdA;
      return (gfMap.get(b.id) ?? 0) - (gfMap.get(a.id) ?? 0);
    });

    groupMap.set(
      group,
      sorted.map((t) => ({ code: t.code, name: t.name, flagUrl: t.flagUrl })),
    );
  }

  return groupMap;
}
