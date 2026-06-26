/**
 * Pure planning logic for loading API-Football fixtures into our DB.
 *
 * Unlike the naive upsert-by-id approach, this NEVER creates teams: it resolves
 * each API team name to an EXISTING seeded team (alias-aware, via team-matching)
 * and fails closed when a name can't be resolved. Matches are keyed by
 * (stage, unordered team pair) so a knockout rematch is never confused with the
 * group-stage fixture between the same two teams.
 *
 * Kept free of Prisma/IO so it can be unit-tested. Mirrors reconcile-core.ts.
 */
import { resolveTeamCode } from "./team-matching";
import { mapApiStatus, mapApiStage } from "./api-football";

export interface SyncTeam {
  id: string;
  name: string;
  code: string;
}

export interface SyncMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  stage: string;
}

export interface SyncFixtureInput {
  fixture: {
    id: number;
    date: string;
    venue: { name: string; city: string } | null;
    status: { short: string };
  };
  league: { round: string };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
}

interface SyncFields {
  apiFootballId: number;
  stage: string;
  kickoffTime: string;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  matchStatus: string;
}

export type SyncPlan =
  | { status: "unmatched-team"; unresolved: string[] }
  | ({ status: "update"; matchId: string } & SyncFields)
  | ({ status: "create"; homeTeamId: string; awayTeamId: string; group: string | null } & SyncFields);

const pairKey = (a: string, b: string) => [a, b].sort().join("|");
const stagePairKey = (stage: string, a: string, b: string) => `${stage}|${pairKey(a, b)}`;

export function planFixtureSync(
  fixture: SyncFixtureInput,
  teams: SyncTeam[],
  matches: SyncMatch[],
): SyncPlan {
  const homeCode = resolveTeamCode(fixture.teams.home.name, teams);
  const awayCode = resolveTeamCode(fixture.teams.away.name, teams);

  const unresolved: string[] = [];
  if (!homeCode) unresolved.push(fixture.teams.home.name);
  if (!awayCode) unresolved.push(fixture.teams.away.name);
  if (!homeCode || !awayCode) {
    return { status: "unmatched-team", unresolved };
  }

  const stage = mapApiStage(fixture.league.round);
  const fields: SyncFields = {
    apiFootballId: fixture.fixture.id,
    stage,
    kickoffTime: fixture.fixture.date,
    venue: fixture.fixture.venue
      ? `${fixture.fixture.venue.name}, ${fixture.fixture.venue.city}`
      : null,
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    matchStatus: mapApiStatus(fixture.fixture.status.short),
  };

  const codeById = new Map(teams.map((t) => [t.id, t.code]));
  const byStagePair = new Map<string, SyncMatch>();
  for (const m of matches) {
    const hc = codeById.get(m.homeTeamId);
    const ac = codeById.get(m.awayTeamId);
    if (hc && ac) byStagePair.set(stagePairKey(m.stage, hc, ac), m);
  }

  const existing = byStagePair.get(stagePairKey(stage, homeCode, awayCode));
  if (existing) {
    // Keep OUR home/away orientation; swap the score if the API lists it the
    // other way around. Never touch the seeded `group` letter here.
    const ourHomeCode = codeById.get(existing.homeTeamId);
    const sameOrientation = ourHomeCode === homeCode;
    return {
      status: "update",
      matchId: existing.id,
      ...fields,
      homeScore: sameOrientation ? fixture.goals.home : fixture.goals.away,
      awayScore: sameOrientation ? fixture.goals.away : fixture.goals.home,
    };
  }

  const idByCode = new Map(teams.map((t) => [t.code, t.id]));
  return {
    status: "create",
    homeTeamId: idByCode.get(homeCode)!,
    awayTeamId: idByCode.get(awayCode)!,
    group: null,
    ...fields,
  };
}
