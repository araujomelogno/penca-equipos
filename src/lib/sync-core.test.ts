import { describe, it, expect } from "vitest";
import { planFixtureSync } from "./sync-core";
import type { SyncTeam, SyncMatch, SyncFixtureInput } from "./sync-core";

const TEAMS: SyncTeam[] = [
  { id: "t-esp", name: "Spain", code: "ESP" },
  { id: "t-cro", name: "Croatia", code: "CRO" },
  { id: "t-usa", name: "United States", code: "USA" },
  { id: "t-par", name: "Paraguay", code: "PAR" },
];

// Existing seeded group matches (our home/away orientation).
const MATCHES: SyncMatch[] = [
  { id: "m-esp-cro", homeTeamId: "t-esp", awayTeamId: "t-cro", stage: "GROUP" },
  { id: "m-usa-par", homeTeamId: "t-usa", awayTeamId: "t-par", stage: "GROUP" },
];

function fx(o: {
  id: number;
  round: string;
  home: string;
  away: string;
  gh?: number | null;
  ga?: number | null;
  status?: string;
  venue?: { name: string; city: string | null } | null;
  date?: string;
}): SyncFixtureInput {
  return {
    fixture: {
      id: o.id,
      date: o.date ?? "2026-06-29T19:00:00Z",
      venue: o.venue === undefined ? { name: "SoFi Stadium", city: "Inglewood" } : o.venue,
      status: { short: o.status ?? "NS" },
    },
    league: { round: o.round },
    teams: { home: { name: o.home }, away: { name: o.away } },
    goals: { home: o.gh ?? null, away: o.ga ?? null },
  };
}

describe("planFixtureSync", () => {
  it("flags unmatched teams (fail-closed) without inventing anything", () => {
    const plan = planFixtureSync(
      fx({ id: 1, round: "Round of 32", home: "Wakanda", away: "Spain" }),
      TEAMS,
      MATCHES,
    );
    expect(plan.status).toBe("unmatched-team");
    if (plan.status === "unmatched-team") {
      expect(plan.unresolved).toContain("Wakanda");
      expect(plan.unresolved).not.toContain("Spain");
    }
  });

  it("CREATES a new R32 match with existing team ids (never creates teams)", () => {
    const plan = planFixtureSync(
      fx({ id: 9001, round: "Round of 32", home: "Spain", away: "Croatia" }),
      TEAMS,
      MATCHES,
    );
    expect(plan.status).toBe("create");
    if (plan.status === "create") {
      expect(plan.apiFootballId).toBe(9001);
      expect(plan.homeTeamId).toBe("t-esp");
      expect(plan.awayTeamId).toBe("t-cro");
      expect(plan.stage).toBe("R32");
      expect(plan.group).toBeNull();
    }
  });

  it("does NOT confuse an R32 rematch with the existing GROUP match (stage+pair)", () => {
    // Spain vs Croatia exists as GROUP; the R32 fixture must CREATE, not update.
    const plan = planFixtureSync(
      fx({ id: 9002, round: "Round of 32", home: "Croatia", away: "Spain" }),
      TEAMS,
      MATCHES,
    );
    expect(plan.status).toBe("create");
  });

  it("UPDATES an existing group match and keeps our home/away orientation", () => {
    const plan = planFixtureSync(
      fx({ id: 555, round: "Group Stage - 3", home: "Spain", away: "Croatia", gh: 2, ga: 1, status: "FT" }),
      TEAMS,
      MATCHES,
    );
    expect(plan.status).toBe("update");
    if (plan.status === "update") {
      expect(plan.matchId).toBe("m-esp-cro");
      expect(plan.apiFootballId).toBe(555);
      expect(plan.homeScore).toBe(2);
      expect(plan.awayScore).toBe(1);
      expect(plan.matchStatus).toBe("FINISHED");
    }
  });

  it("orients the score when API lists the fixture in the opposite order", () => {
    // API: Croatia (home) 1 - 2 Spain (away). Our match is Spain(home) vs Croatia(away).
    const plan = planFixtureSync(
      fx({ id: 556, round: "Group Stage - 3", home: "Croatia", away: "Spain", gh: 1, ga: 2, status: "FT" }),
      TEAMS,
      MATCHES,
    );
    expect(plan.status).toBe("update");
    if (plan.status === "update") {
      expect(plan.matchId).toBe("m-esp-cro");
      expect(plan.homeScore).toBe(2); // Spain (our home)
      expect(plan.awayScore).toBe(1); // Croatia (our away)
    }
  });

  it("resolves API name aliases (USA -> United States)", () => {
    const plan = planFixtureSync(
      fx({ id: 557, round: "Group Stage - 1", home: "USA", away: "Paraguay", gh: 1, ga: 0, status: "FT" }),
      TEAMS,
      MATCHES,
    );
    expect(plan.status).toBe("update");
    if (plan.status === "update") expect(plan.matchId).toBe("m-usa-par");
  });

  it("formats venue, and tolerates a missing venue", () => {
    const withVenue = planFixtureSync(
      fx({ id: 9003, round: "Round of 32", home: "Spain", away: "Croatia" }),
      TEAMS,
      MATCHES,
    );
    const noVenue = planFixtureSync(
      fx({ id: 9004, round: "Round of 32", home: "Spain", away: "Croatia", venue: null }),
      TEAMS,
      MATCHES,
    );
    if (withVenue.status === "create") expect(withVenue.venue).toBe("SoFi Stadium, Inglewood");
    if (noVenue.status === "create") expect(noVenue.venue).toBeNull();
  });

  it("omits a null city instead of writing 'Name, null' (API returns null city for many US venues)", () => {
    const plan = planFixtureSync(
      fx({ id: 9005, round: "Round of 32", home: "Spain", away: "Croatia", venue: { name: "SoFi Stadium", city: null } }),
      TEAMS,
      MATCHES,
    );
    if (plan.status === "create") expect(plan.venue).toBe("SoFi Stadium");
  });
});
