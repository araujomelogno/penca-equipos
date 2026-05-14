import { describe, it, expect } from "vitest";
import { getVisibleRows } from "./LeaderboardPodium";

type Entry = {
  id: string;
  rank: number;
  nickname: string;
  avatarUrl: string | null;
  totalPoints: number;
};

function makeEntry(rank: number, id = `user-${rank}`): Entry {
  return { id, rank, nickname: `User${rank}`, avatarUrl: null, totalPoints: 100 - rank };
}

describe("getVisibleRows", () => {
  it("returns empty when all entries are top 3", () => {
    const lb = [makeEntry(1), makeEntry(2), makeEntry(3)];
    expect(getVisibleRows(lb, "user-1")).toEqual([]);
  });

  it("returns ranks 4-8 when current user is in top 3", () => {
    const lb = Array.from({ length: 10 }, (_, i) => makeEntry(i + 1));
    const rows = getVisibleRows(lb, "user-2");
    expect(rows).toHaveLength(5);
    expect(rows[0].rank).toBe(4);
    expect(rows[4].rank).toBe(8);
  });

  it("returns ranks 4-8 when current user is not in list", () => {
    const lb = Array.from({ length: 10 }, (_, i) => makeEntry(i + 1));
    const rows = getVisibleRows(lb, "unknown-user");
    expect(rows).toHaveLength(5);
    expect(rows[0].rank).toBe(4);
  });

  it("returns ranks 4-8 when current user is rank 6 (within top 8)", () => {
    const lb = Array.from({ length: 10 }, (_, i) => makeEntry(i + 1));
    const rows = getVisibleRows(lb, "user-6");
    expect(rows).toHaveLength(5);
    expect(rows[0].rank).toBe(4);
  });

  it("returns contextual window when current user is far down", () => {
    const lb = Array.from({ length: 20 }, (_, i) => makeEntry(i + 1));
    const rows = getVisibleRows(lb, "user-15");
    // user-15 is at index 11 in rest (rank 15 - 3 = index 11)
    // window: index 9 to 14 → ranks 13 to 17
    expect(rows.some((r) => r.id === "user-15")).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(5);
  });

  it("handles user at the very end of the list", () => {
    const lb = Array.from({ length: 20 }, (_, i) => makeEntry(i + 1));
    const rows = getVisibleRows(lb, "user-20");
    expect(rows.some((r) => r.id === "user-20")).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("returns empty when leaderboard has no entries", () => {
    expect(getVisibleRows([], "user-1")).toEqual([]);
  });
});
