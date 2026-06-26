import { describe, it, expect } from "vitest";
import {
  resolveArenaWeek,
  resolveFirstGoal,
  resolveEarlyGoal,
  resolveStoppageTimeGoal,
  resolveBigWin,
  resolveGoalFest,
  resolveMissedPenalty,
  resolveFirstYellow,
  resolveWinToNil,
  resolveEvent,
  ARENA_EVENT_TYPES,
  ARENA_EVENT_TYPES_BY_KIND,
  selectWeeklyEventKinds,
  type MatchEvents,
} from "./arena-resolution";

// Minimal API-Football event factory.
function ev(
  teamId: number,
  type: string,
  detail: string,
  elapsed: number,
  extra: number | null = null,
  player = "P",
) {
  return {
    time: { elapsed, extra },
    team: { id: teamId },
    player: { id: 1, name: player },
    type,
    detail,
  };
}

// Two teams: 10 (home) vs 20 (away). Helper to build a match.
function match(
  apiFootballId: number,
  kickoffTime: string,
  events: ReturnType<typeof ev>[],
  homeTeamApiId = 10,
  awayTeamApiId = 20,
): MatchEvents {
  return { apiFootballId, kickoffTime, homeTeamApiId, awayTeamApiId, events };
}

describe("resolveArenaWeek", () => {
  it("returns NO_HAPPENED for everything when there are no events", () => {
    const r = resolveArenaWeek([match(1, "2026-06-15T12:00:00Z", [])]);
    expect(r.firstRedCard).toEqual({ result: "NO_HAPPENED", teamApiId: null });
    expect(r.hatTrick).toEqual({ result: "NO_HAPPENED", teamApiId: null });
    expect(r.comeback).toEqual({ result: "NO_HAPPENED", teamApiId: null });
    expect(r.firstPenaltyGoal).toEqual({ result: "NO_HAPPENED", teamApiId: null });
    expect(r.firstOwnGoal).toEqual({ result: "NO_HAPPENED", teamApiId: null });
    // No goals at all -> latest goal also NO_HAPPENED.
    expect(r.latestGoal).toEqual({ result: "NO_HAPPENED", teamApiId: null });
  });

  it("first red card picks the chronologically-first sending-off across the week (wall clock)", () => {
    // Match B kicks off earlier; its 50' red is earlier in wall-clock than
    // match A's 30' red, despite the larger in-match minute.
    const a = match(1, "2026-06-15T15:00:00Z", [ev(10, "Card", "Red Card", 30)]);
    const b = match(2, "2026-06-15T12:00:00Z", [ev(20, "Card", "Red Card", 50)]);
    const r = resolveArenaWeek([a, b]);
    expect(r.firstRedCard).toEqual({ result: "HAPPENED", teamApiId: 20 });
  });

  it("counts a second yellow as a red card", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Card", "Second Yellow card", 70),
    ]);
    const r = resolveArenaWeek([a]);
    expect(r.firstRedCard).toEqual({ result: "HAPPENED", teamApiId: 10 });
  });

  it("detects a hat-trick (3+ goals by one player, penalties count, own goals don't)", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10, null, "Star"),
      ev(10, "Goal", "Penalty", 40, null, "Star"),
      ev(10, "Goal", "Normal Goal", 80, null, "Star"),
    ]);
    const r = resolveArenaWeek([a]);
    expect(r.hatTrick).toEqual({ result: "HAPPENED", teamApiId: 10 });
  });

  it("does not count two goals as a hat-trick", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10, null, "Star"),
      ev(10, "Goal", "Normal Goal", 80, null, "Star"),
    ]);
    expect(resolveArenaWeek([a]).hatTrick).toEqual({
      result: "NO_HAPPENED",
      teamApiId: null,
    });
  });

  it("detects a comeback: team trails then wins (own goal counts for the opponent)", () => {
    // Away (20) scores first via an own goal by home (10), home then scores
    // twice to win 2-1 -> home is the comeback team.
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Own Goal", 10), // counts for away (20): 0-1
      ev(10, "Goal", "Normal Goal", 40), // 1-1
      ev(10, "Goal", "Normal Goal", 70), // 2-1 home wins from behind
    ]);
    expect(resolveArenaWeek([a]).comeback).toEqual({
      result: "HAPPENED",
      teamApiId: 10,
    });
  });

  it("no comeback when the leader holds on", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10),
      ev(10, "Goal", "Normal Goal", 40),
      ev(20, "Goal", "Normal Goal", 70), // 2-1, no one came from behind
    ]);
    expect(resolveArenaWeek([a]).comeback).toEqual({
      result: "NO_HAPPENED",
      teamApiId: null,
    });
  });

  it("latest goal is the last goal by wall-clock; own goal credited to the beneficiary", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [ev(10, "Goal", "Normal Goal", 90, 4)]);
    // Later kickoff, own goal at 88' by team 20 -> credited to team 10, and it
    // is later in wall clock than match a's 90+4'.
    const b = match(2, "2026-06-15T16:00:00Z", [ev(20, "Goal", "Own Goal", 88)]);
    expect(resolveArenaWeek([a, b]).latestGoal).toEqual({
      result: "HAPPENED",
      teamApiId: 10,
    });
  });

  it("first penalty goal ignores missed penalties", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Missed Penalty", 20),
      ev(20, "Goal", "Penalty", 35),
    ]);
    expect(resolveArenaWeek([a]).firstPenaltyGoal).toEqual({
      result: "HAPPENED",
      teamApiId: 20,
    });
  });

  it("first own goal is attributed to the conceding team", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [ev(10, "Goal", "Own Goal", 25)]);
    expect(resolveArenaWeek([a]).firstOwnGoal).toEqual({
      result: "HAPPENED",
      teamApiId: 10,
    });
  });
});

