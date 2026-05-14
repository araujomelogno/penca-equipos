import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildGroupTabs } from "./predictions";

describe("buildGroupTabs", () => {
  it("returns empty array for no groups", () => {
    expect(buildGroupTabs([])).toEqual([]);
  });

  it("creates ranges of 3 groups", () => {
    const tabs = buildGroupTabs(["A", "B", "C", "D", "E", "F"]);
    expect(tabs).toEqual([
      { label: "A-C", groups: ["A", "B", "C"] },
      { label: "D-F", groups: ["D", "E", "F"] },
    ]);
  });

  it("handles remainder groups", () => {
    const tabs = buildGroupTabs(["A", "B", "C", "D"]);
    expect(tabs).toHaveLength(2);
    expect(tabs[1]).toEqual({ label: "D", groups: ["D"] });
  });

  it("handles single group", () => {
    const tabs = buildGroupTabs(["A"]);
    expect(tabs).toEqual([{ label: "A", groups: ["A"] }]);
  });

  it("handles two groups", () => {
    const tabs = buildGroupTabs(["A", "B"]);
    expect(tabs).toEqual([{ label: "A-B", groups: ["A", "B"] }]);
  });

  it("handles all 12 FIFA 2026 groups", () => {
    const groups = "ABCDEFGHIJKL".split("");
    const tabs = buildGroupTabs(groups);
    expect(tabs).toHaveLength(4);
    expect(tabs[0].label).toBe("A-C");
    expect(tabs[3].label).toBe("J-L");
  });
});
