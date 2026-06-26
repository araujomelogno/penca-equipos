# Arena Question Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Prediction Arena a pool of 14 auto-resolvable questions and rotate 6 per week deterministically, keeping the rollover cron + data-driven resolver fully automatic.

**Architecture:** A registry of arena event *types* (each with a stable `kind`, emoji, i18n key, and a pure resolver over API-Football match events) lives in `src/lib/arena-resolution.ts`. A deterministic `selectWeeklyEventKinds(weekNumber)` picks 6. The rollover (cron + script) creates those 6 with their `kind`; the resolver dispatches per event by `kind`, falling back to English-title matching for legacy events (`kind = null`).

**Tech Stack:** TypeScript, Next.js (App Router), Prisma (Postgres), next-intl, Vitest.

## Global Constraints

- TDD: write the failing test first, watch it fail, then implement.
- No hardcoded hex in `.tsx` (not relevant here; no UI work).
- New user-facing strings go in BOTH `messages/en.json` and `messages/es.json`.
- One bash command per call; never chain with `&&`/`||`/`;`.
- Run from repo root: `C:\repos\pencachi`. Branch: `feat/arena-question-variety`.
- Prisma client is generated to `src/generated/prisma`; schema uses `prisma db push` in deploy (additive changes only).
- Pool size = 14, rotation STRIDE = 5 (coprime to 14). Pool order is the order of `ARENA_EVENT_TYPES`; the first 6 entries are the classic events, in this exact order: `firstRedCard, hatTrick, comeback, latestGoal, firstPenaltyGoal, firstOwnGoal`.
- Resolver chronology is wall-clock: `kickoff_ms + (elapsed + extra) * 60000`. Goal credit: own goals count for the opponent (the beneficiary); `firstOwnGoal` is attributed to the conceding team (the API event's team).

---

### Task 1: Extract the 6 existing rules into exported per-type resolvers

**Files:**
- Modify: `src/lib/arena-resolution.ts`
- Test: `src/lib/arena-resolution.test.ts` (existing 10 tests must keep passing)

**Interfaces:**
- Consumes: existing `MatchEvents`, `ApiEvent`, `ArenaResult`, helpers `isGoal`, `isRed`, `scoringTeamApiId`, `comebackTeam`, `absMinuteMs`, `HAPPENED`, `NOT`.
- Produces:
  - `flatByTime(matches: MatchEvents[]): FlatEvent[]` — all events sorted ascending by wall-clock.
  - `resolveFirstRedCard(matches): ArenaResult`
  - `resolveHatTrick(matches): ArenaResult`
  - `resolveComeback(matches): ArenaResult`
  - `resolveLatestGoal(matches): ArenaResult`
  - `resolveFirstPenaltyGoal(matches): ArenaResult`
  - `resolveFirstOwnGoal(matches): ArenaResult`
  - `resolveArenaWeek` keeps its current signature/return, now implemented by calling these six (so existing tests are unchanged).

- [ ] **Step 1: Refactor — add `flatByTime` and the six functions, reimplement `resolveArenaWeek` via them**

In `src/lib/arena-resolution.ts`, replace the body of `resolveArenaWeek` (the part that builds `byTimeAsc` and computes each result inline) with extracted functions. Add near the other helpers:

```ts
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
```

Remove the now-unused inline locals from the old `resolveArenaWeek` (the `flat`/`byTimeAsc`/`firstRed`/etc. block) — they are replaced by the calls above. Keep `comebackTeam`, `scoringTeamApiId`, `isGoal`, `isRed`, `absMinuteMs`, `HAPPENED`, `NOT`, and all exported types.

- [ ] **Step 2: Run the existing suite to verify no behavior change**

Run: `npx vitest run src/lib/arena-resolution.test.ts`
Expected: PASS (10 tests) — the extraction is behavior-preserving.

- [ ] **Step 3: Commit**

```bash
git add src/lib/arena-resolution.ts
git commit -m "refactor: extract per-type arena resolvers (no behavior change)"
```

---

### Task 2: Add the 8 new per-type resolver functions

**Files:**
- Modify: `src/lib/arena-resolution.ts`
- Test: `src/lib/arena-resolution.test.ts`

**Interfaces:**
- Consumes: `flatByTime`, `matchesByKickoff`, `isGoal`, `scoringTeamApiId`, `HAPPENED`, `NOT`, `MatchEvents`, `ArenaResult`.
- Produces:
  - `resolveFirstGoal(matches): ArenaResult`
  - `resolveEarlyGoal(matches): ArenaResult` — first goal at minute ≤ 5
  - `resolveStoppageTimeGoal(matches): ArenaResult` — first goal at elapsed ≥ 90
  - `resolveBigWin(matches): ArenaResult` — first match (by kickoff) with final margin ≥ 3 → winner
  - `resolveGoalFest(matches): ArenaResult` — first match with a team scoring ≥ 4 → that team
  - `resolveMissedPenalty(matches): ArenaResult` — first `Missed Penalty` event → team that missed
  - `resolveFirstYellow(matches): ArenaResult` — first `Yellow Card` → team
  - `resolveWinToNil(matches): ArenaResult` — first match where a team wins with opponent on 0 → winner
  - `teamGoals(m): { home: number; away: number }` — final tally from goals (own goals credited to opponent)

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/arena-resolution.test.ts` (reuse the existing `ev` and `match` factories at the top of that file):

```ts
import {
  resolveFirstGoal,
  resolveEarlyGoal,
  resolveStoppageTimeGoal,
  resolveBigWin,
  resolveGoalFest,
  resolveMissedPenalty,
  resolveFirstYellow,
  resolveWinToNil,
} from "./arena-resolution";

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
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run src/lib/arena-resolution.test.ts`
Expected: FAIL with "resolveFirstGoal is not a function" (and the other new imports).

- [ ] **Step 3: Implement the 8 functions + `teamGoals` helper**

Add to `src/lib/arena-resolution.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/arena-resolution.test.ts`
Expected: PASS (all, including the 8 new cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/arena-resolution.ts src/lib/arena-resolution.test.ts
git commit -m "feat: add 8 new auto-resolvable arena event resolvers"
```

---

### Task 3: Add bilingual i18n text for the 8 new event types

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Interfaces:**
- Produces: `arena.defaults.{firstGoal,earlyGoal,stoppageTimeGoal,bigWin,goalFest,missedPenalty,firstYellow,winToNil}` each with `title` + `description`, in both files.

- [ ] **Step 1: Add the keys to `messages/en.json`**

Inside the `arena.defaults` object (after `firstOwnGoal`), add:

```json
"firstGoal": { "title": "First goal", "description": "Which team scores the first goal of the week?" },
"earlyGoal": { "title": "Early goal", "description": "Will a goal be scored in the first 5 minutes? Which team?" },
"stoppageTimeGoal": { "title": "Stoppage-time goal", "description": "Will a team score in stoppage time (90'+)? Which team?" },
"bigWin": { "title": "Big win", "description": "Will a team win by 3+ goals? Which team?" },
"goalFest": { "title": "Goal fest", "description": "Will a team score 4 or more in a single match?" },
"missedPenalty": { "title": "Missed penalty", "description": "Will a penalty be missed or saved? Which team misses it?" },
"firstYellow": { "title": "First yellow card", "description": "Which team gets the first yellow card of the week?" },
"winToNil": { "title": "Win to nil", "description": "Will a team win without conceding? Which team?" }
```

(Ensure correct comma placement — `firstOwnGoal` now needs a trailing comma, and the last new entry `winToNil` must NOT have one if it is the final key in `defaults`.)

- [ ] **Step 2: Add the translated keys to `messages/es.json`**

Inside `arena.defaults` (after `firstOwnGoal`), add:

```json
"firstGoal": { "title": "Primer gol", "description": "¿Qué equipo marca el primer gol de la semana?" },
"earlyGoal": { "title": "Gol tempranero", "description": "¿Habrá un gol en los primeros 5 minutos? ¿Qué equipo?" },
"stoppageTimeGoal": { "title": "Gol en el descuento", "description": "¿Algún equipo marcará en tiempo de descuento (90'+)? ¿Cuál?" },
"bigWin": { "title": "Goleada", "description": "¿Algún equipo ganará por 3 o más goles? ¿Cuál?" },
"goalFest": { "title": "Festival de goles", "description": "¿Algún equipo marcará 4 o más en un mismo partido?" },
"missedPenalty": { "title": "Penal errado", "description": "¿Se errará o atajará un penal? ¿Qué equipo lo falla?" },
"firstYellow": { "title": "Primera amarilla", "description": "¿Qué equipo recibe la primera amarilla de la semana?" },
"winToNil": { "title": "Ganar sin recibir goles", "description": "¿Algún equipo ganará sin recibir goles? ¿Cuál?" }
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "require('./messages/en.json'); require('./messages/es.json'); console.log('ok')"`
Expected: prints `ok` (no JSON parse error).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "i18n: add text for 8 new arena event types (en + es)"
```

---

### Task 4: Build the event-type registry + weekly selection

**Files:**
- Modify: `src/lib/arena-resolution.ts`
- Test: `src/lib/arena-resolution.test.ts`

**Interfaces:**
- Consumes: all 14 `resolve*` functions; `MatchEvents`, `ArenaResult`.
- Produces:
  - `interface ArenaEventType { kind: string; emoji: string; i18nKey: string; resolve(matches: MatchEvents[]): ArenaResult }`
  - `ARENA_EVENT_TYPES: ArenaEventType[]` — exactly 14, classic 6 first, in the order given in Global Constraints.
  - `ARENA_EVENT_TYPES_BY_KIND: Map<string, ArenaEventType>`
  - `ARENA_POOL_STRIDE = 5`
  - `selectWeeklyEventKinds(weekNumber: number): string[]` — 6 kinds, deterministic.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/arena-resolution.test.ts`:

```ts
import {
  ARENA_EVENT_TYPES,
  ARENA_EVENT_TYPES_BY_KIND,
  selectWeeklyEventKinds,
} from "./arena-resolution";

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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/arena-resolution.test.ts`
Expected: FAIL with "ARENA_EVENT_TYPES is not defined".

- [ ] **Step 3: Implement the registry + selection**

Add to `src/lib/arena-resolution.ts` (near the bottom):

```ts
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

export const ARENA_POOL_STRIDE = 5; // coprime to 14

export function selectWeeklyEventKinds(weekNumber: number): string[] {
  const n = ARENA_EVENT_TYPES.length;
  const start = (((weekNumber - 1) * ARENA_POOL_STRIDE) % n + n) % n;
  const out: string[] = [];
  for (let i = 0; i < 6; i++) out.push(ARENA_EVENT_TYPES[(start + i) % n].kind);
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/arena-resolution.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/arena-resolution.ts src/lib/arena-resolution.test.ts
git commit -m "feat: arena event-type registry + deterministic weekly rotation"
```

---

### Task 5: Add a registry-backed i18n coverage test + make `DEFAULT_WEEKLY_EVENTS` derive from the pool

**Files:**
- Modify: `src/lib/prediction-arena-defaults.ts`
- Test: `src/lib/prediction-arena-defaults.test.ts`

**Interfaces:**
- Consumes: `ARENA_EVENT_TYPES` from `@/lib/arena-resolution`.
- Produces: `DEFAULT_WEEKLY_EVENTS` unchanged in shape (`{ emoji, key }[]`, length 6) but derived from the first 6 pool entries. The admin component keeps importing it as-is.

- [ ] **Step 1: Write the failing test (every pool kind has en+es text)**

Replace the body of `src/lib/prediction-arena-defaults.test.ts` with a version that also covers the full pool:

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_WEEKLY_EVENTS } from "./prediction-arena-defaults";
import { ARENA_EVENT_TYPES } from "./arena-resolution";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

