/**
 * Pure, deterministic resolver for Prediction Arena events from API-Football
 * `/fixtures/events` data. Supports a registry of 14 event types dispatched
 * by `kind`; falls back to English title matching for legacy events that
 * predate the `kind` field.
 *
 * No IO here so it is fully unit-testable. The caller (scripts/resolve-arena-
 * week-from-api.ts) fetches each match's events and maps API team ids to our
 * Team rows.
 *
 * Chronology across concurrent matches uses WALL-CLOCK time
 * (kickoff + match minute), so "first"/"latest" are true week-wide orderings,
 * not per-match minutes.
 */

export interface ApiEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number };
  player: { id: number | null; name: string | null };
  type: string; // "Goal" | "Card" | "subst" | "Var" | ...
  detail: string; // "Normal Goal" | "Penalty" | "Own Goal" | "Missed Penalty" | "Red Card" | "Second Yellow card" | ...
}

export interface MatchEvents {
  apiFootballId: number;
  kickoffTime: string | Date;
  homeTeamApiId: number;
  awayTeamApiId: number;
  events: ApiEvent[];
}

export type ArenaResult =
  | { result: "HAPPENED"; teamApiId: number }
  | { result: "NO_HAPPENED"; teamApiId: null };

export interface ArenaResolutions {
  firstRedCard: ArenaResult;
  hatTrick: ArenaResult;
  comeback: ArenaResult;
  latestGoal: ArenaResult;
  firstPenaltyGoal: ArenaResult;
  firstOwnGoal: ArenaResult;
}

/** Maps the resolution keys to the canonical default event titles (en). */
export const RESOLUTION_TITLES: Record<keyof ArenaResolutions, string> = {
  firstRedCard: "First red card",
  hatTrick: "Hat-trick",
  comeback: "Comeback",
  latestGoal: "Latest goal",
  firstPenaltyGoal: "First penalty goal",
  firstOwnGoal: "First own goal",
};

const HAPPENED = (teamApiId: number): ArenaResult => ({ result: "HAPPENED", teamApiId });
const NOT: ArenaResult = { result: "NO_HAPPENED", teamApiId: null };

const GOAL_DETAILS = new Set(["Normal Goal", "Penalty", "Own Goal"]);

interface FlatEvent {
  /** Absolute wall-clock instant in ms: kickoff + (elapsed+extra) minutes. */
  at: number;
  /** In-match minute, for hat-trick grouping only. */
  match: MatchEvents;
  ev: ApiEvent;
}

function absMinuteMs(kickoff: number, e: ApiEvent): number {
  const minute = e.time.elapsed + (e.time.extra ?? 0);
  return kickoff + minute * 60_000;
}

function isGoal(e: ApiEvent): boolean {
  return e.type === "Goal" && GOAL_DETAILS.has(e.detail);
}

function isRed(e: ApiEvent): boolean {
  return (
    e.type === "Card" &&
    (e.detail === "Red Card" || e.detail === "Second Yellow card")
  );
}

/** The team credited with a goal (own goals go to the opponent). */
function scoringTeamApiId(m: MatchEvents, e: ApiEvent): number {
  if (e.detail === "Own Goal") {
    return e.team.id === m.homeTeamApiId ? m.awayTeamApiId : m.homeTeamApiId;
  }
  return e.team.id;
}

function comebackTeam(m: MatchEvents): number | null {
  // Replay the goal sequence (in-match minute order); a team that was ever
  // behind and ends up winning is the comeback team.
  const goals = m.events
    .filter(isGoal)
    .slice()
    .sort(
      (a, b) =>
        a.time.elapsed + (a.time.extra ?? 0) - (b.time.elapsed + (b.time.extra ?? 0)),
    );

  let home = 0;
  let away = 0;
  let homeWasBehind = false;
  let awayWasBehind = false;
  for (const g of goals) {
    if (scoringTeamApiId(m, g) === m.homeTeamApiId) home++;
    else away++;
    if (home < away) homeWasBehind = true;
    if (away < home) awayWasBehind = true;
  }
  if (home > away && homeWasBehind) return m.homeTeamApiId;
  if (away > home && awayWasBehind) return m.awayTeamApiId;
  return null;
}

function flatByTime(matches: MatchEvents[]): FlatEvent[] {
  const flat: FlatEvent[] = [];
  for (const m of matches) {
    const kickoff = new Date(m.kickoffTime).getTime();
    for (const ev of m.events) flat.push({ at: absMinuteMs(kickoff, ev), match: m, ev });
  }
  return flat.sort((a, b) => a.at - b.at);
}

