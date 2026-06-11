import { prisma } from "@/lib/prisma";
import { calculateEventPoints } from "@/lib/prediction-arena-scoring";

// --- Week boundaries ---

export function getWeekBounds(date: Date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { weekStart: monday, weekEnd: sunday };
}

// --- Teams playing within the arena week (for prediction dropdowns) ---

export async function getArenaTeams(weekStart: Date, weekEnd: Date) {
  return prisma.team.findMany({
    where: {
      OR: [
        { homeMatches: { some: { kickoffTime: { gte: weekStart, lte: weekEnd } } } },
        { awayMatches: { some: { kickoffTime: { gte: weekStart, lte: weekEnd } } } },
      ],
    },
    select: { id: true, name: true, code: true, flagUrl: true },
    orderBy: { name: "asc" },
  });
}

// --- Current week for users ---

export async function getCurrentWeek(userId: string) {
  const { weekStart } = getWeekBounds();
  const nextWeekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const week = await prisma.weeklyHitsWeek.findFirst({
    where: {
      weekStart: { in: [weekStart, nextWeekStart] },
      status: { in: ["OPEN", "CLOSED", "RESOLVED"] },
    },
    orderBy: { weekStart: "desc" },
    include: {
      events: {
        orderBy: { orderIndex: "asc" },
        include: {
          resultTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
          predictions: {
            where: { userId },
            select: { id: true, teamId: true, points: true, team: { select: { id: true, name: true, code: true, flagUrl: true } } },
          },
        },
      },
      nostradamus: {
        select: { id: true, nickname: true, avatarUrl: true, avatarPreset: true },
      },
    },
  });

  return week;
}

// --- Current week for admin (includes all predictions count) ---

