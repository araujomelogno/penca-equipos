import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (vi.hoisted so the hoisted vi.mock factories can reference them) ---

const {
  recalcMock,
  getFixturesMock,
  findUniqueMock,
  updateMock,
  upsertMock,
} = vi.hoisted(() => ({
  recalcMock: vi.fn(async () => 1),
  getFixturesMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(async () => ({})),
  upsertMock: vi.fn(async () => ({})),
}));

vi.mock("@/lib/scoring", () => ({
  recalculateMatchPoints: recalcMock,
}));

vi.mock("@/lib/api-football", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api-football")>();
  return { ...actual, getFixtures: getFixturesMock };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { findUnique: findUniqueMock, update: updateMock },
    activity: { upsert: upsertMock },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { syncMatchResults } from "./match-sync";

// API-Football fixture shape (only the fields match-sync reads).
function makeFixture(opts: {
  short: string;
  home: number | null;
  away: number | null;
  id?: number;
}) {
  return {
    fixture: {
      id: opts.id ?? 1001,
      status: { short: opts.short, elapsed: null },
    },
    goals: { home: opts.home, away: opts.away },
    teams: { home: { name: "Uruguay" }, away: { name: "Argentina" } },
  };
}

describe("syncMatchResults — scoring on LIVE→FINISHED transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recalculates points when a match transitions LIVE→FINISHED even if the score is unchanged", async () => {
    // DB already holds the live score (2-1, LIVE) persisted by an earlier
    // non-finishedOnly sync that did NOT score (status was LIVE then).
    findUniqueMock.mockResolvedValue({
      id: "m1",
      status: "LIVE",
      homeScore: 2,
      awayScore: 1,
    });
    // Match ends with the SAME score -> scoreChanged would be false.
    getFixturesMock.mockResolvedValue([
      makeFixture({ short: "FT", home: 2, away: 1 }),
    ]);

    await syncMatchResults();

    expect(recalcMock).toHaveBeenCalledWith("m1", 2, 1);
  });

  it("does NOT recalculate while the match is still LIVE", async () => {
    findUniqueMock.mockResolvedValue({
      id: "m1",
      status: "SCHEDULED",
      homeScore: null,
      awayScore: null,
    });
    getFixturesMock.mockResolvedValue([
      makeFixture({ short: "1H", home: 1, away: 0 }),
    ]);

    await syncMatchResults();

    expect(recalcMock).not.toHaveBeenCalled();
  });

  it("recalculates when a finished score is corrected (score changed)", async () => {
    findUniqueMock.mockResolvedValue({
      id: "m1",
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
    });
    getFixturesMock.mockResolvedValue([
      makeFixture({ short: "FT", home: 3, away: 1 }),
    ]);

    await syncMatchResults();

    expect(recalcMock).toHaveBeenCalledWith("m1", 3, 1);
  });
});
