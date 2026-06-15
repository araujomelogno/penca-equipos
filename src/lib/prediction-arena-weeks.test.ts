import { describe, it, expect } from "vitest";
import { buildWeekOptions, mapWeekForView } from "./prediction-arena-weeks";

describe("buildWeekOptions", () => {
  it("returns an empty list when there is no current week and no history", () => {
    expect(buildWeekOptions(null, [])).toEqual([]);
  });

  it("includes the current open week not present in history and flags it", () => {
    const options = buildWeekOptions(
      { id: "w3", weekNumber: 3, status: "OPEN", nostradamus: null },
      [
        { id: "w2", weekNumber: 2, nostradamus: { nickname: "Lali" } },
        { id: "w1", weekNumber: 1, nostradamus: { nickname: "Ana" } },
      ],
    );
    expect(options.map((o) => o.id)).toEqual(["w3", "w2", "w1"]);
    expect(options[0]).toMatchObject({ id: "w3", status: "OPEN", isCurrent: true, nostradamusNickname: null });
    expect(options[1]).toMatchObject({ id: "w2", status: "RESOLVED", isCurrent: false, nostradamusNickname: "Lali" });
  });

  it("does not duplicate a current week that is already resolved, but flags it", () => {
    const options = buildWeekOptions(
      { id: "w2", weekNumber: 2, status: "RESOLVED", nostradamus: { nickname: "Lali" } },
      [
        { id: "w2", weekNumber: 2, nostradamus: { nickname: "Lali" } },
        { id: "w1", weekNumber: 1, nostradamus: { nickname: "Ana" } },
      ],
    );
    expect(options).toHaveLength(2);
    const w2 = options.find((o) => o.id === "w2")!;
    expect(w2.isCurrent).toBe(true);
    expect(w2.status).toBe("RESOLVED");
  });

  it("sorts strictly by weekNumber descending", () => {
    const options = buildWeekOptions(null, [
      { id: "w1", weekNumber: 1, nostradamus: null },
      { id: "w5", weekNumber: 5, nostradamus: null },
      { id: "w3", weekNumber: 3, nostradamus: null },
    ]);
    expect(options.map((o) => o.weekNumber)).toEqual([5, 3, 1]);
  });
});

describe("mapWeekForView", () => {
  it("collapses the predictions array into userPrediction (first row)", () => {
    const pred = { id: "p1", teamId: "t1", points: 5 };
    const week = {
      id: "w1",
      weekNumber: 1,
      events: [
        { id: "e1", title: "First red card", predictions: [pred] },
        { id: "e2", title: "Hat-trick", predictions: [] },
      ],
    };
    const mapped = mapWeekForView(week);
    expect(mapped.id).toBe("w1");
    expect(mapped.events[0]).toMatchObject({ id: "e1", title: "First red card", userPrediction: pred });
    expect("predictions" in mapped.events[0]).toBe(false);
    expect(mapped.events[1].userPrediction).toBeNull();
  });
});
