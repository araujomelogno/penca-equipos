# Match Dates Timezone Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match days (headers, pills, calendar, filter, "today") and the Arena deadline are shown in the user's timezone — auto-detected like Google Calendar — instead of mixing UTC (server) with browser TZ (client).

**Architecture:** Client detects its IANA timezone and stores it in a cookie (`pencachi_tz`). The server reads that cookie and derives all calendar-days in that TZ via pure `Intl`-based helpers. Shared weekly-game boundaries stay in UTC by design (only their display is localized).

**Tech Stack:** Next.js 16 (RSC + server actions), `Intl.DateTimeFormat` (no new deps), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-05-match-dates-timezone-design.md`

**Branch:** `fix/match-dates-timezone` (already created).

---

## File Structure

- **Create** `src/lib/timezone.ts` — pure, client-safe: constants + `isValidTimeZone` + `instantToDateKey` + `dayRangeUtc` + `todayDateKey`. NO `next/headers` import (so client components can import it).
- **Create** `src/lib/timezone.test.ts` — unit tests for the pure helpers.
- **Create** `src/lib/timezone.server.ts` — `getTimeZone()` (reads cookie via `next/headers`, server-only).
- **Create** `src/lib/timezone.server.test.ts` — unit test with mocked `next/headers`.
- **Create** `src/app/actions/timezone.ts` — `setTimeZone()` server action.
- **Create** `src/components/TimeZoneSync.tsx` — client TZ detector mounted once.
- **Modify** `src/app/layout.tsx` — mount `<TimeZoneSync />`.
- **Modify** `src/lib/queries/matches.ts` — thread `tz` through grouping/pills/filter; resolve via `getTimeZone()`.
- **Modify** `src/lib/queries/matches.test.ts` — add Uruguay failing case.
- **Modify** `src/components/matches/DateSelector.tsx` — compute "today" in browser TZ, not UTC.
- **Modify** `src/components/prediction-arena/PredictionArenaView.tsx` — localize deadline display.
- **Modify** `src/components/admin/PredictionArenaAdmin.tsx` — remove misleading "UTC" label.

---

## Task 1: Pure timezone helpers

**Files:**
- Create: `src/lib/timezone.ts`
- Test: `src/lib/timezone.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/timezone.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isValidTimeZone, instantToDateKey, dayRangeUtc, todayDateKey } from "./timezone";

