import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { computeCommunityOdds, countByOutcome, computeBadges } from "./matchDetail";

describe("computeCommunityOdds", () => {
  it("returns zeros for empty predictions", () => {
    expect(computeCommunityOdds([])).toEqual({
      homeWin: 0,
      draw: 0,
      awayWin: 0,
      total: 0,
    });
  });

  it("100% home win when all predict home victory", () => {
    const predictions = [
      { homeScore: 2, awayScore: 0 },
      { homeScore: 3, awayScore: 1 },
      { homeScore: 1, awayScore: 0 },
    ];
    expect(computeCommunityOdds(predictions)).toEqual({
      homeWin: 100,
      draw: 0,
      awayWin: 0,
      total: 3,
    });
  });

  it("100% away win when all predict away victory", () => {
    const predictions = [
      { homeScore: 0, awayScore: 2 },
      { homeScore: 1, awayScore: 3 },
    ];
    expect(computeCommunityOdds(predictions)).toEqual({
      homeWin: 0,
      draw: 0,
      awayWin: 100,
      total: 2,
    });
  });

  it("splits evenly for mixed predictions", () => {
    const predictions = [
      { homeScore: 2, awayScore: 1 }, // home
      { homeScore: 1, awayScore: 1 }, // draw
      { homeScore: 0, awayScore: 1 }, // away
    ];
    expect(computeCommunityOdds(predictions)).toEqual({
      homeWin: 33,
      draw: 33,
      awayWin: 33,
      total: 3,
    });
  });

  it("handles 0-0 as draw", () => {
    const predictions = [{ homeScore: 0, awayScore: 0 }];
    expect(computeCommunityOdds(predictions)).toEqual({
      homeWin: 0,
      draw: 100,
      awayWin: 0,
      total: 1,
    });
  });

  it("rounds percentages correctly", () => {
    // 2 home, 1 away out of 3 = 67% home, 33% away
    const predictions = [
      { homeScore: 2, awayScore: 0 },
      { homeScore: 1, awayScore: 0 },
      { homeScore: 0, awayScore: 1 },
    ];
    expect(computeCommunityOdds(predictions)).toEqual({
      homeWin: 67,
      draw: 0,
      awayWin: 33,
      total: 3,
    });
  });
});

describe("countByOutcome", () => {
  it("counts home, draw, away correctly", () => {
    const predictions = [
      { homeScore: 2, awayScore: 0 },
      { homeScore: 1, awayScore: 1 },
      { homeScore: 0, awayScore: 3 },
      { homeScore: 3, awayScore: 1 },
    ];
    expect(countByOutcome(predictions)).toEqual({ home: 2, draw: 1, away: 1 });
  });

  it("returns zeros for empty predictions", () => {
    expect(countByOutcome([])).toEqual({ home: 0, draw: 0, away: 0 });
  });
});

describe("computeBadges", () => {
  const noProbs = { home: null, draw: null, away: null };

  it("returns lone_wolf when exactly 1 user predicted the outcome and total >= 3", () => {
    const outcomes = { home: 4, draw: 1, away: 0 };
    const badges = computeBadges("1-1", outcomes, 5, noProbs);
    expect(badges).toEqual(["lone_wolf"]);
  });

  it("does not return lone_wolf when total < 3", () => {
    const outcomes = { home: 1, draw: 1, away: 0 };
    const badges = computeBadges("1-1", outcomes, 2, noProbs);
    expect(badges).toEqual([]);
  });

  it("does not return lone_wolf when outcome count > 1", () => {
    const outcomes = { home: 2, draw: 2, away: 1 };
    const badges = computeBadges("1-1", outcomes, 5, noProbs);
    expect(badges).toEqual([]);
  });

  it("returns bold_call for an extremely unlikely scoreline (blowout)", () => {
    const outcomes = { home: 3, draw: 2, away: 0 };
    const probs = { home: 60, draw: 25, away: 15 };
    const badges = computeBadges("8-0", outcomes, 5, probs);
    expect(badges).toContain("bold_call");
  });

  it("does not return bold_call for a likely scoreline", () => {
    const outcomes = { home: 3, draw: 2, away: 0 };
    const probs = { home: 40, draw: 30, away: 30 };
    const badges = computeBadges("1-0", outcomes, 5, probs);
    expect(badges).not.toContain("bold_call");
  });

  it("does not return bold_call when probs are null", () => {
    const outcomes = { home: 3, draw: 2, away: 0 };
    const badges = computeBadges("8-0", outcomes, 5, noProbs);
    expect(badges).toEqual([]);
  });

  it("returns both badges when lone_wolf and bold_call apply", () => {
    // home outcome predicted by exactly 1 user (lone wolf) + an unlikely scoreline (bold)
    const outcomes = { home: 1, draw: 2, away: 2 };
    const probs = { home: 50, draw: 25, away: 25 };
    const badges = computeBadges("8-0", outcomes, 5, probs);
    expect(badges).toEqual(["lone_wolf", "bold_call"]);
  });

  it("identifies away win scores correctly", () => {
    const outcomes = { home: 4, draw: 0, away: 1 };
    const badges = computeBadges("0-2", outcomes, 5, noProbs);
    expect(badges).toEqual(["lone_wolf"]);
  });
});
