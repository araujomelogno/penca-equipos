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
