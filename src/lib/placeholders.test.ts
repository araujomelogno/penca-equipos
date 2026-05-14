import { describe, it, expect } from "vitest";
import { getChatPlaceholder, getReplyPlaceholder } from "./placeholders";

describe("getChatPlaceholder", () => {
  it("returns a non-empty string", () => {
    const result = getChatPlaceholder();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns different values over many calls (randomness)", () => {
    const results = new Set(Array.from({ length: 50 }, () => getChatPlaceholder()));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("getReplyPlaceholder", () => {
  it("returns a non-empty string", () => {
    const result = getReplyPlaceholder();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns different values over many calls (randomness)", () => {
    const results = new Set(Array.from({ length: 50 }, () => getReplyPlaceholder()));
    expect(results.size).toBeGreaterThan(1);
  });
});
