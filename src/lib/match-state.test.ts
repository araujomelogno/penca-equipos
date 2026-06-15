import { describe, it, expect } from "vitest";

import {
  isLocked,
  isPresumedFinished,
  finishedMarginMs,
  presumedFinishedOrWhere,
  matchCardState,
  GROUP_FINISHED_MARGIN_MS,
  KNOCKOUT_FINISHED_MARGIN_MS,
} from "./match-state";

const NOW = new Date("2026-06-15T20:00:00Z");
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000);

describe("isLocked", () => {
  it("locks once kickoff has passed", () => {
    expect(isLocked({ kickoffTime: minutesAgo(1) }, NOW)).toBe(true);
  });

  it("is unlocked before kickoff", () => {
    expect(isLocked({ kickoffTime: minutesAgo(-1) }, NOW)).toBe(false);
  });

  it("locks exactly at kickoff", () => {
    expect(isLocked({ kickoffTime: NOW }, NOW)).toBe(true);
  });
});

describe("finishedMarginMs", () => {
  it("uses the group margin for GROUP", () => {
    expect(finishedMarginMs("GROUP")).toBe(GROUP_FINISHED_MARGIN_MS);
  });

  it("uses the knockout margin for knockout stages", () => {
    expect(finishedMarginMs("R16")).toBe(KNOCKOUT_FINISHED_MARGIN_MS);
    expect(finishedMarginMs("FINAL")).toBe(KNOCKOUT_FINISHED_MARGIN_MS);
  });
});

describe("isPresumedFinished", () => {
  it("is finished when status is already FINISHED", () => {
    expect(
      isPresumedFinished({ kickoffTime: minutesAgo(-60), status: "FINISHED", stage: "GROUP" }, NOW),
    ).toBe(true);
  });

  it("presumes a GROUP match finished past the 2h margin even if status lags", () => {
    expect(
      isPresumedFinished({ kickoffTime: minutesAgo(150), status: "SCHEDULED", stage: "GROUP" }, NOW),
    ).toBe(true);
  });

  it("does NOT presume an in-progress GROUP match finished (AC#4)", () => {
    expect(
      isPresumedFinished({ kickoffTime: minutesAgo(30), status: "LIVE", stage: "GROUP" }, NOW),
    ).toBe(false);
  });

  it("does NOT presume a GROUP match finished within the 2h margin", () => {
    expect(
      isPresumedFinished({ kickoffTime: minutesAgo(119), status: "SCHEDULED", stage: "GROUP" }, NOW),
    ).toBe(false);
  });

  it("keeps a knockout match in-progress within the 2.5h margin", () => {
    expect(
      isPresumedFinished({ kickoffTime: minutesAgo(135), status: "LIVE", stage: "R16" }, NOW),
    ).toBe(false);
  });

  it("presumes a knockout match finished past the 2.5h margin", () => {
    expect(
      isPresumedFinished({ kickoffTime: minutesAgo(180), status: "SCHEDULED", stage: "R16" }, NOW),
    ).toBe(true);
  });

  it("never presumes POSTPONED finished by date (AC#5)", () => {
    expect(
      isPresumedFinished({ kickoffTime: minutesAgo(300), status: "POSTPONED", stage: "GROUP" }, NOW),
    ).toBe(false);
  });

  it("never presumes CANCELLED finished by date (AC#5)", () => {
    expect(
      isPresumedFinished({ kickoffTime: minutesAgo(300), status: "CANCELLED", stage: "R16" }, NOW),
    ).toBe(false);
  });
});

describe("matchCardState", () => {
  it("shows results when finished", () => {
    expect(
      matchCardState({ kickoffTime: minutesAgo(200), status: "FINISHED", stage: "GROUP" }, NOW),
    ).toBe("finished");
  });

  it("is editable before kickoff while scheduled", () => {
    expect(
      matchCardState({ kickoffTime: minutesAgo(-30), status: "SCHEDULED", stage: "GROUP" }, NOW),
    ).toBe("editable");
  });

  it("is awaiting (read-only) once kickoff passed but status still SCHEDULED (AC#1)", () => {
    expect(
      matchCardState({ kickoffTime: minutesAgo(20), status: "SCHEDULED", stage: "GROUP" }, NOW),
    ).toBe("awaiting");
  });

  it("is ongoing while live", () => {
    expect(
      matchCardState({ kickoffTime: minutesAgo(30), status: "LIVE", stage: "GROUP" }, NOW),
    ).toBe("ongoing");
  });

  it("is ongoing at halftime", () => {
    expect(
      matchCardState({ kickoffTime: minutesAgo(50), status: "HALFTIME", stage: "GROUP" }, NOW),
    ).toBe("ongoing");
  });
});

describe("presumedFinishedOrWhere", () => {
  it("builds an OR with FINISHED plus per-stage kickoff cutoffs", () => {
    const or = presumedFinishedOrWhere(NOW);
    expect(or).toEqual([
      { status: "FINISHED" },
      {
        stage: "GROUP",
        status: { notIn: ["POSTPONED", "CANCELLED"] },
        kickoffTime: { lt: new Date(NOW.getTime() - GROUP_FINISHED_MARGIN_MS) },
      },
      {
        stage: { in: ["R32", "R16", "QF", "SF", "FINAL"] },
        status: { notIn: ["POSTPONED", "CANCELLED"] },
        kickoffTime: { lt: new Date(NOW.getTime() - KNOCKOUT_FINISHED_MARGIN_MS) },
      },
    ]);
  });
});
