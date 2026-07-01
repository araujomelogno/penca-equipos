import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (vi.hoisted so the hoisted vi.mock factories can reference them) ---

const {
  recalcMock,
  getFixturesMock,
  teamFindManyMock,
  matchFindManyMock,
  updateMock,
  upsertMock,
  activityUpsertMock,
} = vi.hoisted(() => ({
  recalcMock: vi.fn(async () => 1),
  getFixturesMock: vi.fn(),
  teamFindManyMock: vi.fn(),
  matchFindManyMock: vi.fn(),
  updateMock: vi.fn(async () => ({})),
  upsertMock: vi.fn(async (args: unknown) => {
    void args;
    return { id: "created" };
  }),
  activityUpsertMock: vi.fn(async () => ({})),
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
    team: { findMany: teamFindManyMock },
    match: { findMany: matchFindManyMock, update: updateMock, upsert: upsertMock },
    activity: { upsert: activityUpsertMock },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { syncMatchResults } from "./match-sync";

const TEAMS = [
  { id: "t-uru", name: "Uruguay", code: "URU" },
  { id: "t-arg", name: "Argentina", code: "ARG" },
  { id: "t-esp", name: "Spain", code: "ESP" },
  { id: "t-cro", name: "Croatia", code: "CRO" },
];

// Full API-Football fixture shape (match-sync reads teams/league/goals/status).
function makeFixture(opts: {
  short: string;
  home: number | null;
  away: number | null;
  id?: number;
  homeName?: string;
  awayName?: string;
  round?: string;
  elapsed?: number | null;
}) {
  return {
    fixture: {
      id: opts.id ?? 1001,
      date: "2026-06-29T19:00:00Z",
      venue: { name: "SoFi Stadium", city: null },
      status: { long: "", short: opts.short, elapsed: opts.elapsed ?? null },
    },
    league: { round: opts.round ?? "Round of 32" },
    goals: { home: opts.home, away: opts.away },
    teams: {
      home: { id: 1, name: opts.homeName ?? "Uruguay", logo: "" },
      away: { id: 2, name: opts.awayName ?? "Argentina", logo: "" },
    },
  };
}

// An existing DB match (Uruguay home vs Argentina away) at the given state.
function existingMatch(o: {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  apiFootballId?: number;
  stage?: string;
}) {
  return {
    id: "m1",
    homeTeamId: "t-uru",
    awayTeamId: "t-arg",
    stage: o.stage ?? "R32",
    status: o.status,
    homeScore: o.homeScore,
    awayScore: o.awayScore,
    apiFootballId: o.apiFootballId ?? 1001,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  teamFindManyMock.mockResolvedValue(TEAMS);
  matchFindManyMock.mockResolvedValue([]);
});

describe("syncMatchResults — scoring on LIVE→FINISHED transition", () => {
  it("recalculates points when a match transitions LIVE→FINISHED even if the score is unchanged", async () => {
    matchFindManyMock.mockResolvedValue([
      existingMatch({ status: "LIVE", homeScore: 2, awayScore: 1 }),
    ]);
    getFixturesMock.mockResolvedValue([
      makeFixture({ short: "FT", home: 2, away: 1 }),
    ]);

    await syncMatchResults();

    expect(recalcMock).toHaveBeenCalledWith("m1", 2, 1);
  });

  it("does NOT recalculate while the match is still LIVE", async () => {
    matchFindManyMock.mockResolvedValue([
      existingMatch({ status: "SCHEDULED", homeScore: null, awayScore: null }),
    ]);
    getFixturesMock.mockResolvedValue([
      makeFixture({ short: "1H", home: 1, away: 0 }),
    ]);

    await syncMatchResults();

    expect(recalcMock).not.toHaveBeenCalled();
  });

  it("recalculates when a finished score is corrected (score changed)", async () => {
    matchFindManyMock.mockResolvedValue([
      existingMatch({ status: "FINISHED", homeScore: 2, awayScore: 1 }),
    ]);
    getFixturesMock.mockResolvedValue([
      makeFixture({ short: "FT", home: 3, away: 1 }),
    ]);

    await syncMatchResults();

    expect(recalcMock).toHaveBeenCalledWith("m1", 3, 1);
  });
});

describe("syncMatchResults — knockout auto-fill (create newly-resolved fixtures)", () => {
  it("creates a newly-resolved knockout fixture with its teams", async () => {
    // No such match in DB yet. API now resolves Spain vs Croatia for R16.
    matchFindManyMock.mockResolvedValue([]);
    getFixturesMock.mockResolvedValue([
      makeFixture({
        id: 2050,
        short: "NS",
        home: null,
        away: null,
        homeName: "Spain",
        awayName: "Croatia",
        round: "Round of 16",
      }),
    ]);

    await syncMatchResults({ finishedOnly: true });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const arg = upsertMock.mock.calls[0]![0] as {
      where: { apiFootballId: number };
      create: Record<string, string>;
      update: Record<string, unknown>;
    };
    expect(arg.where).toEqual({ apiFootballId: 2050 });
    expect(arg.create.homeTeamId).toBe("t-esp");
    expect(arg.create.awayTeamId).toBe("t-cro");
    expect(arg.create.stage).toBe("R16");
  });

  it("stores a not-yet-played created fixture as SCHEDULED with null scores in finishedOnly mode", async () => {
    matchFindManyMock.mockResolvedValue([]);
    getFixturesMock.mockResolvedValue([
      makeFixture({
        id: 2050,
        short: "NS",
        home: null,
        away: null,
        homeName: "Spain",
        awayName: "Croatia",
        round: "Round of 16",
      }),
    ]);

    await syncMatchResults({ finishedOnly: true });

    const arg = upsertMock.mock.calls[0]![0] as {
      create: { status: string; homeScore: number | null; awayScore: number | null };
    };
    expect(arg.create.status).toBe("SCHEDULED");
    expect(arg.create.homeScore).toBeNull();
    expect(arg.create.awayScore).toBeNull();
    expect(recalcMock).not.toHaveBeenCalled();
  });

  it("skips (does NOT abort) fixtures whose teams are still TBD/unresolvable", async () => {
    matchFindManyMock.mockResolvedValue([
      existingMatch({ status: "LIVE", homeScore: 1, awayScore: 0 }),
    ]);
    getFixturesMock.mockResolvedValue([
      // Unresolvable placeholder team — must be skipped, not throw.
      makeFixture({
        id: 3050,
        short: "NS",
        home: null,
        away: null,
        homeName: "Winner Match 74",
        awayName: "Winner Match 77",
        round: "Round of 16",
      }),
      // A real finished match should still be processed in the same run.
      makeFixture({ short: "FT", home: 2, away: 0 }),
    ]);

    await syncMatchResults({ finishedOnly: true });

    expect(upsertMock).not.toHaveBeenCalled(); // TBD one skipped, no create
    expect(updateMock).toHaveBeenCalledTimes(1); // the real one updated
  });
});
