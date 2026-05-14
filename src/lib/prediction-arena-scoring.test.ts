import { describe, it, expect } from "vitest";
import { calculateEventPoints } from "./prediction-arena-scoring";

describe("calculateEventPoints", () => {
  it("returns 1 when predicted no-happen and event did not happen", () => {
    expect(
      calculateEventPoints(
        { teamId: null },
        { result: "NO_HAPPENED", resultTeamId: null },
      ),
    ).toBe(1);
  });

  it("returns 0 when predicted no-happen but event happened", () => {
    expect(
      calculateEventPoints(
        { teamId: null },
        { result: "HAPPENED", resultTeamId: "team-1" },
      ),
    ).toBe(0);
  });

  it("returns 0 when predicted a team but event did not happen", () => {
    expect(
      calculateEventPoints(
        { teamId: "team-1" },
        { result: "NO_HAPPENED", resultTeamId: null },
      ),
    ).toBe(0);
  });

  it("returns 2 when predicted a team, event happened with different team", () => {
    expect(
      calculateEventPoints(
        { teamId: "team-1" },
        { result: "HAPPENED", resultTeamId: "team-2" },
      ),
    ).toBe(2);
  });

  it("returns 5 when predicted correct team", () => {
    expect(
      calculateEventPoints(
        { teamId: "team-1" },
        { result: "HAPPENED", resultTeamId: "team-1" },
      ),
    ).toBe(5);
  });

  it("returns 0 when event is not resolved yet", () => {
    expect(
      calculateEventPoints(
        { teamId: "team-1" },
        { result: null, resultTeamId: null },
      ),
    ).toBe(0);
  });
});
