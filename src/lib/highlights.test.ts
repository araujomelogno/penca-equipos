import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildRankMap, startOfDayUTC, nuggetDedupeKey } from "./highlights";
import type { HighlightNugget } from "./highlight-templates";

describe("buildRankMap", () => {
  const userIds = new Set(["u1", "u2", "u3"]);

  it("ranks users by total points descending", () => {
    const predictions = [
      { userId: "u1", points: 5 },
      { userId: "u1", points: 3 },
      { userId: "u2", points: 5 },
      { userId: "u2", points: 5 },
      { userId: "u3", points: 3 },
    ];
    const ranks = buildRankMap(predictions, userIds);

    expect(ranks.get("u2")!.rank).toBe(1); // 10pts
    expect(ranks.get("u1")!.rank).toBe(2); // 8pts
    expect(ranks.get("u3")!.rank).toBe(3); // 3pts
  });

  it("breaks ties by exact scores", () => {
    const predictions = [
      { userId: "u1", points: 5 },
      { userId: "u1", points: 3 },
      { userId: "u2", points: 3 },
      { userId: "u2", points: 5 },
    ];
    // Both have 8pts, both have 1 exact — should be tied at same rank order
    const ranks = buildRankMap(predictions, userIds);
    expect(ranks.get("u1")!.totalPoints).toBe(8);
    expect(ranks.get("u2")!.totalPoints).toBe(8);
  });

  it("includes users with no predictions at bottom", () => {
    const predictions = [{ userId: "u1", points: 5 }];
    const ranks = buildRankMap(predictions, userIds);
    expect(ranks.get("u1")!.rank).toBe(1);
    // u2 and u3 have 0 points, ranked 2 and 3
    expect(ranks.get("u2")!.totalPoints).toBe(0);
    expect(ranks.get("u3")!.totalPoints).toBe(0);
  });

  it("returns empty for no users", () => {
    const ranks = buildRankMap([], new Set());
    expect(ranks.size).toBe(0);
  });
});

describe("startOfDayUTC", () => {
  it("zeroes out time components", () => {
    const d = startOfDayUTC(new Date("2026-06-12T15:30:00Z"));
    expect(d.toISOString()).toBe("2026-06-12T00:00:00.000Z");
  });
});

describe("nuggetDedupeKey", () => {
  const date = new Date("2026-05-09T00:00:00Z");
  const nugget = (overrides: Partial<HighlightNugget>): HighlightNugget => ({
    type: "all_predicted",
    i18nKey: "all_predicted",
    data: {},
    entities: {},
    priority: 0,
    ...overrides,
  });

  it("lifetime nuggets do not include date", () => {
    const a = nuggetDedupeKey(
      nugget({ type: "all_predicted", entities: { users: ["u1"] } }),
      new Date("2026-05-09T00:00:00Z"),
    );
    const b = nuggetDedupeKey(
      nugget({ type: "all_predicted", entities: { users: ["u1"] } }),
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(a).toBe(b);
    expect(a).toBe("all_predicted:u1");
  });

  it("bold_call keys per (user, match)", () => {
    const k = nuggetDedupeKey(
      nugget({ type: "bold_call", entities: { users: ["u1"], matches: ["m9"] } }),
      date,
    );
    expect(k).toBe("bold_call:u1:m9");
  });

  it("exact_score keys per match (announces once even if regenerated)", () => {
    const a = nuggetDedupeKey(
      nugget({ type: "exact_score", entities: { matches: ["m9"], users: ["u1", "u2"] } }),
      date,
    );
    const b = nuggetDedupeKey(
      nugget({ type: "exact_score", entities: { matches: ["m9"], users: ["u3"] } }),
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(a).toBe(b);
  });

  it("streak keys include count so longer streaks fire again", () => {
    const k3 = nuggetDedupeKey(
      nugget({ type: "streak", entities: { users: ["u1"] }, data: { count: 3 } }),
      date,
    );
    const k5 = nuggetDedupeKey(
      nugget({ type: "streak", entities: { users: ["u1"] }, data: { count: 5 } }),
      date,
    );
    expect(k3).not.toBe(k5);
  });

  it("daily nuggets (rank_change, day_leader) include the date", () => {
    const r1 = nuggetDedupeKey(
      nugget({ type: "rank_change", i18nKey: "rank_change_up", entities: { users: ["u1"] } }),
      new Date("2026-05-09T00:00:00Z"),
    );
    const r2 = nuggetDedupeKey(
      nugget({ type: "rank_change", i18nKey: "rank_change_up", entities: { users: ["u1"] } }),
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(r1).not.toBe(r2);

    const dl1 = nuggetDedupeKey(
      nugget({ type: "day_leader", entities: { users: ["u1"] } }),
      new Date("2026-05-09T00:00:00Z"),
    );
    const dl2 = nuggetDedupeKey(
      nugget({ type: "day_leader", entities: { users: ["u1"] } }),
      new Date("2026-05-10T00:00:00Z"),
    );
    expect(dl1).not.toBe(dl2);
  });
});
