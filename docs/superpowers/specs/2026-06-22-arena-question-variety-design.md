# Prediction Arena — Question Variety

**Date:** 2026-06-22
**Status:** Approved (design)

## Problem

Every Prediction Arena week shows the **same 6 questions**. They are hardcoded
in `DEFAULT_WEEKLY_EVENTS` (`src/lib/prediction-arena-defaults.ts`) and used by
both the admin "load defaults" and the new weekly rollover cron
(`/api/cron/arena/rollover`). Now that the rollover is automated, the arena is
identical every week — which is boring.

## Goals

- A larger **pool** of arena questions; each week shows a **rotating** subset of 6.
- Keep the arena **100% automatic**: every question in the pool must be
  resolvable deterministically from API-Football `/fixtures/events` + scores
  (no manual resolution). The rollover cron and the data-driven resolver keep
  working with no human step.
- **Deterministic** selection (by week number) so the cron stays idempotent and
  everything stays unit-testable.
- **Back-compatible**: existing weeks (1–4 in prod, which have no `kind`) keep
  resolving correctly.

## Non-goals

- Subjective / manually-resolved questions (e.g. "player of the week").
- Admin UI changes for authoring custom pools (admin can still hand-edit a
  week's 6 events as today; out of scope here).
- Changing scoring rules.

## Design

### 1. Event-type registry

Replace the fixed 6-key `ArenaResolutions` shape with a registry of
self-contained **event types**. Each entry owns its presentation and its
resolution rule:

```ts
interface ArenaEventType {
  kind: string;          // stable id, e.g. "firstRedCard" (never localized)
  emoji: string;
  i18nKey: string;       // under `arena.defaults.<key>` -> { title, description }
  resolve(matches: MatchEvents[]): ArenaResult;  // pure, from arena-resolution
}

export const ARENA_EVENT_TYPES: ArenaEventType[] = [ /* the pool, in order */ ];
export const ARENA_EVENT_TYPES_BY_KIND: Map<string, ArenaEventType>;
```

The 6 existing resolution rules in `src/lib/arena-resolution.ts` are refactored
into per-type pure functions (one per `kind`) and reused here. Their 10 existing
unit tests stay (adapted to call the per-type functions).

### 2. Data model — `kind` on the event

Add an additive, nullable column to `WeeklyHitsEvent`:

```prisma
model WeeklyHitsEvent {
  // ...existing fields...
  kind String?   // stable arena event-type id; null for legacy events
}
```

Safe under the deploy's `prisma db push` (additive). New events created by the
rollover store their `kind`. Legacy events (weeks 1–4) have `kind = null`.

### 3. Resolver dispatch

The data-driven resolver (`scripts/resolve-arena-week-from-api.ts`) resolves a
week's events by looking up each event's type:

- If `event.kind` is set → use `ARENA_EVENT_TYPES_BY_KIND[kind].resolve(...)`.
- If `event.kind` is null (legacy) → fall back to the current **title** match
  (`RESOLUTION_TITLES`, English) so weeks 1–4 still resolve.

This removes the fragile localized-title dependency for all new weeks while
preserving back-compat.

### 4. The pool (14 types)

All auto-resolvable from `/fixtures/events` + scores. Each resolves to
`HAPPENED + team` or `NO_HAPPENED`. Chronology across concurrent matches uses
wall-clock (kickoff + minute), as today.

| kind | title (en) | rule |
|------|-----------|------|
| firstRedCard | First red card | first Red Card / Second Yellow of the week |
| hatTrick | Hat-trick | a player with 3+ non-own goals in a match |
| comeback | Comeback | a team that trailed and won (first such match) |
| latestGoal | Latest goal | goal with the max wall-clock time |
| firstPenaltyGoal | First penalty goal | first converted Penalty |
| firstOwnGoal | First own goal | first Own Goal (conceding team) |
| firstGoal | First goal | first goal of the week (any type) |
| earlyGoal | Early goal | a goal at minute ≤ 5 (first such) |
| stoppageTimeGoal | Stoppage-time goal | a goal at elapsed ≥ 90 (first such) |
| bigWin | Big win | a final winning margin ≥ 3 (first such match) |
| goalFest | Goal fest | a team scoring 4+ in one match |
| missedPenalty | Missed penalty | a `Missed Penalty` event (team that missed) |
| firstYellow | First yellow card | first Yellow Card of the week |
| winToNil | Win to nil | a team that wins without conceding (first such) |

Mix is intentional: some always happen so the game is *which team* (firstGoal,
firstYellow, latestGoal); others are genuinely uncertain yes/no + team.

For the team attribution: goal-credit follows the existing rule (own goals go to
the opponent for "scoring" questions; the conceding team for `firstOwnGoal`).
"first such match" questions order matches by kickoff, then by in-match minute.

### 5. Weekly rotation

Pure helper `selectWeeklyEventKinds(weekNumber, pool)`:

- Window of 6 over the ordered pool: `index = (start + i) mod poolSize` for
  `i in 0..5`, with `start = ((weekNumber - 1) * STRIDE) mod poolSize`.
- `STRIDE` is chosen coprime to `poolSize` (poolSize 14 → STRIDE 5) so adjacent
  weeks overlap minimally and the full pool is exercised before the window
  pattern repeats.
- Deterministic: same `weekNumber` → same 6 kinds → idempotent rollover.

`buildDefaultArenaEvents` (used by the rollover lib and the manual script)
changes to: pick the 6 kinds for the target `weekNumber`, then materialize each
one's `{ orderIndex, emoji, title, description, kind }` from the locale messages.
The rollover lib already computes `weekNumber` (count + 1); it passes that to the
selection.

Note on the admin path (scope decision): the admin "load defaults" keeps
materializing the 6 classic events (`DEFAULT_WEEKLY_EVENTS`) unchanged. Admin
manual creation is a rarely-used fallback now that the cron is the primary
creator, and per the non-goals we are not reworking the admin authoring UI.
Admin-created events have `kind = null` and resolve via the title fallback (the
6 classic titles are in `RESOLUTION_TITLES`). The pool + rotation apply to the
automated rollover path (cron + manual rollover script), which is what makes the
weekly arena non-repetitive.

### 6. i18n

8 new keys under `arena.defaults` in **both** `messages/en.json` and
`messages/es.json` (firstGoal, earlyGoal, stoppageTimeGoal, bigWin, goalFest,
missedPenalty, firstYellow, winToNil), each with `title` + `description`. The
existing `prediction-arena-defaults.test.ts` already asserts every pool key has
en+es text and that they differ — it will cover the new keys once the pool is
the source of truth.

### 7. Components touched

- `src/lib/arena-resolution.ts` — split rules into per-type pure functions;
  export the registry + `selectWeeklyEventKinds`. (Keep `MatchEvents`/`ApiEvent`
  types and wall-clock helpers.)
- `src/lib/prediction-arena-defaults.ts` — becomes the pool definition (or
  re-exports from the registry) so there is a single source of truth.
- `src/lib/prediction-arena-rollover.ts` — `buildDefaultArenaEvents(messages,
  weekNumber)` selects the rotated 6 and includes `kind`.
- `scripts/resolve-arena-week-from-api.ts` — dispatch by `kind` with title
  fallback.
- `prisma/schema.prisma` — add `kind`.
- `messages/{en,es}.json` — 8 new default entries.
- Admin/view components — only if they assume exactly the static 6 (verify; they
  render whatever events the week has, so likely no change).

## Testing

- Per-type resolution unit tests (the 6 existing + 8 new) with synthetic
  `MatchEvents`, covering happened/not-happened and team attribution + edge cases
  (own-goal credit, wall-clock ordering, stoppage extra time).
- `selectWeeklyEventKinds` tests: exactly 6, no duplicates within a week, full
  pool coverage across a cycle, determinism, and minimal adjacent-week overlap.
- `prediction-arena-rollover` tests extended: created events carry `kind` and
  the rotated set matches `selectWeeklyEventKinds`.
- Resolver dispatch test: `kind`-based for new events, title fallback for
  legacy (`kind=null`).

## Rollout / back-compat

- Schema change is additive (`db push` safe).
- Weeks 1–4 (kind null) resolve via title fallback — unchanged.
- First rotated week is the next one the cron creates (week 5+). Week 4 already
  exists with the static 6 and is untouched.
- No data migration required.
- The resolver script **skips** (logs + continues) any event it cannot resolve
  by `kind` or English title, rather than aborting the week. This keeps the
  graceful-degradation behavior the title-only resolver had. Consequence: on an
  `es` install, admin-created events (which have `kind = null` and Spanish
  titles) are not auto-resolvable and must be resolved via the admin UI — the
  automated rollover path always sets `kind`, so it is unaffected.

## Risks

- **Localized-title fallback** only matters for legacy weeks; new weeks use
  `kind`, removing the risk going forward.
- **A rotated question being trivially always-true/false** reduces fun for that
  card — mitigated by the deliberate mix; can re-order/trim the pool later
  without code changes (pool is data).
- **API event coverage**: `Missed Penalty` / minute granularity depend on
  API-Football populating events; same dependency the current 6 already have.
