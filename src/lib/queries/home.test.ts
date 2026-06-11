import { describe, it, expect, vi, beforeEach } from "vitest";

const matchCountMock = vi.fn();
const matchFindFirstMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: {
      count: (...args: unknown[]) => matchCountMock(...args),
      findFirst: (...args: unknown[]) => matchFindFirstMock(...args),
    },
  },
}));

import { pickPredictNudge, checkTournamentStarted, getFirstKickoff } from "./home";

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

describe("checkTournamentStarted", () => {
  beforeEach(() => {
    matchCountMock.mockReset();
  });

  it("returns true when at least one match has kicked off", async () => {
    matchCountMock.mockResolvedValue(1);

    const started = await checkTournamentStarted();

    expect(started).toBe(true);
    // Triggers on kickoff time having passed — NOT on match status,
    // so it doesn't depend on cron/admin syncs flipping LIVE/FINISHED.
    const args = matchCountMock.mock.calls[0][0];
    expect(args.where.kickoffTime.lte).toBeInstanceOf(Date);
    expect(args.where.status).toBeUndefined();
  });

  it("returns false when no match has kicked off yet", async () => {
    matchCountMock.mockResolvedValue(0);

    const started = await checkTournamentStarted();

    expect(started).toBe(false);
  });
});

describe("getFirstKickoff", () => {
  beforeEach(() => {
    matchFindFirstMock.mockReset();
  });

  it("returns the tournament's earliest kickoff regardless of match status", async () => {
    const opening = new Date("2026-06-11T19:00:00Z");
    matchFindFirstMock.mockResolvedValue({ kickoffTime: opening });

    const result = await getFirstKickoff();

    expect(result).toEqual(opening);
    const args = matchFindFirstMock.mock.calls[0][0];
    // Must NOT filter by status: once the opening match goes LIVE, a
    // SCHEDULED-only filter would skip to the NEXT match and the
    // countdown would show a wrong target (prod bug 2026-06-11).
    expect(args.where).toBeUndefined();
    expect(args.orderBy).toEqual({ kickoffTime: "asc" });
  });

  it("returns null when there are no matches", async () => {
    matchFindFirstMock.mockResolvedValue(null);

    const result = await getFirstKickoff();

    expect(result).toBeNull();
  });
});
