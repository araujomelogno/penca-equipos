import { describe, it, expect, vi, afterEach } from "vitest";
import { calcTimeLeft } from "./CountdownCard";

describe("calcTimeLeft", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns correct breakdown for a future date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00Z"));

    const result = calcTimeLeft("2026-06-11T12:30:00Z");
    expect(result.days).toBe(1);
    expect(result.hours).toBe(12);
    expect(result.minutes).toBe(30);
    expect(result.seconds).toBe(0);
  });

  it("returns all zeros for a past date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));

    const result = calcTimeLeft("2026-06-10T00:00:00Z");
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("returns all zeros for the exact current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));

    const result = calcTimeLeft("2026-06-11T12:00:00Z");
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("handles large time differences", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const result = calcTimeLeft("2026-06-11T00:00:00Z");
    expect(result.days).toBe(161);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });
});
