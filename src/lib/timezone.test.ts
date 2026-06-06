import { describe, it, expect } from "vitest";
import { isValidTimeZone, instantToDateKey, dayRangeUtc, todayDateKey } from "./timezone";

describe("isValidTimeZone", () => {
  it("accepts a valid IANA zone", () => {
    expect(isValidTimeZone("America/Montevideo")).toBe(true);
  });
  it("rejects garbage", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("instantToDateKey", () => {
  it("returns the local calendar day in the given TZ", () => {
    const instant = new Date("2026-06-10T00:00:00Z");
    expect(instantToDateKey(instant, "America/Montevideo")).toBe("2026-06-09");
    expect(instantToDateKey(instant, "Asia/Tokyo")).toBe("2026-06-10");
    expect(instantToDateKey(instant, "UTC")).toBe("2026-06-10");
  });
  it("keeps midday kickoffs on the same day", () => {
    const instant = new Date("2026-06-11T15:00:00Z");
    expect(instantToDateKey(instant, "America/Montevideo")).toBe("2026-06-11");
  });
});

describe("dayRangeUtc", () => {
  it("bounds a Montevideo calendar day in UTC", () => {
    const { start, end } = dayRangeUtc("2026-06-10", "America/Montevideo");
    expect(start.toISOString()).toBe("2026-06-10T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-11T02:59:59.999Z");
  });
});

describe("todayDateKey", () => {
  it("matches instantToDateKey(now)", () => {
    const tz = "America/Montevideo";
    expect(todayDateKey(tz)).toBe(instantToDateKey(new Date(), tz));
  });
});
