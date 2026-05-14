import { prisma } from "@/lib/prisma";
import type { ActivityType } from "@/generated/prisma/client";
import { POINTS_EXACT, POINTS_CORRECT_WINNER } from "./constants";
import type { HighlightNugget, ResolvedNugget } from "@/lib/highlight-templates";
import { resolveNuggets } from "@/lib/highlight-templates";

// --- Types ---

export interface ActivityItem {
  id: string;
  activityId: string;
  type: "comment" | "match_result" | "user_joined" | "daily_highlights";
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  matchId: string | null;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  detail: string;
  imageUrl: string | null;
  likes: number;
  likedByMe: boolean;
  replies: number;
  createdAt: Date;
  highlightNuggets?: ResolvedNugget[];
}

export interface ActivityFeedResponse {
  items: ActivityItem[];
  nextCursor: string | null;
}

export type ActivityFilter = "all" | "comments" | "events";

const PAGE_SIZE = 15;

const TYPE_MAP: Record<ActivityFilter, ActivityType[]> = {
  all: ["COMMENT", "USER_JOINED", "MATCH_RESULT", "DAILY_HIGHLIGHTS"],
  comments: ["COMMENT"],
  events: ["MATCH_RESULT", "USER_JOINED", "DAILY_HIGHLIGHTS"],
};

// --- Main query ---