describe("new per-type resolvers", () => {
  it("firstGoal: earliest goal by wall clock, own goal credited to beneficiary", () => {
    const a = match(1, "2026-06-15T15:00:00Z", [ev(10, "Goal", "Normal Goal", 20)]);
    const b = match(2, "2026-06-15T12:00:00Z", [ev(20, "Goal", "Own Goal", 80)]); // credited to 10, earlier wall-clock
    expect(resolveFirstGoal([a, b])).toEqual({ result: "HAPPENED", teamApiId: 10 });
  });

  it("earlyGoal: a goal at minute <= 5, else NO_HAPPENED", () => {
    expect(resolveEarlyGoal([match(1, "2026-06-15T12:00:00Z", [ev(10, "Goal", "Normal Goal", 4)])]))
      .toEqual({ result: "HAPPENED", teamApiId: 10 });
    expect(resolveEarlyGoal([match(1, "2026-06-15T12:00:00Z", [ev(10, "Goal", "Normal Goal", 6)])]))
      .toEqual({ result: "NO_HAPPENED", teamApiId: null });
  });

  it("stoppageTimeGoal: a goal at elapsed >= 90 (incl. extra)", () => {
    expect(resolveStoppageTimeGoal([match(1, "2026-06-15T12:00:00Z", [ev(20, "Goal", "Normal Goal", 90, 3)])]))
      .toEqual({ result: "HAPPENED", teamApiId: 20 });
    expect(resolveStoppageTimeGoal([match(1, "2026-06-15T12:00:00Z", [ev(20, "Goal", "Normal Goal", 80)])]))
      .toEqual({ result: "NO_HAPPENED", teamApiId: null });
  });

  it("bigWin: first match with final margin >= 3 returns the winner", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10),
      ev(10, "Goal", "Normal Goal", 20),
      ev(10, "Goal", "Normal Goal", 30),
    ]); // 3-0
    expect(resolveBigWin([a])).toEqual({ result: "HAPPENED", teamApiId: 10 });
    const close = match(2, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10),
      ev(20, "Goal", "Normal Goal", 20),
    ]); // 1-1
    expect(resolveBigWin([close])).toEqual({ result: "NO_HAPPENED", teamApiId: null });
  });

  it("goalFest: first match where a team scores 4+ returns that team", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10),
      ev(10, "Goal", "Normal Goal", 20),
      ev(10, "Goal", "Normal Goal", 30),
      ev(10, "Goal", "Normal Goal", 40),
    ]); // 4-0
    expect(resolveGoalFest([a])).toEqual({ result: "HAPPENED", teamApiId: 10 });
    const notFest = match(2, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10),
      ev(10, "Goal", "Normal Goal", 20),
      ev(10, "Goal", "Normal Goal", 30),
    ]); // 3-0, not enough
    expect(resolveGoalFest([notFest])).toEqual({ result: "NO_HAPPENED", teamApiId: null });
  });

  it("missedPenalty: first Missed Penalty event returns the team that missed", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [ev(20, "Goal", "Missed Penalty", 35)]);
    expect(resolveMissedPenalty([a])).toEqual({ result: "HAPPENED", teamApiId: 20 });
    expect(resolveMissedPenalty([match(1, "2026-06-15T12:00:00Z", [])]))
      .toEqual({ result: "NO_HAPPENED", teamApiId: null });
  });

  it("firstYellow: first Yellow Card by wall clock returns the team", () => {
    const a = match(1, "2026-06-15T15:00:00Z", [ev(10, "Card", "Yellow Card", 5)]);
    const b = match(2, "2026-06-15T12:00:00Z", [ev(20, "Card", "Yellow Card", 60)]); // earlier wall-clock
    expect(resolveFirstYellow([a, b])).toEqual({ result: "HAPPENED", teamApiId: 20 });
  });

  it("winToNil: first match where a team wins with the opponent on zero", () => {
    const a = match(1, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10),
      ev(10, "Goal", "Normal Goal", 20),
    ]); // 2-0
    expect(resolveWinToNil([a])).toEqual({ result: "HAPPENED", teamApiId: 10 });
    const drawn = match(2, "2026-06-15T12:00:00Z", [
      ev(10, "Goal", "Normal Goal", 10),
      ev(20, "Goal", "Normal Goal", 20),
    ]); // 1-1
    expect(resolveWinToNil([drawn])).toEqual({ result: "NO_HAPPENED", teamApiId: null });
  });
});

