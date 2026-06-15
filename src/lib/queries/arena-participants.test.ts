import { describe, it, expect } from "vitest";
import { shapeParticipants, type ParticipantPrediction } from "./arena-participants";

function user(id: string) {
  return { id, nickname: `user-${id}`, avatarUrl: null, avatarPreset: null };
}

function pred(
  userId: string,
  createdAt: string,
  points: number | null = null,
): ParticipantPrediction {
  return { userId, createdAt, points, user: user(userId) };
}

describe("shapeParticipants", () => {
  it("groups predictions by user and counts how many they made", () => {
    const result = shapeParticipants([
      pred("a", "2026-06-08T10:00:00Z"),
      pred("a", "2026-06-08T11:00:00Z"),
      pred("b", "2026-06-08T12:00:00Z"),
    ]);

    expect(result).toHaveLength(2);
    const a = result.find((p) => p.user.id === "a")!;
    expect(a.predicted).toBe(2);
    const b = result.find((p) => p.user.id === "b")!;
    expect(b.predicted).toBe(1);
  });

  it("sums weekPoints per user, treating null points as 0", () => {
    const result = shapeParticipants([
      pred("a", "2026-06-08T10:00:00Z", 5),
      pred("a", "2026-06-08T11:00:00Z", null),
      pred("a", "2026-06-08T12:00:00Z", 2),
    ]);

    expect(result[0].weekPoints).toBe(7);
  });

  it("orders by progress desc (most predictions first)", () => {
    const result = shapeParticipants([
      pred("few", "2026-06-08T10:00:00Z"),
      pred("many", "2026-06-08T11:00:00Z"),
      pred("many", "2026-06-08T12:00:00Z"),
    ]);

    expect(result.map((p) => p.user.id)).toEqual(["many", "few"]);
  });

  it("breaks progress ties by weekPoints desc (resolved week)", () => {
    const result = shapeParticipants([
      pred("low", "2026-06-08T10:00:00Z", 1),
      pred("high", "2026-06-08T11:00:00Z", 5),
    ]);

    expect(result.map((p) => p.user.id)).toEqual(["high", "low"]);
  });

  it("breaks remaining ties by earliest prediction asc", () => {
    const result = shapeParticipants([
      pred("late", "2026-06-08T15:00:00Z"),
      pred("early", "2026-06-08T09:00:00Z"),
    ]);

    expect(result.map((p) => p.user.id)).toEqual(["early", "late"]);
  });

  it("returns an empty array when there are no predictions", () => {
    expect(shapeParticipants([])).toEqual([]);
  });
});