export function resolveFirstRedCard(matches: MatchEvents[]): ArenaResult {
  const f = flatByTime(matches).find((x) => isRed(x.ev));
  return f ? HAPPENED(f.ev.team.id) : NOT;
}

export function resolveFirstPenaltyGoal(matches: MatchEvents[]): ArenaResult {
  const f = flatByTime(matches).find((x) => x.ev.type === "Goal" && x.ev.detail === "Penalty");
  return f ? HAPPENED(f.ev.team.id) : NOT;
}

export function resolveFirstOwnGoal(matches: MatchEvents[]): ArenaResult {
  const f = flatByTime(matches).find((x) => x.ev.type === "Goal" && x.ev.detail === "Own Goal");
  return f ? HAPPENED(f.ev.team.id) : NOT;
}

export function resolveLatestGoal(matches: MatchEvents[]): ArenaResult {
  const goals = flatByTime(matches).filter((x) => isGoal(x.ev));
  const last = goals[goals.length - 1];
  return last ? HAPPENED(scoringTeamApiId(last.match, last.ev)) : NOT;
}

export function resolveHatTrick(matches: MatchEvents[]): ArenaResult {
  for (const m of matches) {
    const counts = new Map<string, number>();
    for (const ev of m.events) {
      if (ev.type !== "Goal") continue;
      if (ev.detail !== "Normal Goal" && ev.detail !== "Penalty") continue;
      const pid = String(ev.player.id ?? ev.player.name ?? "?");
      const n = (counts.get(pid) ?? 0) + 1;
      counts.set(pid, n);
      if (n >= 3) return HAPPENED(ev.team.id);
    }
  }
  return NOT;
}

function matchesByKickoff(matches: MatchEvents[]): MatchEvents[] {
  return matches
    .slice()
    .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime());
}

export function resolveComeback(matches: MatchEvents[]): ArenaResult {
  for (const m of matchesByKickoff(matches)) {
    const team = comebackTeam(m);
    if (team !== null) return HAPPENED(team);
  }
  return NOT;
}

export function teamGoals(m: MatchEvents): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const ev of m.events) {
    if (!isGoal(ev)) continue;
    if (scoringTeamApiId(m, ev) === m.homeTeamApiId) home++;
    else away++;
  }
  return { home, away };
}

export function resolveFirstGoal(matches: MatchEvents[]): ArenaResult {
  const g = flatByTime(matches).find((x) => isGoal(x.ev));
  return g ? HAPPENED(scoringTeamApiId(g.match, g.ev)) : NOT;
}

export function resolveEarlyGoal(matches: MatchEvents[]): ArenaResult {
  const g = flatByTime(matches).find(
    (x) => isGoal(x.ev) && x.ev.time.elapsed + (x.ev.time.extra ?? 0) <= 5,
  );
  return g ? HAPPENED(scoringTeamApiId(g.match, g.ev)) : NOT;
}

export function resolveStoppageTimeGoal(matches: MatchEvents[]): ArenaResult {
  const g = flatByTime(matches).find((x) => isGoal(x.ev) && x.ev.time.elapsed >= 90);
  return g ? HAPPENED(scoringTeamApiId(g.match, g.ev)) : NOT;
}

export function resolveBigWin(matches: MatchEvents[]): ArenaResult {
  for (const m of matchesByKickoff(matches)) {
    const { home, away } = teamGoals(m);
    if (Math.abs(home - away) >= 3) {
      return HAPPENED(home > away ? m.homeTeamApiId : m.awayTeamApiId);
    }
  }
  return NOT;
}

export function resolveGoalFest(matches: MatchEvents[]): ArenaResult {
  for (const m of matchesByKickoff(matches)) {
    const { home, away } = teamGoals(m);
    if (home >= 4) return HAPPENED(m.homeTeamApiId);
    if (away >= 4) return HAPPENED(m.awayTeamApiId);
  }
  return NOT;
}

export function resolveMissedPenalty(matches: MatchEvents[]): ArenaResult {
  const f = flatByTime(matches).find((x) => x.ev.detail === "Missed Penalty");
  return f ? HAPPENED(f.ev.team.id) : NOT;
}

export function resolveFirstYellow(matches: MatchEvents[]): ArenaResult {
  const f = flatByTime(matches).find(
    (x) => x.ev.type === "Card" && x.ev.detail === "Yellow Card",
  );
  return f ? HAPPENED(f.ev.team.id) : NOT;
}

