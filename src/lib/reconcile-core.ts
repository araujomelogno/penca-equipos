/**
 * Pure planning logic for reconciling API-Football fixtures against our
 * seeded matches. Kept free of Prisma/IO so it can be unit-tested.
 *
 * Matching strategy (installation-agnostic — does NOT rely on the synthetic
 * `apiFootballId` values from the seed):
 *   1. Resolve each API team name to our seed `code` (via team-matching).
 *   2. Find the seeded match by the unordered team pair.
 *   3. Assign the score to OUR home/away orientation, swapping if the API
 *      lists the fixture the other way around.
 */
import { resolveTeamCode } from "./team-matching";
import { mapApiStatus } from "./api-football";

export interface ReconcileTeam {
  id: string;
  name: string;
  code: string;
}

export interface ReconcileMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
}

export interface ReconcileFixtureInput {
  fixture: { id: number; date: string; status: { short: string } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
}

export type ReconcilePlan =
  | {
      status: "matched";
      matchId: string;
      apiFootballId: number;
      kickoffTime: string;
      homeScore: number | null;
      awayScore: number | null;
      matchStatus: string;
    }
  | { status: "unmatched-team"; unresolved: string[] }
  | { status: "unmatched-fixture"; homeCode: string; awayCode: string };

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

export function planFixtureReconciliation(
  fixture: ReconcileFixtureInput,
  teams: ReconcileTeam[],
  matches: ReconcileMatch[],
): ReconcilePlan {
  const apiHomeCode = resolveTeamCode(fixture.teams.home.name, teams);
  const apiAwayCode = resolveTeamCode(fixture.teams.away.name, teams);

  const unresolved: string[] = [];
  if (!apiHomeCode) unresolved.push(fixture.teams.home.name);
  if (!apiAwayCode) unresolved.push(fixture.teams.away.name);
  if (!apiHomeCode || !apiAwayCode) {
    return { status: "unmatched-team", unresolved };
  }

  const codeById = new Map(teams.map((t) => [t.id, t.code]));
  const matchByPair = new Map<string, ReconcileMatch>();
  for (const m of matches) {
    const hc = codeById.get(m.homeTeamId);
    const ac = codeById.get(m.awayTeamId);
    if (hc && ac) matchByPair.set(pairKey(hc, ac), m);
  }

  const match = matchByPair.get(pairKey(apiHomeCode, apiAwayCode));
  if (!match) {
    return { status: "unmatched-fixture", homeCode: apiHomeCode, awayCode: apiAwayCode };
  }

  // Orient the score to OUR home/away designation.
  const ourHomeCode = codeById.get(match.homeTeamId);
  const sameOrientation = ourHomeCode === apiHomeCode;
  const homeScore = sameOrientation ? fixture.goals.home : fixture.goals.away;
  const awayScore = sameOrientation ? fixture.goals.away : fixture.goals.home;

  return {
    status: "matched",
    matchId: match.id,
    apiFootballId: fixture.fixture.id,
    kickoffTime: fixture.fixture.date,
    homeScore,
    awayScore,
    matchStatus: mapApiStatus(fixture.fixture.status.short),
  };
}