describe("arena event type registry", () => {
  it("has 14 types with unique kinds and i18n keys, classic 6 first", () => {
    expect(ARENA_EVENT_TYPES).toHaveLength(14);
    const kinds = ARENA_EVENT_TYPES.map((t) => t.kind);
    expect(new Set(kinds).size).toBe(14);
    expect(kinds.slice(0, 6)).toEqual([
      "firstRedCard", "hatTrick", "comeback", "latestGoal", "firstPenaltyGoal", "firstOwnGoal",
    ]);
    for (const t of ARENA_EVENT_TYPES) {
      expect(t.emoji).toBeTruthy();
      expect(t.i18nKey).toBeTruthy();
      expect(typeof t.resolve).toBe("function");
    }
  });

  it("index map matches the array", () => {
    expect(ARENA_EVENT_TYPES_BY_KIND.size).toBe(14);
    expect(ARENA_EVENT_TYPES_BY_KIND.get("comeback")?.kind).toBe("comeback");
  });
});

describe("selectWeeklyEventKinds", () => {
  it("returns exactly 6 distinct kinds, all in the pool", () => {
    const all = new Set(ARENA_EVENT_TYPES.map((t) => t.kind));
    for (let w = 1; w <= 30; w++) {
      const sel = selectWeeklyEventKinds(w);
      expect(sel).toHaveLength(6);
      expect(new Set(sel).size).toBe(6);
      for (const k of sel) expect(all.has(k)).toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(selectWeeklyEventKinds(7)).toEqual(selectWeeklyEventKinds(7));
  });

  it("varies week to week (adjacent weeks are not identical)", () => {
    expect(selectWeeklyEventKinds(1)).not.toEqual(selectWeeklyEventKinds(2));
  });

  it("covers the whole pool across a cycle of 14 weeks", () => {
    const seen = new Set<string>();
    for (let w = 1; w <= 14; w++) selectWeeklyEventKinds(w).forEach((k) => seen.add(k));
    expect(seen.size).toBe(14);
  });
});

describe("resolveEvent dispatch", () => {
  const m = [
    {
      apiFootballId: 1,
      kickoffTime: "2026-06-15T12:00:00Z",
      homeTeamApiId: 10,
      awayTeamApiId: 20,
      events: [ev(10, "Card", "Red Card", 30), ev(20, "Goal", "Own Goal", 40)],
    },
  ];

  it("dispatches by kind when present", () => {
    expect(resolveEvent({ kind: "firstRedCard", title: "ignored" }, m))
      .toEqual({ result: "HAPPENED", teamApiId: 10 });
    expect(resolveEvent({ kind: "firstOwnGoal", title: "ignored" }, m))
      .toEqual({ result: "HAPPENED", teamApiId: 20 });
  });

  it("falls back to English title for legacy events (kind null)", () => {
    expect(resolveEvent({ kind: null, title: "First red card" }, m))
      .toEqual({ result: "HAPPENED", teamApiId: 10 });
  });

  it("throws when neither kind nor title resolves", () => {
    expect(() => resolveEvent({ kind: null, title: "Unknown thing" }, m)).toThrow();
  });
});
