import { describe, it, expect, vi, beforeEach } from "vitest";

const mockActivityFindMany = vi.fn();
const mockPredictionGroupBy = vi.fn();
const mockActivityLikeGroupBy = vi.fn();
const mockActivityLikeFindMany = vi.fn();
const mockCommentGroupBy = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activity: { findMany: (...args: unknown[]) => mockActivityFindMany(...args) },
    prediction: { groupBy: (...args: unknown[]) => mockPredictionGroupBy(...args) },
    activityLike: {
      groupBy: (...args: unknown[]) => mockActivityLikeGroupBy(...args),
      findMany: (...args: unknown[]) => mockActivityLikeFindMany(...args),
    },
    comment: { groupBy: (...args: unknown[]) => mockCommentGroupBy(...args) },
  },
}));

// Mock next-intl so localized event strings resolve to their key (+params)
// instead of requiring a request context.
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

import { getActivityFeed } from "./activity";

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: "act-1",
    type: "COMMENT",
    createdAt: new Date("2026-06-15T10:00:00Z"),
    commentId: "c-1",
    userId: null,
    matchId: null,
    comment: {
      id: "c-1",
      userId: "u-1",
      matchId: null,
      text: "Hello",
      imageUrl: null,
      user: { nickname: "Alice", avatarUrl: null },
      match: null,
      _count: { likes: 3, replies: 1 },
      likes: [],
    },
    user: null,
    match: null,
    ...overrides,
  };
}

describe("getActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPredictionGroupBy.mockResolvedValue([]);
    mockActivityLikeGroupBy.mockResolvedValue([]);
    mockActivityLikeFindMany.mockResolvedValue([]);
    mockCommentGroupBy.mockResolvedValue([]);
  });

  it("maps COMMENT activity with activityId", async () => {
    mockActivityFindMany.mockResolvedValue([makeActivity()]);

    const result = await getActivityFeed("all");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].activityId).toBe("act-1");
    expect(result.items[0].id).toBe("c-1");
    expect(result.items[0].type).toBe("comment");
    expect(result.items[0].likes).toBe(3);
    expect(result.items[0].replies).toBe(1);
  });

  it("maps MATCH_RESULT activity with event likes/replies from batch queries", async () => {
    mockActivityFindMany.mockResolvedValue([
      makeActivity({
        id: "act-2",
        type: "MATCH_RESULT",
        commentId: null,
        comment: null,
        matchId: "m-1",
        match: {
          id: "m-1",
          homeScore: 2,
          awayScore: 1,
          homeTeam: { name: "Argentina", code: "ARG" },
          awayTeam: { name: "Brazil", code: "BRA" },
        },
      }),
    ]);
    mockActivityLikeGroupBy.mockResolvedValue([{ activityId: "act-2", _count: 5 }]);
    mockCommentGroupBy.mockResolvedValue([{ activityId: "act-2", _count: 2 }]);
    mockActivityLikeFindMany.mockResolvedValue([{ activityId: "act-2" }]);

    const result = await getActivityFeed("all", undefined, undefined, "u-current");

    const item = result.items[0];
    expect(item.activityId).toBe("act-2");
    expect(item.type).toBe("match_result");
    expect(item.likes).toBe(5);
    expect(item.replies).toBe(2);
    expect(item.likedByMe).toBe(true);
    // Localized: header label and stats suffix go through i18n, not hardcoded English
    expect(item.nickname).toBe("matchResult");
    expect(item.detail).toContain("Argentina 2 - 1 Brazil · ");
    expect(item.detail).toContain("matchStats");
    expect(item.detail).not.toContain("got it right");
  });

  it("maps USER_JOINED activity with event likes/replies from batch queries", async () => {
    mockActivityFindMany.mockResolvedValue([
      makeActivity({
        id: "act-3",
        type: "USER_JOINED",
        commentId: null,
        comment: null,
        userId: "u-new",
        user: { id: "u-new", nickname: "Bob", avatarUrl: null },
      }),
    ]);
    mockActivityLikeGroupBy.mockResolvedValue([{ activityId: "act-3", _count: 1 }]);

    const result = await getActivityFeed("all");

    const item = result.items[0];
    expect(item.activityId).toBe("act-3");
    expect(item.type).toBe("user_joined");
    expect(item.likes).toBe(1);
    expect(item.likedByMe).toBe(false);
    // Localized: "joined Pencachi!" goes through i18n with the nickname as a param
    expect(item.detail).toContain("userJoined");
    expect(item.detail).toContain("Bob");
    expect(item.detail).not.toContain("joined Pencachi");
  });

  it("filters out orphaned activities", async () => {
    mockActivityFindMany.mockResolvedValue([
      makeActivity({ type: "COMMENT", comment: null }),
      makeActivity({ id: "act-ok", comment: { id: "c-2", userId: "u-1", matchId: null, text: "Hi", imageUrl: null, user: { nickname: "A", avatarUrl: null }, match: null, _count: { likes: 0, replies: 0 }, likes: [] } }),
    ]);

    const result = await getActivityFeed("all");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].activityId).toBe("act-ok");
  });

  it("returns nextCursor when there are more items", async () => {
    const items = Array.from({ length: 16 }, (_, i) =>
      makeActivity({
        id: `act-${i}`,
        comment: {
          id: `c-${i}`,
          userId: "u-1",
          matchId: null,
          text: `msg ${i}`,
          imageUrl: null,
          user: { nickname: "A", avatarUrl: null },
          match: null,
          _count: { likes: 0, replies: 0 },
          likes: [],
        },
        createdAt: new Date(`2026-06-15T${String(10 + i).padStart(2, "0")}:00:00Z`),
      }),
    );
    mockActivityFindMany.mockResolvedValue(items);

    const result = await getActivityFeed("all");

    expect(result.items).toHaveLength(15);
    expect(result.nextCursor).toBeTruthy();
  });

  it("returns null nextCursor when no more items", async () => {
    mockActivityFindMany.mockResolvedValue([makeActivity()]);

    const result = await getActivityFeed("all");

    expect(result.nextCursor).toBeNull();
  });

  it("COMMENT likedByMe is true when user has liked", async () => {
    mockActivityFindMany.mockResolvedValue([
      makeActivity({
        comment: {
          id: "c-1",
          userId: "u-1",
          matchId: null,
          text: "Hello",
          imageUrl: null,
          user: { nickname: "Alice", avatarUrl: null },
          match: null,
          _count: { likes: 1, replies: 0 },
          likes: [{ id: "cl-1" }],
        },
      }),
    ]);

    const result = await getActivityFeed("all", undefined, undefined, "u-current");

    expect(result.items[0].likedByMe).toBe(true);
  });
});