type DefaultsMessages = Record<string, { title: string; description: string }>;
function defaultsSection(messages: unknown): DefaultsMessages {
  return (messages as { arena: { defaults: DefaultsMessages } }).arena.defaults;
}

describe("DEFAULT_WEEKLY_EVENTS", () => {
  it("has 6 templates derived from the pool, with emoji and i18n key", () => {
    expect(DEFAULT_WEEKLY_EVENTS).toHaveLength(6);
    for (const e of DEFAULT_WEEKLY_EVENTS) {
      expect(e.emoji).toBeTruthy();
      expect(e.key).toBeTruthy();
    }
  });
});

describe("ARENA_EVENT_TYPES i18n", () => {
  it("every pool kind has title + description in BOTH en and es", () => {
    const enD = defaultsSection(en);
    const esD = defaultsSection(es);
    for (const t of ARENA_EVENT_TYPES) {
      expect(enD[t.i18nKey]?.title, `en title for ${t.i18nKey}`).toBeTruthy();
      expect(enD[t.i18nKey]?.description, `en desc for ${t.i18nKey}`).toBeTruthy();
      expect(esD[t.i18nKey]?.title, `es title for ${t.i18nKey}`).toBeTruthy();
      expect(esD[t.i18nKey]?.description, `es desc for ${t.i18nKey}`).toBeTruthy();
    }
  });

  it("en and es descriptions differ for every pool kind (real translations)", () => {
    const enD = defaultsSection(en);
    const esD = defaultsSection(es);
    const identical = ARENA_EVENT_TYPES.filter(
      (t) => enD[t.i18nKey]?.description === esD[t.i18nKey]?.description,
    );
    expect(identical.map((t) => t.i18nKey)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/prediction-arena-defaults.test.ts`
Expected: FAIL — current `DEFAULT_WEEKLY_EVENTS` is a hardcoded list and the import of `ARENA_EVENT_TYPES` drives new assertions; if text from Task 3 is present it should pass the i18n parts, but the derive-from-pool change (Step 3) is what we assert next. (If it already passes, proceed — the refactor in Step 3 keeps it green.)

- [ ] **Step 3: Derive `DEFAULT_WEEKLY_EVENTS` from the pool**

Replace the `DEFAULT_WEEKLY_EVENTS` definition in `src/lib/prediction-arena-defaults.ts` with:

```ts
import { ARENA_EVENT_TYPES } from "@/lib/arena-resolution";

export interface DefaultEventTemplate {
  emoji: string;
  /** i18n key under `arena.defaults` (has `.title` and `.description`) */
  key: string;
}

// The classic 6 (first entries of the pool) — used by the admin "load defaults".
// The automated rollover uses the full pool + rotation instead.
export const DEFAULT_WEEKLY_EVENTS: DefaultEventTemplate[] = ARENA_EVENT_TYPES.slice(0, 6).map(
  (t) => ({ emoji: t.emoji, key: t.i18nKey }),
);
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/prediction-arena-defaults.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prediction-arena-defaults.ts src/lib/prediction-arena-defaults.test.ts
git commit -m "refactor: derive DEFAULT_WEEKLY_EVENTS from the arena pool + cover pool i18n"
```

---

### Task 6: Add the `kind` column to `WeeklyHitsEvent`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `WeeklyHitsEvent.kind: String?` available on the generated Prisma client.

- [ ] **Step 1: Add the field**

In `prisma/schema.prisma`, inside `model WeeklyHitsEvent`, add below `description`:

```prisma
  kind         String?
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" success.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add kind column to WeeklyHitsEvent (additive)"
```

---

### Task 7: Rotate events in the rollover (lib + cron route + manual script)

**Files:**
- Modify: `src/lib/prediction-arena-rollover.ts`
- Test: `src/lib/prediction-arena-rollover.test.ts`
- Modify: `src/app/api/cron/arena/rollover/route.ts`
- Modify: `scripts/rollover-arena-week.ts`

**Interfaces:**
- Consumes: `selectWeeklyEventKinds`, `ARENA_EVENT_TYPES_BY_KIND` from `@/lib/arena-resolution`.
- Produces:
  - `ArenaEventInput` gains `kind: string`.
  - `buildDefaultArenaEvents(messages: unknown, weekNumber: number): ArenaEventInput[]` — the rotated 6 for `weekNumber`, each with `kind`.
  - `rolloverArenaWeek(prisma, messages: unknown, now?: Date): Promise<RolloverResult>` — builds events internally from the resolved `weekNumber`.

- [ ] **Step 1: Update the rollover tests (TDD)**

In `src/lib/prediction-arena-rollover.test.ts`:
- Change the `buildDefaultArenaEvents` describe to pass a `weekNumber` and assert `kind`:

```ts
import { selectWeeklyEventKinds } from "./arena-resolution";

describe("buildDefaultArenaEvents", () => {
  it("builds the rotated 6 events (with kind) for the given week", () => {
    const events = buildDefaultArenaEvents(en, 5);
    expect(events).toHaveLength(6);
    expect(events.map((e) => e.kind)).toEqual(selectWeeklyEventKinds(5));
    expect(events[0].orderIndex).toBe(1);
    for (const e of events) {
      expect(e.title).toBeTruthy();
      expect(e.description).toBeTruthy();
      expect(e.emoji).toBeTruthy();
      expect(e.kind).toBeTruthy();
    }
  });
});
```

- Update the `fakePrisma` `create` to capture `kind` and the `rolloverArenaWeek` tests to call the new signature. Replace the `create` impl and the three create-related tests:

```ts
// in fakePrisma.weeklyHitsWeek.create:
async create({ data }) {
  const row = {
    id: `w${weeks.length + 1}`,
    weekNumber: data.weekNumber,
    status: data.status,
    weekStart: data.weekStart,
    weekEnd: data.weekEnd,
    deadline: data.deadline,
    events: data.events.create,
  };
  weeks.push(row);
  return { id: row.id, weekNumber: row.weekNumber };
},
```

```ts
// remove the top-level `const events = buildDefaultArenaEvents(en);`
// and call rolloverArenaWeek(db, en, MON) everywhere instead of (db, events, MON).

it("creates a new OPEN week when the slot is free", async () => {
  const db = fakePrisma([]);
  const res = await rolloverArenaWeek(db, en, MON);
  expect(res.action).toBe("created");
  expect(db.weeks).toHaveLength(1);
  expect(db.weeks[0].status).toBe("OPEN");
  expect(db.weeks[0].weekNumber).toBe(1);
  expect(db.weeks[0].events.map((e: { kind: string }) => e.kind)).toEqual(
    selectWeeklyEventKinds(1),
  );
});
```

(Apply the same `(db, en, MON)` change to the "idempotent skip", "shift then create", and "collision" tests.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/prediction-arena-rollover.test.ts`
Expected: FAIL (signature/`kind` mismatch).

- [ ] **Step 3: Update `prediction-arena-rollover.ts`**

Replace `buildDefaultArenaEvents` and `rolloverArenaWeek`, and extend `ArenaEventInput` + the `RolloverPrisma.create` event shape:

```ts
import { getWeekBounds } from "@/lib/queries/prediction-arena";
import { selectWeeklyEventKinds, ARENA_EVENT_TYPES_BY_KIND } from "@/lib/arena-resolution";

// ...keep arenaWeekSlot + DAY...

export interface ArenaEventInput {
  orderIndex: number;
  emoji: string;
  title: string;
  description: string;
  kind: string;
}

interface DefaultsMessages {
  arena: { defaults: Record<string, { title: string; description: string }> };
}

export function buildDefaultArenaEvents(messages: unknown, weekNumber: number): ArenaEventInput[] {
  const defaults = (messages as DefaultsMessages).arena.defaults;
  return selectWeeklyEventKinds(weekNumber).map((kind, i) => {
    const type = ARENA_EVENT_TYPES_BY_KIND.get(kind)!;
    const text = defaults[type.i18nKey];
    return {
      orderIndex: i + 1,
      emoji: type.emoji,
      title: text.title,
      description: text.description,
      kind,
    };
  });
}
```

Update `RolloverPrisma.weeklyHitsWeek.create` data type so `events.create` is `ArenaEventInput[]` (already is — `ArenaEventInput` now has `kind`). Then change `rolloverArenaWeek`:

```ts
export async function rolloverArenaWeek(
  prisma: RolloverPrisma,
  messages: unknown,
  now: Date = new Date(),
): Promise<RolloverResult> {
  const { weekStart, weekEnd, deadline } = arenaWeekSlot(now);

  const occupant = await prisma.weeklyHitsWeek.findUnique({ where: { weekStart } });
  if (occupant) {
    if (occupant.status !== "RESOLVED") {
      return {
        action: "skipped",
        reason: `slot already occupied by ${occupant.status} week #${occupant.weekNumber}`,
        weekNumber: occupant.weekNumber,
        weekStart,
      };
    }
    const shiftedStart = new Date(occupant.weekStart.getTime() - 7 * DAY);
    const collision = await prisma.weeklyHitsWeek.findUnique({ where: { weekStart: shiftedStart } });
    if (collision) {
      throw new Error(
        `Cannot shift resolved week #${occupant.weekNumber} back 7d — a week already exists at ${shiftedStart.toISOString()}.`,
      );
    }
    await prisma.weeklyHitsWeek.update({
      where: { id: occupant.id },
      data: {
        weekStart: shiftedStart,
        weekEnd: new Date(occupant.weekEnd.getTime() - 7 * DAY),
        deadline: new Date(occupant.deadline.getTime() - 7 * DAY),
      },
    });
  }

  const weekCount = await prisma.weeklyHitsWeek.count();
  const weekNumber = weekCount + 1;
  const events = buildDefaultArenaEvents(messages, weekNumber);
  const created = await prisma.weeklyHitsWeek.create({
    data: {
      weekStart,
      weekEnd,
      weekNumber,
      status: "OPEN",
      deadline,
      events: { create: events },
    },
  });

  return { action: "created", weekId: created.id, weekNumber: created.weekNumber, weekStart };
}
```

Remove the now-unused `DEFAULT_WEEKLY_EVENTS` import if present.

- [ ] **Step 4: Update the cron route**

In `src/app/api/cron/arena/rollover/route.ts`, replace the build+call with a single call (the route already imports `en`/`es` and `defaultLocale`):

```ts
const messages = defaultLocale === "es" ? es : en;
const result = await rolloverArenaWeek(prisma, messages);
```

Remove the now-unused `buildDefaultArenaEvents` import from the route.

- [ ] **Step 5: Update the manual script**

In `scripts/rollover-arena-week.ts`, the dry-run preview must compute the would-be `weekNumber`. Replace the body that builds `events` + the write call:

```ts
// after creating the prisma client:
const { weekStart, deadline } = arenaWeekSlot();
const weekCount = await prisma.weeklyHitsWeek.count();
const previewWeekNumber = weekCount + 1;
const events = buildDefaultArenaEvents(messages, previewWeekNumber);
console.log(`[${mode}] Target week starts ${weekStart.toISOString()} (deadline ${deadline.toISOString()}).`);
console.log(`Rotated events for week #${previewWeekNumber} (locale ${locale}):`);
for (const e of events) console.log(`   ${e.emoji} ${e.title} [${e.kind}]`);

// dry-run branch unchanged (occupant peek) ...

// write branch:
const result = await rolloverArenaWeek(prisma, messages);
```

(`messages` is the parsed JSON object from fs, which is what `buildDefaultArenaEvents`/`rolloverArenaWeek` expect.)

- [ ] **Step 6: Run rollover tests + typecheck**

Run: `npx vitest run src/lib/prediction-arena-rollover.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/prediction-arena-rollover.ts src/lib/prediction-arena-rollover.test.ts src/app/api/cron/arena/rollover/route.ts scripts/rollover-arena-week.ts
git commit -m "feat: rollover creates the rotated weekly events with kind"
```

---

### Task 8: Resolver dispatch by `kind` with title fallback

**Files:**
- Modify: `src/lib/arena-resolution.ts`
- Test: `src/lib/arena-resolution.test.ts`
- Modify: `scripts/resolve-arena-week-from-api.ts`

**Interfaces:**
- Consumes: `ARENA_EVENT_TYPES_BY_KIND`, `RESOLUTION_TITLES`, all `resolve*` fns.
- Produces: `resolveEvent(event: { kind: string | null; title: string }, matches: MatchEvents[]): ArenaResult` — dispatches by `kind`, else by English title; throws if neither resolves.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/arena-resolution.test.ts`:

```ts
import { resolveEvent } from "./arena-resolution";

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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/arena-resolution.test.ts`
Expected: FAIL with "resolveEvent is not a function".

- [ ] **Step 3: Implement `resolveEvent`**

Add to `src/lib/arena-resolution.ts`. It reuses the existing `RESOLUTION_TITLES` (key→title) to build a title→resolver fallback for the classic 6:

```ts
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
```

Note: `RESOLUTION_TITLES` is the existing exported map. Keep it.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/arena-resolution.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Switch the resolver script to per-event dispatch**

In `scripts/resolve-arena-week-from-api.ts`:
- Add `kind` to the week's events select: change `events: { orderBy: { orderIndex: "asc" }, select: { id: true, title: true } }` to `select: { id: true, title: true, kind: true }`.
- Replace the import of `resolveArenaWeek`/`RESOLUTION_TITLES` usage. Remove the `resolveArenaWeek(matchEvents)` call and the `RESOLUTION_TITLES`-driven loop. Instead, iterate the week's events and call `resolveEvent` per event:

```ts
import { resolveEvent, type ApiEvent, type MatchEvents } from "../src/lib/arena-resolution";
// (drop resolveArenaWeek / RESOLUTION_TITLES / ArenaResolutions imports)

// ...build matchEvents as before...

console.log("\nComputed results:");
const eventUpdates: {
  id: string;
  title: string;
  result: "HAPPENED" | "NO_HAPPENED";
  resultTeamId: string | null;
}[] = [];
for (const event of week.events) {
  const reso = resolveEvent({ kind: event.kind, title: event.title }, matchEvents);
  let resultTeamId: string | null = null;
  let label: string = reso.result;
  if (reso.result === "HAPPENED") {
    const team = teamByApiId.get(reso.teamApiId);
    if (!team) throw new Error(`API team ${reso.teamApiId} (event "${event.title}") not mapped to a Team.`);
    resultTeamId = team.id;
    label = `HAPPENED / ${team.name} (${team.code})`;
  }
  console.log(`  ${event.title.padEnd(20)} -> ${label}`);
  eventUpdates.push({ id: event.id, title: event.title, result: reso.result, resultTeamId });
}
```

The rest (projecting points, the `--write` transactions) stays the same — it already iterates `eventUpdates`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/arena-resolution.ts src/lib/arena-resolution.test.ts scripts/resolve-arena-week-from-api.ts
git commit -m "feat: resolver dispatches arena events by kind, title fallback for legacy"
```

---

### Task 9: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full unit suite**

Run: `npx vitest run`
Expected: PASS (all files; previous 256 + the new arena-resolution/rollover/defaults cases).

- [ ] **Step 2: Lint changed files**

Run: `npx eslint src/lib/arena-resolution.ts src/lib/arena-resolution.test.ts src/lib/prediction-arena-rollover.ts src/lib/prediction-arena-rollover.test.ts src/lib/prediction-arena-defaults.ts src/lib/prediction-arena-defaults.test.ts "src/app/api/cron/arena/rollover/route.ts" scripts/rollover-arena-week.ts scripts/resolve-arena-week-from-api.ts`
Expected: no output.

- [ ] **Step 3: Build**

Run: `npx next build`
Expected: succeeds (route compiles).

- [ ] **Step 4: Dry-run the rollover against a local/seeded DB (optional, recommended)**

If a seeded local DB is available, point `DATABASE_URL` at it and run:
Run: `npx tsx scripts/rollover-arena-week.ts`
Expected: prints "Rotated events for week #N" listing 6 events with `[kind]`, no write.

---

## Post-implementation (deploy — manual, outside this plan)

- Merge + deploy so the schema (`kind`) and the new route/resolver ship. `prisma db push` in the entrypoint adds the column on startup.
- The next cron-created week (week 5+) will use the rotation automatically; existing weeks 1–4 keep resolving via the title fallback.
- The `resolve-arena-week-from-api.ts` script now resolves any week by `kind` (new) or title (legacy); run it as before with `WEEK_ID=...`.