describe("isValidTimeZone", () => {
  it("accepts a valid IANA zone", () => {
    expect(isValidTimeZone("America/Montevideo")).toBe(true);
  });
  it("rejects garbage", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("instantToDateKey", () => {
  it("returns the local calendar day in the given TZ", () => {
    // 2026-06-10T00:00:00Z is 2026-06-09 21:00 in Uruguay (UTC-3)
    const instant = new Date("2026-06-10T00:00:00Z");
    expect(instantToDateKey(instant, "America/Montevideo")).toBe("2026-06-09");
    // Same instant in Tokyo (UTC+9) is already 2026-06-10 09:00
    expect(instantToDateKey(instant, "Asia/Tokyo")).toBe("2026-06-10");
    // And in UTC it is 2026-06-10
    expect(instantToDateKey(instant, "UTC")).toBe("2026-06-10");
  });
  it("keeps midday kickoffs on the same day", () => {
    const instant = new Date("2026-06-11T15:00:00Z");
    expect(instantToDateKey(instant, "America/Montevideo")).toBe("2026-06-11");
  });
});

describe("dayRangeUtc", () => {
  it("bounds a Montevideo calendar day in UTC", () => {
    const { start, end } = dayRangeUtc("2026-06-10", "America/Montevideo");
    // Montevideo is UTC-3 (no DST in 2026): 2026-06-10 00:00 local = 03:00Z
    expect(start.toISOString()).toBe("2026-06-10T03:00:00.000Z");
    // End is 1ms before next local midnight = 2026-06-11 03:00Z - 1ms
    expect(end.toISOString()).toBe("2026-06-11T02:59:59.999Z");
  });
});

describe("todayDateKey", () => {
  it("matches instantToDateKey(now)", () => {
    const tz = "America/Montevideo";
    expect(todayDateKey(tz)).toBe(instantToDateKey(new Date(), tz));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/timezone.test.ts`
Expected: FAIL — `Failed to resolve import "./timezone"` / functions not defined.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/timezone.ts`:

```ts
// Pure, client-safe timezone helpers. MUST NOT import `next/headers`
// (this file is imported by client components). Server-only cookie reading
// lives in `timezone.server.ts`.

export const TZ_COOKIE = "pencachi_tz";

export const defaultTimeZone =
  process.env.DEFAULT_TIMEZONE || "America/Montevideo";

/** True if `tz` is a valid IANA timezone the runtime understands. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "YYYY-MM-DD" of `date` as seen in `tz`. */
export function instantToDateKey(date: Date, tz: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** ms to add to `date.getTime()` so that the wall clock in `tz` reads as UTC. */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = map.hour === "24" ? "0" : map.hour;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUTC - date.getTime();
}

/** UTC instants bounding the calendar day `dateStr` (YYYY-MM-DD) in `tz`. */
export function dayRangeUtc(
  dateStr: string,
  tz: string,
): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const startGuess = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const start = new Date(startGuess - tzOffsetMs(new Date(startGuess), tz));
  const endGuess = Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0);
  const end = new Date(endGuess - tzOffsetMs(new Date(endGuess), tz) - 1);
  return { start, end };
}

/** Today's "YYYY-MM-DD" in `tz`. */
export function todayDateKey(tz: string): string {
  return instantToDateKey(new Date(), tz);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/timezone.test.ts`
Expected: PASS (all 4 describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/timezone.ts src/lib/timezone.test.ts
git commit -m "Add pure timezone helpers (instantToDateKey, dayRangeUtc, todayDateKey)"
```

---

## Task 2: Server-side timezone resolver

**Files:**
- Create: `src/lib/timezone.server.ts`
- Test: `src/lib/timezone.server.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/timezone.server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import { getTimeZone } from "./timezone.server";

const mockCookie = (value: string | undefined) => {
  (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: (name: string) =>
      name === "pencachi_tz" && value ? { value } : undefined,
  });
};

describe("getTimeZone", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the cookie TZ when valid", async () => {
    mockCookie("Asia/Tokyo");
    expect(await getTimeZone()).toBe("Asia/Tokyo");
  });

  it("falls back to default when cookie missing", async () => {
    mockCookie(undefined);
    expect(await getTimeZone()).toBe("America/Montevideo");
  });

  it("falls back to default when cookie is garbage", async () => {
    mockCookie("Not/AZone");
    expect(await getTimeZone()).toBe("America/Montevideo");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/timezone.server.test.ts`
Expected: FAIL — `Failed to resolve import "./timezone.server"`.

- [ ] **Step 3: Implement getTimeZone**

Create `src/lib/timezone.server.ts`:

```ts
import { cookies } from "next/headers";
import { TZ_COOKIE, defaultTimeZone, isValidTimeZone } from "./timezone";

/** Resolve the active timezone from the request cookie, or the default. */
export async function getTimeZone(): Promise<string> {
  const store = await cookies();
  const tz = store.get(TZ_COOKIE)?.value;
  return tz && isValidTimeZone(tz) ? tz : defaultTimeZone;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/timezone.server.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/timezone.server.ts src/lib/timezone.server.test.ts
git commit -m "Add getTimeZone server resolver (reads pencachi_tz cookie)"
```

---

## Task 3: Group matches by date in the user's TZ (the core bug)

**Files:**
- Modify: `src/lib/queries/matches.ts` (`groupByDate`, `getAllMatchDates`)
- Test: `src/lib/queries/matches.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/lib/queries/matches.test.ts`, inside the `describe("groupByDate", ...)` block (after the existing `makeMatch` helper), add:

```ts
  it("groups a midnight-UTC kickoff under the previous day in Uruguay (UTC-3)", () => {
    const m = makeMatch("2026-06-10", "x");
    m.kickoffTime = new Date("2026-06-10T00:00:00Z"); // 2026-06-09 21:00 in UY
    const groups = groupByDate([m], "America/Montevideo");
    expect(groups[0].dateKey).toBe("2026-06-09");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/queries/matches.test.ts -t "midnight-UTC"`
Expected: FAIL — receives `"2026-06-10"` (current UTC grouping ignores the tz arg).

- [ ] **Step 3: Implement tz-aware grouping**

In `src/lib/queries/matches.ts`, add to the imports at the top:

```ts
import {
  instantToDateKey,
  dayRangeUtc,
  todayDateKey,
  defaultTimeZone,
} from "@/lib/timezone";
```

Replace the whole `groupByDate` function (currently lines ~315-340) with:

```ts
export function groupByDate(
  matches: MatchCardData[],
  tz: string = defaultTimeZone,
): DateGroup[] {
  const groups = new Map<string, MatchCardData[]>();

  for (const m of matches) {
    const dateKey = instantToDateKey(new Date(m.kickoffTime), tz);
    const arr = groups.get(dateKey) ?? [];
    arr.push(m);
    groups.set(dateKey, arr);
  }

  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, matches]) => {
      const [y, mo, d] = dateKey.split("-").map(Number);
      const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
      const label = `${dayNames[dow]} ${monthNames[mo - 1]} ${d}`;
      return { dateLabel: label, dateKey, matches };
    });
}
```

Then replace the body of `getAllMatchDates` (currently line ~265) so the date set uses the TZ. Change its signature and the `dateSet.add` line:

```ts
async function getAllMatchDates(tz: string): Promise<string[]> {
  const rows = await prisma.match.findMany({
    select: { kickoffTime: true },
    orderBy: { kickoffTime: "asc" },
  });

  const dateSet = new Set<string>();
  for (const r of rows) {
    dateSet.add(instantToDateKey(r.kickoffTime, tz));
  }
  return Array.from(dateSet);
}
```

> Note: `getMatchesData` still calls `getAllMatchDates()` with no arg — that is fixed in Task 5. TypeScript will error until then; that's expected and resolved within this plan.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/queries/matches.test.ts`
Expected: PASS — including the new Uruguay test and all pre-existing `groupByDate` tests (Montevideo default keeps 15:00Z kickoffs on the same day).

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/matches.ts src/lib/queries/matches.test.ts
git commit -m "Group match days and date list in the user's timezone"
```

---

## Task 4: Date pills and date filter in the user's TZ

**Files:**
- Modify: `src/lib/queries/matches.ts` (`buildDatePills`, `getFilteredMatches`)
- Test: `src/lib/queries/matches.test.ts` (existing pill tests must still pass)

- [ ] **Step 1: Replace `buildDatePills`**

In `src/lib/queries/matches.ts`, replace the whole `buildDatePills` function (currently lines ~270-311) with this version. It derives the day-of-week deterministically from the date string (TZ-independent) and only uses `tz` for "today":

```ts
export function buildDatePills(
  allDates: string[],
  selectedDate?: string,
  tz: string = defaultTimeZone,
): DatePill[] {
  if (allDates.length === 0) return [];

  const todayStr = todayDateKey(tz);
  const center = selectedDate ?? todayStr;

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];

  // Split dates into before/after center, pick 2 closest from each side
  const before = allDates.filter((d) => d < center).slice(-2);
  const exact = allDates.filter((d) => d === center);
  const after = allDates.filter((d) => d > center).slice(0, 2);
  const selected = [...before, ...exact, ...after].slice(0, 4);

  // If we got fewer than 4, fill from the closest available
  if (selected.length < 4) {
    for (const d of allDates) {
      if (!selected.includes(d)) {
        selected.push(d);
        if (selected.length >= 4) break;
      }
    }
    selected.sort();
  }

  return selected.map((dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return {
      date: dateStr,
      dayOfWeek: dayNames[dow],
      dayOfMonth: d,
      month: monthNames[m - 1],
      isToday: dateStr === todayStr,
    };
  });
}
```

- [ ] **Step 2: Replace the date filter in `getFilteredMatches`**

In `src/lib/queries/matches.ts`, change the signature of `getFilteredMatches` to accept `tz` and replace the date-filter block (currently lines ~196-200):

Signature:
```ts
async function getFilteredMatches(filters: MatchesFilters, tz: string) {
```

Date-filter block:
```ts
  // Date filter (day boundaries in the user's TZ)
  if (filters.date) {
    const { start, end } = dayRangeUtc(filters.date, tz);
    where.kickoffTime = { gte: start, lte: end };
  }
```

- [ ] **Step 3: Run the existing pill tests to verify they still pass**

Run: `npx vitest run src/lib/queries/matches.test.ts`
Expected: PASS — all `buildDatePills` tests still green (`month: "JUN"`, `dayOfMonth: 11`, `dayOfWeek` truthy are all derived from the string, not the runtime TZ).

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries/matches.ts
git commit -m "Compute date pills and date filter in the user's timezone"
```

---

## Task 5: Wire the resolved TZ into getMatchesData + fix DateSelector "today"

**Files:**
- Modify: `src/lib/queries/matches.ts` (`getMatchesData`)
- Modify: `src/components/matches/DateSelector.tsx`

- [ ] **Step 1: Resolve and thread the TZ in `getMatchesData`**

In `src/lib/queries/matches.ts`, add the server import near the top (separate from the pure import added in Task 3):

```ts
import { getTimeZone } from "@/lib/timezone.server";
```

In `getMatchesData`, replace the opening of the function (the `Promise.all` block and the `datePills` line, currently lines ~68-74) with:

```ts
  const tz = await getTimeZone();

  const [stages, allMatchDates, matchRows] = await Promise.all([
    getAvailableStages(),
    getAllMatchDates(tz),
    getFilteredMatches(filters, tz),
  ]);

  const datePills = buildDatePills(allMatchDates, filters.date, tz);
```

And update the grouping call near the end of `getMatchesData` (currently line ~159):

```ts
  // Group by date
  const dateGroups = groupByDate(matches, tz);
```

- [ ] **Step 2: Type-check to verify wiring**

Run: `npx tsc --noEmit`
Expected: PASS — no more "Expected 1 argument" errors on `getAllMatchDates` / `getFilteredMatches`.

- [ ] **Step 3: Fix the UTC "today" in DateSelector**

In `src/components/matches/DateSelector.tsx`, inside `CalendarMonth` (currently lines ~58-60), replace:

```ts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
```

with (browser TZ = the user's TZ in a client component):

```ts
  const todayStr = new Intl.DateTimeFormat("en-CA").format(new Date());
```

- [ ] **Step 4: Type-check again**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/matches.ts src/components/matches/DateSelector.tsx
git commit -m "Resolve request timezone in getMatchesData and fix calendar today"
```

---

## Task 6: Client TZ detection — cookie + refresh

**Files:**
- Create: `src/app/actions/timezone.ts`
- Create: `src/components/TimeZoneSync.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create the server action**

Create `src/app/actions/timezone.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { TZ_COOKIE, isValidTimeZone } from "@/lib/timezone";

export async function setTimeZone(tz: string) {
  if (!isValidTimeZone(tz)) return;

  const store = await cookies();
  store.set(TZ_COOKIE, tz, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
```

- [ ] **Step 2: Create the client detector**

Create `src/components/TimeZoneSync.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE } from "@/lib/timezone";
import { setTimeZone } from "@/app/actions/timezone";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="))
    ?.split("=")[1];
}

/** Detects the browser timezone once and, if it differs from the cookie,
 *  persists it and refreshes so server-rendered days match the user's TZ. */
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    if (readCookie(TZ_COOKIE) === tz) return;
    setTimeZone(tz).then(() => router.refresh());
  }, [router]);

  return null;
}
```

- [ ] **Step 3: Mount it in the root layout**

In `src/app/layout.tsx`, add the import after the existing imports:

```ts
import { TimeZoneSync } from "@/components/TimeZoneSync";
```

Then render it inside `<body>`, immediately inside the `NextIntlClientProvider`, before `{children}`:

```tsx
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TimeZoneSync />
          {children}
        </NextIntlClientProvider>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/timezone.ts src/components/TimeZoneSync.tsx src/app/layout.tsx
git commit -m "Detect browser timezone on the client and persist via cookie"
```

---

## Task 7: Localize the Arena deadline display + fix admin label

**Files:**
- Modify: `src/components/prediction-arena/PredictionArenaView.tsx` (line ~187)
- Modify: `src/components/admin/PredictionArenaAdmin.tsx` (line ~172)

Both are client components, so dropping the forced `timeZone: "UTC"` / the literal `" UTC"` makes them render the deadline instant in the user's local TZ. Week-boundary logic is NOT touched (intentionally UTC — see spec).

- [ ] **Step 1: Fix the user-facing deadline (PredictionArenaView)**

In `src/components/prediction-arena/PredictionArenaView.tsx`, on line ~187, replace:

```tsx
            {week && isOpen && <> {t("lockIn")}<strong style={{ color: "var(--color-text-primary)" }}>{new Date(week.deadline).toLocaleString(locale, { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</strong>.</>}
```

with (no `timeZone: "UTC"`, no trailing " UTC" — uses the browser/user TZ):

```tsx
            {week && isOpen && <> {t("lockIn")}<strong style={{ color: "var(--color-text-primary)" }}>{new Date(week.deadline).toLocaleString(locale, { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>.</>}
```

- [ ] **Step 2: Fix the misleading admin label (PredictionArenaAdmin)**

In `src/components/admin/PredictionArenaAdmin.tsx`, on line ~172, replace:

```tsx
              ? `Deadline: ${new Date(deadline).toLocaleString("en", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} UTC`
```

with (this value was already rendered in the browser TZ, so the " UTC" suffix was wrong — remove it):

```tsx
              ? `Deadline: ${new Date(deadline).toLocaleString("en", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/prediction-arena/PredictionArenaView.tsx src/components/admin/PredictionArenaAdmin.tsx
git commit -m "Show Arena deadline in the user's timezone (drop forced UTC)"
```

---

## Task 8: Full verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS — all tests, including the new timezone + Uruguay cases. (Pre-existing `prediction-arena.test.ts` UTC-boundary tests stay green; their logic was not touched.)

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds (validates client/server import boundary — `timezone.ts` must stay free of `next/headers`).

- [ ] **Step 5: Manual smoke (the actual bug)**

App runs on **http://localhost:3040** (DB: `docker compose up -d db`). Validate the Uruguay scenario:
- Confirm a known late-night-UTC match appears under the SAME day in the date header/pill as the day shown by its kickoff time.
- Optionally, in DevTools set an emulated timezone (Sensors → Location/Timezone) to `America/Montevideo` vs `Asia/Tokyo`, reload, and confirm the day headers shift consistently with the kickoff times.

- [ ] **Step 6: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "Verification fixes for timezone day handling"
```

---

## Self-Review (completed)

- **Spec coverage:** matches page grouping/pills/filter/today (Tasks 3-5), client detection + cookie (Tasks 1-2, 6), Arena deadline display (Task 7), admin label cleanup (Task 7). Intentionally-UTC code (week bounds, highlight keys) deliberately untouched per spec. ✓
- **Placeholder scan:** none — every code step shows full code; the one transient `tsc` error (after Task 3) is explicitly explained and resolved in Task 5. ✓
- **Type consistency:** `getTimeZone()` (server), `instantToDateKey`/`dayRangeUtc`/`todayDateKey`/`isValidTimeZone`/`defaultTimeZone`/`TZ_COOKIE` (pure) — names used identically across Tasks 1-7. `groupByDate(matches, tz)`, `getAllMatchDates(tz)`, `getFilteredMatches(filters, tz)`, `buildDatePills(allDates, selectedDate, tz)` signatures consistent between definition and call sites. ✓
```
