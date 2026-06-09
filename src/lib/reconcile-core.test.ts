import { describe, it, expect } from "vitest";
import { planFixtureReconciliation } from "./reconcile-core";

const TEAMS = [
  { id: "t-arg", name: "Argentina", code: "ARG" },
  { id: "t-bra", name: "Brazil", code: "BRA" },
  { id: "t-usa", name: "United States", code: "USA" },
  { id: "t-cze", name: "Czechia", code: "CZE" },
];

// Our seeded match: Argentina (home) vs Brazil (away)
const MATCHES = [
  { id: "m-1", homeTeamId: "t-arg", awayTeamId: "t-bra" },
  { id: "m-2", homeTeamId: "t-usa", awayTeamId: "t-cze" },
];

function fixture(overrides: {
  id: number;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  short: string;
  date?: string;
}) {
  return {
    fixture: {
      id: overrides.id,
      date: overrides.date ?? "2026-06-14T04:00:00+00:00",
      status: { short: overrides.short },
    },
    teams: {
      home: { name: overrides.homeName },
      away: { name: overrides.awayName },
    },
    goals: { home: overrides.homeGoals, away: overrides.awayGoals },
  };
}

describe("planFixtureReconciliation", () => {
  it("matches a fixture and maps the real id + score (same orientation)", () => {
    const plan = planFixtureReconciliation(
      fixture({ id: 999001, homeName: "Argentina", awayName: "Brazil", homeGoals: 2, awayGoals: 1, short: "FT" }),
      TEAMS,
      MATCHES,
    );
    expect(plan).toEqual({
      status: "matched",
      matchId: "m-1",
      apiFootballId: 999001,
      kickoffTime: "2026-06-14T04:00:00+00:00",
      homeScore: 2,
      awayScore: 1,
      matchStatus: "FINISHED",
    });
  });

  it("swaps the score when the API lists home/away in the opposite orientation", () => {
    // API says Brazil 1 - 2 Argentina, but our match is Argentina(home) vs Brazil(away)
    const plan = planFixtureReconciliation(
      fixture({ id: 999001, homeName: "Brazil", awayName: "Argentina", homeGoals: 1, awayGoals: 2, short: "FT" }),
      TEAMS,
      MATCHES,
    );
    expect(plan).toEqual({
      status: "matched",
      matchId: "m-1",
      apiFootballId: 999001,
      kickoffTime: "2026-06-14T04:00:00+00:00",
      homeScore: 2, // Argentina is OUR home
      awayScore: 1, // Brazil is OUR away
      matchStatus: "FINISHED",
    });
  });

  it("carries the API kickoff time (source of truth for the schedule)", () => {
    const plan = planFixtureReconciliation(
      fixture({
        id: 999001,
        homeName: "Argentina",
        awayName: "Brazil",
        homeGoals: null,
        awayGoals: null,
        short: "NS",
        date: "2026-06-21T19:30:00+00:00",
      }),
      TEAMS,
      MATCHES,
    );
    expect(plan).toMatchObject({ status: "matched", kickoffTime: "2026-06-21T19:30:00+00:00" });
  });

  it("resolves API aliases when matching teams (USA, Czech Republic)", () => {
    const plan = planFixtureReconciliation(
      fixture({ id: 999002, homeName: "USA", awayName: "Czech Republic", homeGoals: 0, awayGoals: 0, short: "1H" }),
      TEAMS,
      MATCHES,
    );
    expect(plan).toMatchObject({ status: "matched", matchId: "m-2", matchStatus: "LIVE" });
  });

  it("carries null goals for unplayed fixtures", () => {
    const plan = planFixtureReconciliation(
      fixture({ id: 999001, homeName: "Argentina", awayName: "Brazil", homeGoals: null, awayGoals: null, short: "NS" }),
      TEAMS,
      MATCHES,
    );
    expect(plan).toMatchObject({ status: "matched", homeScore: null, awayScore: null, matchStatus: "SCHEDULED" });
  });

  it("reports unmatched-team when a team name cannot be resolved", () => {
    const plan = planFixtureReconciliation(
      fixture({ id: 999003, homeName: "Atlantis", awayName: "Brazil", homeGoals: null, awayGoals: null, short: "NS" }),
      TEAMS,
      MATCHES,
    );
    expect(plan).toEqual({ status: "unmatched-team", unresolved: ["Atlantis"] });
  });

  it("reports unmatched-fixture when both teams resolve but no DB match has that pair", () => {
    const plan = planFixtureReconciliation(
      fixture({ id: 999004, homeName: "Argentina", awayName: "Czechia", homeGoals: null, awayGoals: null, short: "NS" }),
      TEAMS,
      MATCHES,
    );
    expect(plan).toEqual({ status: "unmatched-fixture", homeCode: "ARG", awayCode: "CZE" });
  });
});
