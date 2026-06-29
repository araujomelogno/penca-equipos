import { describe, it, expect } from "vitest";
import { R32_ANALYSIS, R32_PAIRS } from "./r32-analysis-content";

describe("R32 curated analysis content", () => {
  it("lists exactly the 16 known R32 pairings", () => {
    expect(R32_PAIRS).toHaveLength(16);
    expect(new Set(R32_PAIRS).size).toBe(16);
  });

  it("has an entry for every R32 pair", () => {
    for (const pair of R32_PAIRS) {
      expect(R32_ANALYSIS[pair], `missing entry for ${pair}`).toBeDefined();
    }
  });

  it("has no entries that are not real R32 pairs", () => {
    const known = new Set<string>(R32_PAIRS);
    for (const key of Object.keys(R32_ANALYSIS)) {
      expect(known.has(key), `unexpected entry ${key}`).toBe(true);
    }
  });

  it("has non-empty es and en text for every entry", () => {
    for (const [pair, t] of Object.entries(R32_ANALYSIS)) {
      expect(t.es.trim().length, `empty es for ${pair}`).toBeGreaterThan(20);
      expect(t.en.trim().length, `empty en for ${pair}`).toBeGreaterThan(20);
    }
  });
});
