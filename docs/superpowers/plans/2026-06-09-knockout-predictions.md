# Knockout-Stage Predictions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the World Cup knockout rounds (R32→FINAL) predictable in `/predictions`, and nudge users on the home page when a new round opens.

**Architecture:** The app is already knockout-ready everywhere except `/predictions` (hardcoded to `stage:"GROUP"`) and there is no active "go predict" prompt. We (1) generalize the `/predictions` query+UI to render knockout rounds as extra sections/tabs alongside groups, and (2) add a home-page banner driven by a pure picker over the user's unpredicted upcoming matches. Knockout match rows themselves are loaded separately (out of scope) — everything reacts automatically once rows with real teams exist.

**Tech Stack:** Next.js (App Router, RSC), Prisma/Postgres, next-intl, Vitest. Stage labels already in `src/lib/queries/constants.ts` (`KNOCKOUT_STAGES`, `STAGE_LABELS`).

**Decisions locked in brainstorming:**
- Per-match predictions, same mechanic/scoring as group stage (scoring is stage-agnostic — no change).
- Scoring uses goals (90'+ET); penalties ignored, draws valid. Enforced by the data loader (out of scope), guarded by a regression test here.
- Probabilities/AI-analysis data source for knockout: deferred (panel falls back to community-only if absent).
- Notification = home banner only (no email, no feed post).
- Knockout stage labels reuse `STAGE_LABELS` (English), consistent with the existing `/matches` and `/standings` tabs. Only the banner's prose strings are bilingual.

---

## File Structure

- **Modify** `src/lib/queries/predictions.ts` — fetch group + knockout matches; extract pure `assemblePredictionsData()`; add `headerLabel` to sections; `group` becomes nullable.
- **Modify** `src/components/predictions/GroupPredictionCard.tsx` — render `headerLabel` when present.
- **Modify** `src/components/predictions/PredictionsForm.tsx` — pass `headerLabel` to the card.
- **Modify** `src/lib/queries/home.ts` — add pure `pickPredictNudge()` + fetch unpredicted upcoming matches; expose `predictNudge` on `HomeData`.
- **Create** `src/components/PredictNudge.tsx` — the banner.
- **Modify** `src/app/(main)/home/page.tsx` — render the banner at the top of both states.
- **Modify** `messages/en.json`, `messages/es.json` — add `home.predictNudge`.
- **Modify** `src/lib/queries/predictions.test.ts` — tests for `assemblePredictionsData`.
- **Modify/Create** `src/lib/queries/home.test.ts` — tests for `pickPredictNudge`.
- **Modify/Create** `src/lib/scoring.test.ts` — knockout draw regression test.

---

### Task 1: `/predictions` query supports knockout rounds

**Files:**
- Modify: `src/lib/queries/predictions.ts`
- Test: `src/lib/queries/predictions.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/queries/predictions.test.ts`:

```ts
import { assemblePredictionsData } from "./predictions";

describe("assemblePredictionsData", () => {
  const team = (code: string) => ({ name: code, code, flagUrl: null });
  const now = new Date("2026-06-10T00:00:00Z");

  const rows = [
    { id: "g1", kickoffTime: new Date("2026-06-11T19:00:00Z"), stage: "GROUP", group: "A", homeTeam: team("MEX"), awayTeam: team("RSA") },
    { id: "g2", kickoffTime: new Date("2026-06-11T22:00:00Z"), stage: "GROUP", group: "A", homeTeam: team("KOR"), awayTeam: team("CZE") },
    { id: "k1", kickoffTime: new Date("2026-06-29T19:00:00Z"), stage: "R32", group: null, homeTeam: team("ESP"), awayTeam: team("URU") },
  ];

  it("creates a knockout section + tab with a localized round label", () => {
    const data = assemblePredictionsData(rows, new Map(), now);

    const r32 = data.allGroups.find((s) => s.name === "R32");
    expect(r32).toBeDefined();
    expect(r32!.headerLabel).toBe("Round of 32");
    expect(r32!.matches).toHaveLength(1);

    expect(data.groupTabs).toContainEqual({ label: "Round of 32", groups: ["R32"] });
    expect(data.individualTabs).toContainEqual({ label: "Round of 32", groups: ["R32"] });
  });

  it("orders knockout sections after groups, in bracket order", () => {
    const data = assemblePredictionsData(rows, new Map(), now);
    const names = data.allGroups.map((s) => s.name);
    expect(names).toEqual(["A", "R32"]);
  });

  it("counts knockout matches in the progress total", () => {
    const data = assemblePredictionsData(rows, new Map(), now);
    expect(data.progress.total).toBe(3); // 2 group + 1 knockout, all future
  });

  it("group sections have no headerLabel (card falls back to its own label)", () => {
    const data = assemblePredictionsData(rows, new Map(), now);
    expect(data.allGroups.find((s) => s.name === "A")!.headerLabel).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/queries/predictions.test.ts`
Expected: FAIL — `assemblePredictionsData is not a function`.

- [ ] **Step 3: Rewrite `predictions.ts` to extract the pure assembler and include knockout**

Replace the entire contents of `src/lib/queries/predictions.ts` with:

```ts
import { prisma } from "@/lib/prisma";
import { buildGroupTabs, type GroupTabRange } from "@/lib/groupTabs";
import { KNOCKOUT_STAGES, STAGE_LABELS } from "./constants";
export type { GroupTabRange } from "@/lib/groupTabs";
export { buildGroupTabs } from "@/lib/groupTabs";

// --- Exported Types ---

export interface PredictionMatch {
  id: string;
  kickoffTime: string; // ISO string for client serialization
  stage: string;
  group: string | null;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
  hasStarted: boolean;
  prediction: { homeScore: number; awayScore: number } | null;
}

export interface GroupPredictions {
  name: string;          // section id: group letter ("A") or stage code ("R32")
  headerLabel?: string;  // display label for knockout rounds; groups fall back in the card
  matches: PredictionMatch[];
}

export interface PredictionsData {
  groupTabs: GroupTabRange[];
  individualTabs: GroupTabRange[];
  allGroups: GroupPredictions[];
  progress: { completed: number; total: number };
}

interface RawPredMatch {
  id: string;
  kickoffTime: Date;
  stage: string;
  group: string | null;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
}

// --- Pure assembler (unit-tested) ---

export function assemblePredictionsData(
  matches: RawPredMatch[],
  predMap: Map<string, { homeScore: number; awayScore: number }>,
  now: Date,
): PredictionsData {
  const toPM = (m: RawPredMatch): PredictionMatch => {
    const pred = predMap.get(m.id);
    return {
      id: m.id,
      kickoffTime: m.kickoffTime.toISOString(),
      stage: m.stage,
      group: m.group,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      hasStarted: m.kickoffTime <= now,
      prediction: pred ? { homeScore: pred.homeScore, awayScore: pred.awayScore } : null,
    };
  };

  // Group sections, keyed by group letter
  const groupMap = new Map<string, PredictionMatch[]>();
  // Knockout sections, keyed by stage code
  const koMap = new Map<string, PredictionMatch[]>();

  for (const m of matches) {
    if (m.stage === "GROUP") {
      if (!m.group) continue;
      const arr = groupMap.get(m.group) ?? [];
      arr.push(toPM(m));
      groupMap.set(m.group, arr);
    } else if ((KNOCKOUT_STAGES as readonly string[]).includes(m.stage)) {
      const arr = koMap.get(m.stage) ?? [];
      arr.push(toPM(m));
      koMap.set(m.stage, arr);
    }
  }

  const sortedGroups = [...groupMap.keys()].sort();
  const loadedKnockoutStages = KNOCKOUT_STAGES.filter((s) => koMap.has(s));

  const allGroups: GroupPredictions[] = [
    ...sortedGroups.map((name) => ({ name, matches: groupMap.get(name)! })),
    ...loadedKnockoutStages.map((stage) => ({
      name: stage,
      headerLabel: STAGE_LABELS[stage],
      matches: koMap.get(stage)!,
    })),
  ];

  const knockoutTabs: GroupTabRange[] = loadedKnockoutStages.map((stage) => ({
    label: STAGE_LABELS[stage],
    groups: [stage],
  }));

  const groupTabs = [...buildGroupTabs(sortedGroups), ...knockoutTabs];
  const individualTabs: GroupTabRange[] = [
    ...sortedGroups.map((g) => ({ label: g, groups: [g] })),
    ...knockoutTabs,
  ];

  // Progress: future (not-started) matches across all loaded stages
  const total = matches.filter((m) => m.kickoffTime > now).length;
  const completed = matches.filter((m) => m.kickoffTime > now && predMap.has(m.id)).length;

  return { groupTabs, individualTabs, allGroups, progress: { completed, total } };
}

// --- Main query ---

export async function getPredictionsData(userId: string): Promise<PredictionsData> {
  const now = new Date();

  const [matches, userPredictions] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoffTime: "asc" },
      select: {
        id: true,
        kickoffTime: true,
        stage: true,
        group: true,
        homeTeam: { select: { name: true, code: true, flagUrl: true } },
        awayTeam: { select: { name: true, code: true, flagUrl: true } },
      },
    }),
    prisma.prediction.findMany({
      where: { userId },
      select: { matchId: true, homeScore: true, awayScore: true },
    }),
  ]);

  const predMap = new Map(
    userPredictions.map((p) => [p.matchId, { homeScore: p.homeScore, awayScore: p.awayScore }]),
  );

  return assemblePredictionsData(matches, predMap, now);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/queries/predictions.test.ts`
Expected: PASS (existing `buildGroupTabs` tests + 4 new `assemblePredictionsData` tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/predictions.ts src/lib/queries/predictions.test.ts
git commit -m "feat(predictions): include knockout rounds in /predictions query"
```

---

### Task 2: Render knockout round labels in the predictions UI

**Files:**
- Modify: `src/components/predictions/GroupPredictionCard.tsx:12-18` (Props) and `:242` (header)
- Modify: `src/components/predictions/PredictionsForm.tsx:253-262` (pass prop)

- [ ] **Step 1: Add `headerLabel` to the card props**

In `src/components/predictions/GroupPredictionCard.tsx`, change the `Props` interface (currently lines 12-18) to:

```ts
interface Props {
  groupName: string;
  headerLabel?: string;
  matches: PredictionMatch[];
  scores: Map<string, ScoreState>;
  errorMatchIds: Set<string>;
  onScoreChange: (matchId: string, field: "homeScore" | "awayScore", value: string) => void;
}
```

- [ ] **Step 2: Use `headerLabel` in the header, falling back to the group label**

In the same file, change the component signature and the header `<h3>` content.

Signature (currently `export function GroupPredictionCard({ groupName, matches, scores, errorMatchIds, onScoreChange }: Props) {`):

```tsx
export function GroupPredictionCard({
  groupName,
  headerLabel,
  matches,
  scores,
  errorMatchIds,
  onScoreChange,
}: Props) {
```

Header (currently `{t("groupLabel", { name: groupName })}`):

```tsx
{headerLabel ?? t("groupLabel", { name: groupName })}
```

- [ ] **Step 3: Pass `headerLabel` from the form**

In `src/components/predictions/PredictionsForm.tsx`, the `visibleGroups.map(...)` block (currently lines 253-262) becomes:

```tsx
{visibleGroups.map((group) => (
  <GroupPredictionCard
    key={group.name}
    groupName={group.name}
    headerLabel={group.headerLabel}
    matches={group.matches}
    scores={scores}
    errorMatchIds={errorMatchIds}
    onScoreChange={handleScoreChange}
  />
))}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/predictions/GroupPredictionCard.tsx src/components/predictions/PredictionsForm.tsx
git commit -m "feat(predictions): show knockout round names as section headers"
```

---

### Task 3: Home predict-nudge picker (pure) + wiring

**Files:**
- Modify: `src/lib/queries/home.ts`
- Test: `src/lib/queries/home.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Create/append `src/lib/queries/home.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { pickPredictNudge } from "./home";

describe("pickPredictNudge", () => {
  it("returns null when there are no unpredicted upcoming matches", () => {
    expect(pickPredictNudge([])).toBeNull();
  });

  it("picks the earliest-kickoff stage and counts its unpredicted matches", () => {
    const nudge = pickPredictNudge([
      { stage: "R32", kickoffTime: new Date("2026-06-29T19:00:00Z") },
      { stage: "R32", kickoffTime: new Date("2026-06-30T19:00:00Z") },
      { stage: "R16", kickoffTime: new Date("2026-07-04T19:00:00Z") },
    ]);
    expect(nudge).toEqual({ stage: "R32", count: 2 });
  });

  it("ignores later stages when an earlier one still has gaps", () => {
    const nudge = pickPredictNudge([
      { stage: "R16", kickoffTime: new Date("2026-07-04T19:00:00Z") },
      { stage: "R32", kickoffTime: new Date("2026-06-29T19:00:00Z") },
    ]);
    expect(nudge).toEqual({ stage: "R32", count: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/queries/home.test.ts`
Expected: FAIL — `pickPredictNudge is not a function`.

- [ ] **Step 3: Add the pure picker + query + expose on HomeData**

In `src/lib/queries/home.ts`:

(a) Add the exported type and the pure function near the top-level functions:

```ts
export interface PredictNudge {
  stage: string;
  count: number;
}

// Pure: given the user's unpredicted, not-yet-started matches, pick the
// earliest-kickoff stage and count how many of its matches are still open.
export function pickPredictNudge(
  matches: { stage: string; kickoffTime: Date }[],
): PredictNudge | null {
  if (matches.length === 0) return null;
  const earliest = matches.reduce((a, b) =>
    a.kickoffTime.getTime() <= b.kickoffTime.getTime() ? a : b,
  );
  const count = matches.filter((m) => m.stage === earliest.stage).length;
  return { stage: earliest.stage, count };
}

async function getPredictNudge(userId: string): Promise<PredictNudge | null> {
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      kickoffTime: { gt: new Date() },
      predictions: { none: { userId } },
    },
    select: { stage: true, kickoffTime: true },
  });
  return pickPredictNudge(matches);
}
```

(b) Add `predictNudge: PredictNudge | null;` to the `HomeData` interface (after `latestHighlights`).

(c) In `getHomeData`, add `getPredictNudge(userId)` to the `Promise.all([...])` array and destructuring, then include it in the returned object. Concretely, change the destructuring/await block to add the call as the final element and add `predictNudge` to the return:

```ts
  const [leaderboardRaw, userPredictions, upcomingMatchesRaw, activityFeed, participation, firstKickoff, favorites, nextFavoriteMatch, latestHighlights, predictNudge] =
    await Promise.all([
      hasLeaderboard ? getLeaderboardData() : Promise.resolve([]),
      getUserPredictions(userId),
      getUpcomingMatches(userId),
      getActivityFeed(userId),
      getParticipation(userId),
      getFirstKickoff(),
      getTopFavorites(),
      getNextFavoriteTeamMatch(userId),
      getLatestHighlights(),
      getPredictNudge(userId),
    ]);
```

and in the returned object add `predictNudge,` after `latestHighlights,`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/queries/home.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/home.ts src/lib/queries/home.test.ts
git commit -m "feat(home): compute predict-nudge for the next open round"
```

---

### Task 4: Home banner component + page wiring + i18n

**Files:**
- Create: `src/components/PredictNudge.tsx`
- Modify: `src/app/(main)/home/page.tsx`
- Modify: `messages/en.json`, `messages/es.json`

- [ ] **Step 1: Add i18n strings**

In `messages/en.json`, inside the `"home"` object, add after the `"hero"` block:

```json
    "predictNudge": {
      "message": "{stage} is open — you have {count} prediction(s) left",
      "cta": "Predict now"
    },
```

In `messages/es.json`, inside the `"home"` object, add after the `"hero"` block:

```json
    "predictNudge": {
      "message": "Se abrió {stage} — te faltan {count} pronóstico(s)",
      "cta": "Predecir ahora"
    },
```

- [ ] **Step 2: Create the banner component**

Create `src/components/PredictNudge.tsx`:

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { STAGE_LABELS } from "@/lib/queries/constants";
import type { PredictNudge as PredictNudgeData } from "@/lib/queries/home";

export async function PredictNudge({ nudge }: { nudge: PredictNudgeData | null }) {
  if (!nudge || nudge.count === 0) return null;
  const t = await getTranslations("home.predictNudge");
  const stageLabel = STAGE_LABELS[nudge.stage] ?? nudge.stage;

  return (
    <Link
      href="/predictions"
      className="flex items-center justify-between gap-4"
      style={{
        padding: "14px 20px",
        borderRadius: 16,
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-accent-gold)",
        textDecoration: "none",
      }}
    >
      <span className="flex items-center gap-2" style={{ minWidth: 0 }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, color: "var(--color-accent-amber)" }}
        >
          sports_soccer
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-primary)",
          }}
        >
          {t("message", { stage: stageLabel, count: nudge.count })}
        </span>
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          color: "var(--color-accent-gold)",
        }}
      >
        {t("cta")} →
      </span>
    </Link>
  );
}
```

- [ ] **Step 3: Render the banner at the top of both home states**

In `src/app/(main)/home/page.tsx`:

(a) Add the import near the other component imports:

```tsx
import { PredictNudge } from "@/components/PredictNudge";
```

(b) In the `hasLeaderboard` (Torneo Activo) branch, make the banner the first child inside the outer `<div className="page-content">`. Change the opening of that block from:

```tsx
    return (
      <div className="page-content">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
```

to:

```tsx
    return (
      <div className="page-content">
        <PredictNudge nudge={data.predictNudge} />
        <div className="flex flex-col lg:flex-row gap-6 h-full">
```

(c) In the Pre-Mundial branch, render it right after `<HeroBanner />`:

```tsx
        <HeroBanner />
        <PredictNudge nudge={data.predictNudge} />
```

- [ ] **Step 4: Typecheck + full unit suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PredictNudge.tsx "src/app/(main)/home/page.tsx" messages/en.json messages/es.json
git commit -m "feat(home): add predict-nudge banner for new rounds"
```

---

### Task 5: Regression guard for knockout draw scoring

**Files:**
- Modify/Create: `src/lib/scoring.test.ts`

- [ ] **Step 1: Write the test**

Append (or create) `src/lib/scoring.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { calculatePoints } from "./scoring";

describe("calculatePoints — knockout (goals only, penalties ignored)", () => {
  it("a 1-1 prediction is exact when the cruce ends 1-1 (decided on penalties)", () => {
    // Knockout match stored as its goal score (1-1); penalty shootout is not a goal.
    expect(calculatePoints(1, 1, 1, 1)).toBe(5);
  });

  it("predicting a winner scores 0 when the cruce is a goals draw", () => {
    expect(calculatePoints(2, 1, 1, 1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/lib/scoring.test.ts`
Expected: PASS (scoring is stage-agnostic; this just documents the decision).

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring.test.ts
git commit -m "test(scoring): guard knockout draw scoring (penalties ignored)"
```

---

## Out of scope (loaded/decided later)

- The actual loader that inserts knockout `Match` rows (script vs API-Football ingest) — must store **goals (90'+ET)**, not penalties, and ideally `homeWinProb/drawProb/awayWinProb`.
- Knockout probability data source and AI analysis text.
- Optional `bracketMatchNumber` field for robust `bracket.ts` slot linkage (cosmetic).
- ⚠️ **Operational:** API-Football Pro expires **2026-07-07**, before SF/Final (~14-19 Jul). If the loader uses the API, renew first.

## Self-Review notes

- Spec coverage: `/predictions` knockout (Tasks 1-2), progress "72/xxx" (Task 1, `progress.total`), home banner with two conditions — rows loaded + future-and-unpredicted (Tasks 3-4), `/matches` & `/standings` pills (already automatic — no task, verified in brainstorming), scoring unchanged + guarded (Task 5).
- `PredictNudge` type is defined in `home.ts` (Task 3) and imported by the component (Task 4) and re-used by the picker test — names consistent.
- `assemblePredictionsData` / `pickPredictNudge` signatures match their tests.
