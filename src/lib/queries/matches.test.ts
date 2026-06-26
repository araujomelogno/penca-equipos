import { describe, it, expect, vi } from "vitest";

// Mock prisma before importing the module
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildDatePills, groupByDate, buildFilteredWhere, resolveDateFilter } from "./matches";
import type { MatchCardData } from "./matches";
import { presumedFinishedOrWhere } from "../match-state";

describe("resolveDateFilter", () => {
  const today = "2026-06-17";

  it("defaults to today when no date param is present", () => {
    expect(resolveDateFilter(undefined, today)).toBe(today);
  });

  it("returns undefined (show all) for the 'all' sentinel", () => {
    expect(resolveDateFilter("all", today)).toBeUndefined();
  });

  it("passes through an explicit date", () => {
    expect(resolveDateFilter("2026-06-20", today)).toBe("2026-06-20");
  });
});

describe("buildDatePills", () => {
  it("returns empty array for empty dates", () => {
    expect(buildDatePills([])).toEqual([]);
  });

  it("returns up to 4 pills from available dates", () => {
    const dates = ["2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14", "2026-06-15"];
    const pills = buildDatePills(dates, "2026-06-13");
    expect(pills.length).toBeLessThanOrEqual(4);
  });

  it("centers around selected date", () => {
    const dates = ["2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14"];
    const pills = buildDatePills(dates, "2026-06-12");
    const pillDates = pills.map((p) => p.date);
    expect(pillDates).toContain("2026-06-12");
  });

  it("includes dayOfWeek, dayOfMonth, and month", () => {
    const pills = buildDatePills(["2026-06-11"]);
    expect(pills[0]).toMatchObject({
      date: "2026-06-11",
      dayOfMonth: 11,
      month: "JUN",
    });
    expect(pills[0].dayOfWeek).toBeTruthy();
  });

  it("handles single date", () => {
    const pills = buildDatePills(["2026-06-11"]);
    expect(pills).toHaveLength(1);
    expect(pills[0].date).toBe("2026-06-11");
  });

  it("fills from available dates when fewer than 4 around center", () => {
    const dates = ["2026-06-11", "2026-06-12"];
    const pills = buildDatePills(dates, "2026-06-11");
    expect(pills).toHaveLength(2);
  });
});

describe("groupByDate", () => {
  const makeMatch = (date: string, id: string): MatchCardData => ({
    id,
    kickoffTime: new Date(date + "T15:00:00Z"),
    stage: "GROUP",
    group: "A",
    venue: null,
    status: "SCHEDULED",
    homeTeam: { name: "Team A", code: "TA", flagUrl: null },
    awayTeam: { name: "Team B", code: "TB", flagUrl: null },
    homeScore: null,
    awayScore: null,
    userPrediction: null,
    userPoints: null,
    stats: { totalPredictions: 0, exactCount: 0, correctWinnerCount: 0, avgHomeScore: null, avgAwayScore: null },
  });

  it("returns empty array for no matches", () => {
    expect(groupByDate([])).toEqual([]);
  });

  it("groups matches by date", () => {
    const matches = [
      makeMatch("2026-06-11", "1"),
      makeMatch("2026-06-11", "2"),
      makeMatch("2026-06-12", "3"),
    ];
    const groups = groupByDate(matches);
    expect(groups).toHaveLength(2);
    expect(groups[0].matches).toHaveLength(2);
    expect(groups[1].matches).toHaveLength(1);
  });

  it("sorts groups by date ascending", () => {
    const matches = [
      makeMatch("2026-06-14", "1"),
      makeMatch("2026-06-11", "2"),
    ];
    const groups = groupByDate(matches);
    expect(groups[0].dateKey).toBe("2026-06-11");
    expect(groups[1].dateKey).toBe("2026-06-14");
  });

  it("formats dateLabel with day name and month", () => {
    const matches = [makeMatch("2026-06-11", "1")];
    const groups = groupByDate(matches);
    expect(groups[0].dateLabel).toMatch(/\w+ JUN 11/);
  });

  it("groups a midnight-UTC kickoff under the previous day in Uruguay (UTC-3)", () => {
    const m = makeMatch("2026-06-10", "x");
    m.kickoffTime = new Date("2026-06-10T00:00:00Z"); // 2026-06-09 21:00 in UY
    const groups = groupByDate([m], "America/Montevideo");
    expect(groups[0].dateKey).toBe("2026-06-09");
  });
});

describe("buildFilteredWhere", () => {
  const NOW = new Date("2026-06-15T20:00:00Z");
  const TZ = "America/Montevideo";

  it("matches presumed-finished (status or kickoff cutoff) for the FINISHED filter", () => {
    const where = buildFilteredWhere({ status: "FINISHED" }, TZ, NOW);
    expect(where.OR).toEqual(presumedFinishedOrWhere(NOW));
    expect(where.status).toBeUndefined();
  });

  it("maps ONGOING to live/halftime statuses", () => {
    const where = buildFilteredWhere({ status: "ONGOING" }, TZ, NOW);
    expect(where.status).toEqual({ in: ["LIVE", "HALFTIME"] });
    expect(where.OR).toBeUndefined();
  });

  it("passes other statuses through unchanged", () => {
    const where = buildFilteredWhere({ status: "SCHEDULED" }, TZ, NOW);
    expect(where.status).toBe("SCHEDULED");
  });

  it("applies no status constraint for ALL", () => {
    const where = buildFilteredWhere({ status: "ALL" }, TZ, NOW);
    expect(where.status).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });

  it("keeps the stage filter alongside the status filter", () => {
    const where = buildFilteredWhere({ status: "FINISHED", stage: "R16" }, TZ, NOW);
    expect(where.stage).toBe("R16");
    expect(where.OR).toEqual(presumedFinishedOrWhere(NOW));
  });
});