export function resolveWinToNil(matches: MatchEvents[]): ArenaResult {
  for (const m of matchesByKickoff(matches)) {
    const { home, away } = teamGoals(m);
    if (home > away && away === 0) return HAPPENED(m.homeTeamApiId);
    if (away > home && home === 0) return HAPPENED(m.awayTeamApiId);
  }
  return NOT;
}

export function resolveArenaWeek(matches: MatchEvents[]): ArenaResolutions {
  return {
    firstRedCard: resolveFirstRedCard(matches),
    hatTrick: resolveHatTrick(matches),
    comeback: resolveComeback(matches),
    latestGoal: resolveLatestGoal(matches),
    firstPenaltyGoal: resolveFirstPenaltyGoal(matches),
    firstOwnGoal: resolveFirstOwnGoal(matches),
  };
}

export interface ArenaEventType {
  kind: string;
  emoji: string;
  i18nKey: string;
  resolve(matches: MatchEvents[]): ArenaResult;
}

export const ARENA_EVENT_TYPES: ArenaEventType[] = [
  { kind: "firstRedCard", emoji: "🟥", i18nKey: "firstRedCard", resolve: resolveFirstRedCard },
  { kind: "hatTrick", emoji: "⚽⚽⚽", i18nKey: "hatTrick", resolve: resolveHatTrick },
  { kind: "comeback", emoji: "🔄", i18nKey: "comeback", resolve: resolveComeback },
  { kind: "latestGoal", emoji: "⏱️", i18nKey: "latestGoal", resolve: resolveLatestGoal },
  { kind: "firstPenaltyGoal", emoji: "🎯", i18nKey: "firstPenaltyGoal", resolve: resolveFirstPenaltyGoal },
  { kind: "firstOwnGoal", emoji: "🤦", i18nKey: "firstOwnGoal", resolve: resolveFirstOwnGoal },
  { kind: "firstGoal", emoji: "⚽", i18nKey: "firstGoal", resolve: resolveFirstGoal },
  { kind: "earlyGoal", emoji: "🚀", i18nKey: "earlyGoal", resolve: resolveEarlyGoal },
  { kind: "stoppageTimeGoal", emoji: "🕘", i18nKey: "stoppageTimeGoal", resolve: resolveStoppageTimeGoal },
  { kind: "bigWin", emoji: "💥", i18nKey: "bigWin", resolve: resolveBigWin },
  { kind: "goalFest", emoji: "🎆", i18nKey: "goalFest", resolve: resolveGoalFest },
  { kind: "missedPenalty", emoji: "🥅", i18nKey: "missedPenalty", resolve: resolveMissedPenalty },
  { kind: "firstYellow", emoji: "🟨", i18nKey: "firstYellow", resolve: resolveFirstYellow },
  { kind: "winToNil", emoji: "🛡️", i18nKey: "winToNil", resolve: resolveWinToNil },
];

export const ARENA_EVENT_TYPES_BY_KIND: Map<string, ArenaEventType> = new Map(
  ARENA_EVENT_TYPES.map((t) => [t.kind, t]),
);

// English-title -> resolver, for legacy events that predate `kind`.
const TITLE_FALLBACK: Record<string, (m: MatchEvents[]) => ArenaResult> = {
  [RESOLUTION_TITLES.firstRedCard]: resolveFirstRedCard,
  [RESOLUTION_TITLES.hatTrick]: resolveHatTrick,
  [RESOLUTION_TITLES.comeback]: resolveComeback,
  [RESOLUTION_TITLES.latestGoal]: resolveLatestGoal,
  [RESOLUTION_TITLES.firstPenaltyGoal]: resolveFirstPenaltyGoal,
  [RESOLUTION_TITLES.firstOwnGoal]: resolveFirstOwnGoal,
};

export function resolveEvent(
  event: { kind: string | null; title: string },
  matches: MatchEvents[],
): ArenaResult {
  if (event.kind) {
    const type = ARENA_EVENT_TYPES_BY_KIND.get(event.kind);
    if (type) return type.resolve(matches);
  }
  const fallback = TITLE_FALLBACK[event.title];
  if (fallback) return fallback(matches);
  throw new Error(`No resolver for event (kind=${event.kind ?? "null"}, title="${event.title}")`);
}

export const ARENA_POOL_STRIDE = 5; // coprime to 14

export function selectWeeklyEventKinds(weekNumber: number): string[] {
  const n = ARENA_EVENT_TYPES.length;
  const start = (((weekNumber - 1) * ARENA_POOL_STRIDE) % n + n) % n;
  const out: string[] = [];
  for (let i = 0; i < 6; i++) out.push(ARENA_EVENT_TYPES[(start + i) % n].kind);
  return out;
}