export async function getAdminCurrentWeek() {
  const { weekStart } = getWeekBounds();
  const nextWeekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const week = await prisma.weeklyHitsWeek.findFirst({
    where: { weekStart: { in: [weekStart, nextWeekStart] } },
    orderBy: { weekStart: "desc" },
    include: {
      events: {
        orderBy: { orderIndex: "asc" },
        include: {
          resultTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
          _count: { select: { predictions: true } },
        },
      },
    },
  });

  // Count matches for the arena's week
  const arenaWeekStart = week?.weekStart ?? weekStart;
  const matchCount = await prisma.match.count({
    where: {
      kickoffTime: {
        gte: arenaWeekStart,
        lte: new Date(arenaWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
      },
    },
  });

  return { week, matchCount };
}

// --- Nostradamus (last resolved week's winner) ---

export async function getNostradamus() {
  const week = await prisma.weeklyHitsWeek.findFirst({
    where: { status: "RESOLVED", nostradamusId: { not: null } },
    orderBy: { weekStart: "desc" },
    select: {
      id: true,
      weekNumber: true,
      nostradamus: {
        select: { id: true, nickname: true, avatarUrl: true, avatarPreset: true },
      },
    },
  });

  if (!week?.nostradamus) return null;

  const totalPoints = await prisma.weeklyHitsPrediction.aggregate({
    _sum: { points: true },
    where: {
      userId: week.nostradamus.id,
      event: { weekId: week.id },
    },
  });

  return {
    user: week.nostradamus,
    weekNumber: week.weekNumber,
    totalPoints: totalPoints._sum.points ?? 0,
  };
}

// --- History ---

export async function getWeekHistory(userId: string) {
  const weeks = await prisma.weeklyHitsWeek.findMany({
    where: { status: "RESOLVED" },
    orderBy: { weekStart: "desc" },
    take: 10,
    include: {
      nostradamus: {
        select: { id: true, nickname: true, avatarUrl: true, avatarPreset: true },
      },
      events: {
        orderBy: { orderIndex: "asc" },
        include: {
          resultTeam: { select: { id: true, code: true, flagUrl: true } },
          predictions: {
            where: { userId },
            select: { teamId: true, points: true, team: { select: { code: true, flagUrl: true } } },
          },
        },
      },
    },
  });

  return weeks.map((w) => ({
    ...w,
    userTotal: w.events.reduce(
      (sum, e) => sum + (e.predictions[0]?.points ?? 0),
      0,
    ),
  }));
}

// --- Community votes per event (top 3 teams + "no sucede" count) ---

export async function getCommunityVotes(weekId: string) {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("arena.votes");
  const { getTeamNameLookup } = await import("@/lib/team-i18n");
  const teamLookup = await getTeamNameLookup();
  const wontHappenLabel = t("wontHappen");

  const predictions = await prisma.weeklyHitsPrediction.findMany({
    where: { event: { weekId } },
    select: { eventId: true, teamId: true, team: { select: { code: true, name: true } } },
  });

  const votesByEvent = new Map<string, Map<string | null, { count: number; code: string | null; name: string | null }>>();

  for (const p of predictions) {
    if (!votesByEvent.has(p.eventId)) {
      votesByEvent.set(p.eventId, new Map());
    }
    const eventVotes = votesByEvent.get(p.eventId)!;
    const key = p.teamId;
    const existing = eventVotes.get(key);
    if (existing) {
      existing.count++;
    } else {
      eventVotes.set(key, { count: 1, code: p.team?.code ?? null, name: p.team?.name ?? null });
    }
  }

  const result: Record<string, { teamId: string | null; code: string | null; count: number; pct: number }[]> = {};

  for (const [eventId, votes] of votesByEvent) {
    const total = Array.from(votes.values()).reduce((s, v) => s + v.count, 0);
    const sorted = Array.from(votes.entries())
      .map(([teamId, v]) => ({
        teamId,
        code: teamId === null ? "NO" : v.code,
        name:
          teamId === null
            ? wontHappenLabel
            : v.code && v.name
              ? teamLookup({ code: v.code, name: v.name })
              : v.name,
        count: v.count,
        pct: Math.round((v.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    result[eventId] = sorted;
  }

  return result;
}

// --- Arena leaderboard (total points across all resolved weeks) ---

export async function getArenaLeaderboard() {
  const rows = await prisma.weeklyHitsPrediction.groupBy({
    by: ["userId"],
    _sum: { points: true },
    where: { points: { not: null }, event: { week: { status: "RESOLVED" } } },
    orderBy: { _sum: { points: "desc" } },
    take: 10,
  });

  if (rows.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, nickname: true, avatarUrl: true, avatarPreset: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r, i) => ({
    rank: i + 1,
    user: userMap.get(r.userId)!,
    totalPoints: r._sum.points ?? 0,
  }));
}

// --- Resolve: calculate points for all predictions in a week ---

export async function calculateWeekPoints(weekId: string) {
  const events = await prisma.weeklyHitsEvent.findMany({
    where: { weekId },
    select: { id: true, result: true, resultTeamId: true },
  });

  // Ensure all 6 are resolved
  if (events.some((e) => e.result === null)) {
    return { resolved: false, reason: "not_all_resolved" };
  }

  // Get all predictions for this week
  const predictions = await prisma.weeklyHitsPrediction.findMany({
    where: { event: { weekId } },
    select: { id: true, userId: true, eventId: true, teamId: true, createdAt: true },
  });

  const eventMap = new Map(events.map((e) => [e.id, e]));

  // Calculate points for each prediction
  const updates = predictions.map((p) => {
    const event = eventMap.get(p.eventId)!;
    const points = calculateEventPoints(
      { teamId: p.teamId },
      { result: event.result, resultTeamId: event.resultTeamId },
    );
    return prisma.weeklyHitsPrediction.update({
      where: { id: p.id },
      data: { points },
    });
  });

  await prisma.$transaction(updates);

  // Determine Nostradamus: highest total points, tiebreak by earliest createdAt
  const userScores = new Map<string, { total: number; earliestPrediction: Date }>();

  for (const p of predictions) {
    const event = eventMap.get(p.eventId)!;
    const points = calculateEventPoints(
      { teamId: p.teamId },
      { result: event.result, resultTeamId: event.resultTeamId },
    );
    const existing = userScores.get(p.userId);
    if (existing) {
      existing.total += points;
      if (p.createdAt < existing.earliestPrediction) {
        existing.earliestPrediction = p.createdAt;
      }
    } else {
      userScores.set(p.userId, { total: points, earliestPrediction: p.createdAt });
    }
  }

  let nostradamusId: string | null = null;
  let maxScore = 0;
  let earliestDate = new Date();

  for (const [userId, score] of userScores) {
    if (
      score.total > maxScore ||
      (score.total === maxScore && score.earliestPrediction < earliestDate)
    ) {
      maxScore = score.total;
      earliestDate = score.earliestPrediction;
      nostradamusId = userId;
    }
  }

  await prisma.weeklyHitsWeek.update({
    where: { id: weekId },
    data: { status: "RESOLVED", nostradamusId },
  });

  return { resolved: true, nostradamusId, maxScore };
}
