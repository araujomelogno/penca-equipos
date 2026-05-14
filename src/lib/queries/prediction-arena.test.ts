import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/prediction-arena-scoring", () => ({
  calculateEventPoints: vi.fn(),
}));

import { getWeekBounds } from "./prediction-arena";

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
