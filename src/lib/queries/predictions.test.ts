import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildGroupTabs, assemblePredictionsData } from "./predictions";

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

describe("assemblePredictionsData", () => {
  const team = (code: string) => ({ name: code, code, flagUrl: null });
  const now = new Date("2026-06-10T00:00:00Z");

  const rows = [
    { id: "g1", kickoffTime: new Date("2026-06-11T19:00:00Z"), stage: "GROUP", group: "A", homeTeam: team("MEX"), awayTeam: team("RSA") },
    { id: "g2", kickoffTime: new Date("2026-06-11T22:00:00Z"), stage: "GROUP", group: "A", homeTeam: team("KOR"), awayTeam: team("CZE") },
    { id: "k1", kickoffTime: new Date("2026-06-29T19:00:00Z"), stage: "R32", group: null, homeTeam: team("ESP"), awayTeam: team("URU") },
  ];

  it("creates a knockout section + tab exposing the stage code (UI translates it)", () => {
    const data = assemblePredictionsData(rows, new Map(), now);

    const r32 = data.allGroups.find((s) => s.name === "R32");
    expect(r32).toBeDefined();
    expect(r32!.matches).toHaveLength(1);
    // No baked-in English label: client components translate from the stage code
    expect(r32).not.toHaveProperty("headerLabel", "Round of 32");

    expect(data.groupTabs).toContainEqual({ label: "R32", groups: ["R32"], stage: "R32" });
    expect(data.individualTabs).toContainEqual({ label: "R32", groups: ["R32"], stage: "R32" });
  });

  it("orders knockout sections after groups, in bracket order", () => {
    const data = assemblePredictionsData(rows, new Map(), now);
    const names = data.allGroups.map((s) => s.name);
    expect(names).toEqual(["A", "R32"]);
  });

  it("counts knockout matches in the progress total", () => {
    const data = assemblePredictionsData(rows, new Map(), now);
    expect(data.progress.total).toBe(3); // 2 group + 1 knockout, all future
  });

  it("group tabs carry no stage code (only knockout tabs translate as rounds)", () => {
    const data = assemblePredictionsData(rows, new Map(), now);
    const groupTab = data.individualTabs.find((t) => t.groups.includes("A"));
    expect(groupTab).toBeDefined();
    expect(groupTab!.stage).toBeUndefined();
  });

  it("puts the active knockout round first so it is preselected (desktop + mobile)", () => {
    const data = assemblePredictionsData(rows, new Map(), now);
    expect(data.groupTabs[0]).toEqual({ label: "R32", groups: ["R32"], stage: "R32" });
    expect(data.individualTabs[0]).toEqual({ label: "R32", groups: ["R32"], stage: "R32" });
  });

  it("keeps section order unchanged (groups before knockout)", () => {
    const data = assemblePredictionsData(rows, new Map(), now);
    expect(data.allGroups.map((s) => s.name)).toEqual(["A", "R32"]);
  });

  it("falls back to the first group when no knockout round is loaded", () => {
    const groupOnly = rows.filter((r) => r.stage === "GROUP");
    const data = assemblePredictionsData(groupOnly, new Map(), now);
    expect(data.groupTabs[0].stage).toBeUndefined();
    expect(data.groupTabs[0].groups).toContain("A");
    expect(data.individualTabs[0].groups).toEqual(["A"]);
  });

  it("advances dynamically: R16 active once R32 is fully played", () => {
    const advanced = [
      ...rows.filter((r) => r.stage === "GROUP"),
      // R32 already kicked off (in the past)
      { id: "r32a", kickoffTime: new Date("2026-06-29T19:00:00Z"), stage: "R32", group: null, homeTeam: team("ESP"), awayTeam: team("URU") },
      // R16 still upcoming
      { id: "r16a", kickoffTime: new Date("2026-07-05T19:00:00Z"), stage: "R16", group: null, homeTeam: team("BRA"), awayTeam: team("ARG") },
    ];
    const later = new Date("2026-06-30T00:00:00Z"); // after R32, before R16
    const data = assemblePredictionsData(advanced, new Map(), later);
    expect(data.groupTabs[0].stage).toBe("R16");
    expect(data.individualTabs[0].stage).toBe("R16");
  });

  it("when all knockout matches have started, keeps the most advanced loaded round active", () => {
    const allStarted = [
      ...rows.filter((r) => r.stage === "GROUP"),
      { id: "r32a", kickoffTime: new Date("2026-06-29T19:00:00Z"), stage: "R32", group: null, homeTeam: team("ESP"), awayTeam: team("URU") },
      { id: "r16a", kickoffTime: new Date("2026-07-05T19:00:00Z"), stage: "R16", group: null, homeTeam: team("BRA"), awayTeam: team("ARG") },
    ];
    const afterAll = new Date("2026-07-06T00:00:00Z");
    const data = assemblePredictionsData(allStarted, new Map(), afterAll);
    expect(data.groupTabs[0].stage).toBe("R16");
  });
});