export async function getActivityFeed(
  filter: ActivityFilter = "all",
  cursor?: string,
  limit: number = PAGE_SIZE,
  currentUserId?: string,
): Promise<ActivityFeedResponse> {
  const cursorDate = cursor ? new Date(cursor) : undefined;
  const fetchLimit = limit + 1;

  const activities = await prisma.activity.findMany({
    where: {
      type: { in: TYPE_MAP[filter] },
      ...(cursorDate && { createdAt: { lt: cursorDate } }),
    },
    orderBy: { createdAt: "desc" },
    take: fetchLimit,
    include: {
      comment: {
        include: {
          user: { select: { nickname: true, avatarUrl: true } },
          match: {
            select: {
              homeTeam: { select: { code: true } },
              awayTeam: { select: { code: true } },
            },
          },
          _count: { select: { likes: true, replies: true } },
          ...(currentUserId && {
            likes: { where: { userId: currentUserId }, select: { id: true } },
          }),
        },
      },
      user: { select: { id: true, nickname: true, avatarUrl: true } },
      match: {
        select: {
          id: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { name: true, code: true } },
          awayTeam: { select: { name: true, code: true } },
        },
      },
    },
  });

  // Filter out orphaned activities (deleted comments/users/matches)
  const valid = activities.filter((a) => {
    if (a.type === "COMMENT" && !a.comment) return false;
    if (a.type === "MATCH_RESULT" && !a.match) return false;
    if (a.type === "USER_JOINED" && !a.user) return false;
    if (a.type === "DAILY_HIGHLIGHTS" && !a.highlightsJson) return false;
    return true;
  });

  const hasMore = valid.length > limit;
  const page = valid.slice(0, limit);

  // Batch prediction stats for MATCH_RESULT activities
  const matchIds = page
    .filter((a) => a.type === "MATCH_RESULT" && a.matchId)
    .map((a) => a.matchId!);

  // Batch event social stats (likes/replies on Activity items)
  const eventActivityIds = page
    .filter((a) => a.type !== "COMMENT")
    .map((a) => a.id);

  const [exactMap, correctMap, eventLikeCounts, eventReplyCounts, myEventLikes] = await Promise.all([
    // Prediction stats
    matchIds.length > 0
      ? prisma.prediction.groupBy({
          by: ["matchId"],
          where: { matchId: { in: matchIds }, points: POINTS_EXACT },
          _count: true,
        }).then((rows) => new Map(rows.map((e) => [e.matchId, e._count])))
      : Promise.resolve(new Map<string, number>()),
    matchIds.length > 0
      ? prisma.prediction.groupBy({
          by: ["matchId"],
          where: { matchId: { in: matchIds }, points: { gte: POINTS_CORRECT_WINNER } },
          _count: true,
        }).then((rows) => new Map(rows.map((c) => [c.matchId, c._count])))
      : Promise.resolve(new Map<string, number>()),
    // Event like counts
    eventActivityIds.length > 0
      ? prisma.activityLike.groupBy({
          by: ["activityId"],
          where: { activityId: { in: eventActivityIds } },
          _count: true,
        }).then((rows) => new Map(rows.map((r) => [r.activityId, r._count])))
      : Promise.resolve(new Map<string, number>()),
    // Event reply counts
    eventActivityIds.length > 0
      ? prisma.comment.groupBy({
          by: ["activityId"],
          where: { activityId: { in: eventActivityIds } },
          _count: true,
        }).then((rows) => new Map(rows.map((r) => [r.activityId!, r._count])))
      : Promise.resolve(new Map<string, number>()),
    // Current user's event likes
    eventActivityIds.length > 0 && currentUserId
      ? prisma.activityLike.findMany({
          where: { activityId: { in: eventActivityIds }, userId: currentUserId },
          select: { activityId: true },
        }).then((rows) => new Set(rows.map((r) => r.activityId)))
      : Promise.resolve(new Set<string>()),
  ]);

  // Resolve highlights nuggets for DAILY_HIGHLIGHTS activities
  const highlightsActivities = page.filter((a) => a.type === "DAILY_HIGHLIGHTS");
  const resolvedHighlightsMap = new Map<string, ResolvedNugget[]>();
  for (const a of highlightsActivities) {
    const nuggets = a.highlightsJson as unknown as HighlightNugget[] | null;
    if (nuggets) {
      resolvedHighlightsMap.set(a.id, await resolveNuggets(nuggets));
    }
  }

  const items: ActivityItem[] = page.map((a) => {
    switch (a.type) {
      case "COMMENT": {
        const c = a.comment!;
        return {
          id: c.id,
          activityId: a.id,
          type: "comment" as const,
          userId: c.userId,
          nickname: c.user.nickname,
          avatarUrl: c.user.avatarUrl,
          matchId: c.matchId,
          homeTeamCode: c.match?.homeTeam?.code ?? null,
          awayTeamCode: c.match?.awayTeam?.code ?? null,
          detail: c.text,
          imageUrl: c.imageUrl,
          likes: c._count.likes,
          likedByMe: "likes" in c && Array.isArray(c.likes) ? c.likes.length > 0 : false,
          replies: c._count.replies,
          createdAt: a.createdAt,
        };
      }
      case "MATCH_RESULT": {
        const m = a.match!;
        const exact = exactMap.get(m.id) ?? 0;
        const correct = correctMap.get(m.id) ?? 0;
        return {
          id: m.id,
          activityId: a.id,
          type: "match_result" as const,
          userId: "",
          nickname: "Match Result",
          avatarUrl: null,
          matchId: m.id,
          homeTeamCode: m.homeTeam.code,
          awayTeamCode: m.awayTeam.code,
          detail: `${m.homeTeam.name} ${m.homeScore} - ${m.awayScore} ${m.awayTeam.name} · ${correct} got it right, ${exact} exact`,
          imageUrl: null,
          likes: eventLikeCounts.get(a.id) ?? 0,
          likedByMe: myEventLikes.has(a.id),
          replies: eventReplyCounts.get(a.id) ?? 0,
          createdAt: a.createdAt,
        };
      }
      case "USER_JOINED": {
        const u = a.user!;
        return {
          id: u.id,
          activityId: a.id,
          type: "user_joined" as const,
          userId: "",
          nickname: u.nickname,
          avatarUrl: u.avatarUrl,
          matchId: null,
          homeTeamCode: null,
          awayTeamCode: null,
          detail: `${u.nickname} joined Pencachi!`,
          imageUrl: null,
          likes: eventLikeCounts.get(a.id) ?? 0,
          likedByMe: myEventLikes.has(a.id),
          replies: eventReplyCounts.get(a.id) ?? 0,
          createdAt: a.createdAt,
        };
      }
      case "DAILY_HIGHLIGHTS": {
        const resolved = resolvedHighlightsMap.get(a.id) ?? [];
        const summary = `${resolved.length} highlight${resolved.length === 1 ? "" : "s"} today`;
        return {
          id: a.id,
          activityId: a.id,
          type: "daily_highlights" as const,
          userId: "",
          nickname: "Pencachi",
          avatarUrl: "/logo-octopus.png",
          matchId: null,
          homeTeamCode: null,
          awayTeamCode: null,
          detail: summary,
          imageUrl: null,
          likes: eventLikeCounts.get(a.id) ?? 0,
          likedByMe: myEventLikes.has(a.id),
          replies: eventReplyCounts.get(a.id) ?? 0,
          createdAt: a.createdAt,
          highlightNuggets: resolved,
        };
      }
    }
  });

  const nextCursor = hasMore
    ? items[items.length - 1].createdAt.toISOString()
    : null;

  return { items, nextCursor };
}
