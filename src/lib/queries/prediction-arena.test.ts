import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { team: { findMany: (...args: unknown[]) => findManyMock(...args) } } }));
vi.mock("@/lib/prediction-arena-scoring", () => ({
  calculateEventPoints: vi.fn(),
}));

import { getWeekBounds, getArenaTeams } from "./prediction-arena";

describe("getWeekBounds", () => {
  it("returns Monday-Sunday for a Wednesday", () => {
    const wed = new Date("2026-06-17T12:00:00Z"); // Wednesday
    const { weekStart, weekEnd } = getWeekBounds(wed);

    expect(weekStart.getUTCDay()).toBe(1); // Monday
    expect(weekStart.toISOString().slice(0, 10)).toBe("2026-06-15");

    expect(weekEnd.getUTCDay()).toBe(0); // Sunday
    expect(weekEnd.toISOString().slice(0, 10)).toBe("2026-06-21");
    expect(weekEnd.getUTCHours()).toBe(23);
    expect(weekEnd.getUTCMinutes()).toBe(59);
  });

  it("returns correct bounds for a Monday", () => {
    const mon = new Date("2026-06-15T08:00:00Z"); // Monday
    const { weekStart } = getWeekBounds(mon);

    expect(weekStart.toISOString().slice(0, 10)).toBe("2026-06-15");
  });

  it("returns correct bounds for a Sunday", () => {
    const sun = new Date("2026-06-21T20:00:00Z"); // Sunday
    const { weekStart, weekEnd } = getWeekBounds(sun);

    expect(weekStart.toISOString().slice(0, 10)).toBe("2026-06-15");
    expect(weekEnd.toISOString().slice(0, 10)).toBe("2026-06-21");
  });

  it("handles Saturday correctly", () => {
    const sat = new Date("2026-06-20T15:00:00Z"); // Saturday
    const { weekStart } = getWeekBounds(sat);

    expect(weekStart.toISOString().slice(0, 10)).toBe("2026-06-15");
  });
});

describe("getArenaTeams", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("only returns teams with a match inside the week window", async () => {
    const weekStart = new Date("2026-06-15T00:00:00Z");
    const weekEnd = new Date("2026-06-21T23:59:59.999Z");
    const teams = [{ id: "t1", name: "Argentina", code: "ARG", flagUrl: null }];
    findManyMock.mockResolvedValue(teams);

    const result = await getArenaTeams(weekStart, weekEnd);

    expect(result).toBe(teams);
    expect(findManyMock).toHaveBeenCalledTimes(1);
    const args = findManyMock.mock.calls[0][0];
    // Filters by home OR away matches with kickoff inside [weekStart, weekEnd]
    expect(args.where.OR).toEqual([
      { homeMatches: { some: { kickoffTime: { gte: weekStart, lte: weekEnd } } } },
      { awayMatches: { some: { kickoffTime: { gte: weekStart, lte: weekEnd } } } },
    ]);
    // Keeps the same shape the dropdown needs, alphabetical
    expect(args.select).toEqual({ id: true, name: true, code: true, flagUrl: true });
    expect(args.orderBy).toEqual({ name: "asc" });
  });
});
