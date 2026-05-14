import { prisma } from "@/lib/prisma";
import { POINTS_EXACT, POINTS_CORRECT_WINNER } from "@/lib/queries/constants";
import type { HighlightNugget } from "@/lib/highlight-templates";

// --- Dedupe key ---

// Returns a stable identity for a nugget. Daily nuggets include the date so they
// can re-emit each day; lifetime nuggets omit it so they only fire once ever.
export function nuggetDedupeKey(n: HighlightNugget, targetDate: Date): string {
  const u = n.entities.users?.[0] ?? "";
  const m = n.entities.matches?.[0] ?? "";
  const dateKey = targetDate.toISOString().slice(0, 10);

  switch (n.type) {
    case "all_predicted":
      return `all_predicted:${u}`;
    case "bold_call":
      return `bold_call:${u}:${m}`;
    case "lone_wolf":
      return `lone_wolf:${u}:${m}`;
    case "exact_score":
      return `exact_score:${m}`;
    case "global_stat":
      return `global_stat:${m}`;
    case "streak":
      return `streak:${u}:${n.data.count}`;
    case "rank_change":
      return `${n.i18nKey ?? "rank_change"}:${u}:${dateKey}`;
    case "day_leader":
      return `day_leader:${u}:${dateKey}`;
    default:
      return `${n.type}:${u}:${m}:${dateKey}`;
  }
}

// --- Main generator ---

export async function generateHighlights(
  targetDate: Date,
): Promise<HighlightNugget[]> {
  const dayStart = startOfDayUTC(targetDate);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Matches finished on target date
  const todayMatches = await prisma.match.findMany({
    where: { status: "FINISHED", kickoffTime: { gte: dayStart, lt: dayEnd } },
    select: {
      id: true,
      homeTeam: { select: { code: true } },
      awayTeam: { select: { code: true } },
      homeScore: true,
      awayScore: true,
    },
  });

  const todayMatchIds = todayMatches.map((m) => m.id);
  const hasFinishedToday = todayMatches.length > 0;

  const nuggets: HighlightNugget[] = [];

  // --- Matchday nuggets (only when matches finished today) ---
  if (hasFinishedToday) {
    const allScoredPredictions = await prisma.prediction.findMany({
      where: { points: { not: null } },
      select: { userId: true, matchId: true, points: true },
    });

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const userIds = new Set(users.map((u) => u.id));

    const beforeRanks = buildRankMap(
      allScoredPredictions.filter((p) => !todayMatchIds.includes(p.matchId)),
      userIds,
    );
    const afterRanks = buildRankMap(allScoredPredictions, userIds);

    const todayPredictions = allScoredPredictions.filter((p) =>
      todayMatchIds.includes(p.matchId),
    );

    nuggets.push(
      ...rankChangeNuggets(beforeRanks, afterRanks),
      ...exactScoreNuggets(todayMatches, allScoredPredictions),
      ...dayLeaderNuggets(todayPredictions),
      ...globalStatNuggets(todayMatches, allScoredPredictions),
      ...streakNuggets(allScoredPredictions, userIds),
    );
  }

  // --- Pre-tournament / participation nuggets (always run) ---
  nuggets.push(...(await allPredictedNuggets()));
  nuggets.push(...(await boldCallNuggets()));
  nuggets.push(...(await loneWolfNuggets()));

  // Filter out nuggets already published (ledger dedupe)
  const candidates = nuggets.sort((a, b) => b.priority - a.priority);
  const keys = candidates.map((n) => nuggetDedupeKey(n, targetDate));
  if (keys.length === 0) return candidates;

  const published = await prisma.publishedHighlight.findMany({
    where: { dedupeKey: { in: keys } },
    select: { dedupeKey: true },
  });
  const publishedSet = new Set(published.map((p) => p.dedupeKey));

  return candidates.filter((_, i) => !publishedSet.has(keys[i]));
}

// --- Rank helpers ---

interface RankEntry {
  userId: string;
  totalPoints: number;
  exactScores: number;
  rank: number;
}

export function buildRankMap(
  predictions: { userId: string; points: number | null }[],
  userIds: Set<string>,
): Map<string, RankEntry> {
  const statsMap = new Map<string, { totalPoints: number; exactScores: number }>();

  for (const p of predictions) {
    if (!userIds.has(p.userId)) continue;
    const pts = p.points ?? 0;
    let entry = statsMap.get(p.userId);
    if (!entry) {
      entry = { totalPoints: 0, exactScores: 0 };
      statsMap.set(p.userId, entry);
    }
    entry.totalPoints += pts;
    if (pts === POINTS_EXACT) entry.exactScores++;
  }

  // Include all active users (even those with 0 points)
  const entries: RankEntry[] = [...userIds].map((userId) => {
    const stats = statsMap.get(userId) ?? { totalPoints: 0, exactScores: 0 };
    return { userId, ...stats, rank: 0 };
  });

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.exactScores - a.exactScores;
  });

  entries.forEach((e, i) => (e.rank = i + 1));
  return new Map(entries.map((e) => [e.userId, e]));
}

// --- Nugget generators ---

function rankChangeNuggets(
  before: Map<string, RankEntry>,
  after: Map<string, RankEntry>,
): HighlightNugget[] {
  const nuggets: HighlightNugget[] = [];
  let bestClimb = { userId: "", delta: 0 };
  let bestFall = { userId: "", delta: 0 };

  for (const [userId, afterEntry] of after) {
    const beforeEntry = before.get(userId);
    if (!beforeEntry) continue;
    const delta = beforeEntry.rank - afterEntry.rank; // positive = climbed

    if (delta > bestClimb.delta) bestClimb = { userId, delta };
    if (delta < bestFall.delta) bestFall = { userId, delta };
  }

  if (bestClimb.delta >= 2) {
    const afterEntry = after.get(bestClimb.userId)!;
    nuggets.push({
      type: "rank_change",
      i18nKey: "rank_change_up",
      data: { delta: bestClimb.delta, newRank: afterEntry.rank },
      entities: { users: [bestClimb.userId] },
      priority: 90,
    });
  }

  if (bestFall.delta <= -2) {
    const afterEntry = after.get(bestFall.userId)!;
    nuggets.push({
      type: "rank_change",
      i18nKey: "rank_change_down",
      data: { delta: Math.abs(bestFall.delta), newRank: afterEntry.rank },
      entities: { users: [bestFall.userId] },
      priority: 70,
    });
  }

  return nuggets;
}

function exactScoreNuggets(
  todayMatches: { id: string; homeScore: number | null; awayScore: number | null }[],
  allPredictions: { userId: string; matchId: string; points: number | null }[],
): HighlightNugget[] {
  const nuggets: HighlightNugget[] = [];

  for (const match of todayMatches) {
    const exactUsers = allPredictions
      .filter((p) => p.matchId === match.id && p.points === POINTS_EXACT)
      .map((p) => p.userId);

    if (exactUsers.length > 0) {
      nuggets.push({
        type: "exact_score",
        i18nKey: "exact_score",
        data: { count: exactUsers.length },
        entities: { users: exactUsers, matches: [match.id] },
        priority: 85,
      });
    }
  }

  return nuggets;
}

function dayLeaderNuggets(
  todayPredictions: { userId: string; points: number | null }[],
): HighlightNugget[] {
  const pointsByUser = new Map<string, number>();
  for (const p of todayPredictions) {
    pointsByUser.set(p.userId, (pointsByUser.get(p.userId) ?? 0) + (p.points ?? 0));
  }

  if (pointsByUser.size === 0) return [];

  let maxPoints = 0;
  let leaderId = "";
  for (const [userId, pts] of pointsByUser) {
    if (pts > maxPoints) {
      maxPoints = pts;
      leaderId = userId;
    }
  }

  if (maxPoints === 0) return [];

  return [
    {
      type: "day_leader",
      i18nKey: "day_leader",
      data: { points: maxPoints },
      entities: { users: [leaderId] },
      priority: 80,
    },
  ];
}

function globalStatNuggets(
  todayMatches: { id: string; homeScore: number | null; awayScore: number | null }[],
  allPredictions: { userId: string; matchId: string; points: number | null }[],
): HighlightNugget[] {
  const nuggets: HighlightNugget[] = [];

  for (const match of todayMatches) {
    const matchPreds = allPredictions.filter((p) => p.matchId === match.id);
    const total = matchPreds.length;
    if (total < 3) continue; // not enough data

    const correct = matchPreds.filter(
      (p) => (p.points ?? 0) >= POINTS_CORRECT_WINNER,
    ).length;

    const ratio = correct / total;
    if (ratio <= 0.25) {
      nuggets.push({
        type: "global_stat",
        i18nKey: "global_stat",
        data: { correct, total },
        entities: { matches: [match.id] },
        priority: 75,
      });
    }
  }

  return nuggets;
}

function streakNuggets(
  allPredictions: { userId: string; matchId: string; points: number | null }[],
  userIds: Set<string>,
): HighlightNugget[] {
  // Group predictions by user, we need match order for streaks
  // Since we don't have kickoffTime here, we'll use a simpler approach:
  // count consecutive correct from the end of the user's scored predictions
  const byUser = new Map<string, number[]>();
  for (const p of allPredictions) {
    if (!userIds.has(p.userId)) continue;
    if (!byUser.has(p.userId)) byUser.set(p.userId, []);
    byUser.get(p.userId)!.push(p.points ?? 0);
  }

  const nuggets: HighlightNugget[] = [];

  for (const [userId, pointsList] of byUser) {
    // Count streak from end
    let streak = 0;
    for (let i = pointsList.length - 1; i >= 0; i--) {
      if (pointsList[i] >= POINTS_CORRECT_WINNER) streak++;
      else break;
    }

    if (streak >= 3) {
      nuggets.push({
        type: "streak",
        i18nKey: "streak",
        data: { count: streak },
        entities: { users: [userId] },
        priority: 65,
      });
    }
  }

  return nuggets;
}

// --- Pre-tournament / participation nuggets ---

async function allPredictedNuggets(): Promise<HighlightNugget[]> {
  const totalMatches = await prisma.match.count();
  if (totalMatches === 0) return [];

  // Count predictions per active user
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, _count: { select: { predictions: true } } },
  });

  const nuggets: HighlightNugget[] = [];
  for (const u of users) {
    if (u._count.predictions === totalMatches) {
      nuggets.push({
        type: "all_predicted",
        i18nKey: "all_predicted",
        data: { total: totalMatches },
        entities: { users: [u.id] },
        priority: 88,
      });
    }
  }

  return nuggets;
}

async function boldCallNuggets(): Promise<HighlightNugget[]> {
  // Find predictions where the predicted winner has very low betting odds
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      homeWinProb: { not: null },
      awayWinProb: { not: null },
    },
    select: {
      id: true,
      homeWinProb: true,
      drawProb: true,
      awayWinProb: true,
      predictions: { select: { userId: true, homeScore: true, awayScore: true } },
    },
  });

  const nuggets: HighlightNugget[] = [];

  for (const m of matches) {
    for (const p of m.predictions) {
      let predictedOutcome: "home" | "draw" | "away";
      if (p.homeScore > p.awayScore) predictedOutcome = "home";
      else if (p.homeScore === p.awayScore) predictedOutcome = "draw";
      else predictedOutcome = "away";

      const probMap = {
        home: m.homeWinProb ?? 0,
        draw: m.drawProb ?? 0,
        away: m.awayWinProb ?? 0,
      };

      const prob = probMap[predictedOutcome];

      // Bold call = predicted outcome has <= 15% probability
      if (prob > 0 && prob <= 15) {
        nuggets.push({
          type: "bold_call",
          i18nKey: "bold_call",
          data: { prob: Math.round(prob) },
          entities: { users: [p.userId], matches: [m.id] },
          priority: 82,
        });
      }
    }
  }

  // Sort by boldest (lowest prob)
  nuggets.sort((a, b) => (a.data.prob as number) - (b.data.prob as number));
  return nuggets;
}

async function loneWolfNuggets(): Promise<HighlightNugget[]> {
  // Find matches where exactly 1 user predicted a different outcome than everyone else
  const matches = await prisma.match.findMany({
    where: { status: "SCHEDULED" },
    select: {
      id: true,
      predictions: { select: { userId: true, homeScore: true, awayScore: true } },
    },
  });

  const nuggets: HighlightNugget[] = [];

  for (const m of matches) {
    if (m.predictions.length < 3) continue; // need enough people

    const outcomes = new Map<"home" | "draw" | "away", string[]>();
    outcomes.set("home", []);
    outcomes.set("draw", []);
    outcomes.set("away", []);

    for (const p of m.predictions) {
      let outcome: "home" | "draw" | "away";
      if (p.homeScore > p.awayScore) outcome = "home";
      else if (p.homeScore === p.awayScore) outcome = "draw";
      else outcome = "away";
      outcomes.get(outcome)!.push(p.userId);
    }

    for (const [, users] of outcomes) {
      if (users.length === 1) {
        nuggets.push({
          type: "lone_wolf",
          i18nKey: "lone_wolf",
          data: {},
          entities: { users: [users[0]], matches: [m.id] },
          priority: 72,
        });
      }
    }
  }

  return nuggets;
}

// --- Upsert ---

export async function upsertHighlights(
  targetDate: Date,
  nuggets: HighlightNugget[],
): Promise<{ action: "created" | "updated" }> {
  const json = JSON.parse(JSON.stringify(nuggets));
  const ledgerRows = nuggets.map((n) => ({
    nuggetType: n.type,
    dedupeKey: nuggetDedupeKey(n, targetDate),
    userId: n.entities.users?.[0] ?? null,
    matchId: n.entities.matches?.[0] ?? null,
  }));

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.activity.findFirst({
      where: { type: "DAILY_HIGHLIGHTS", highlightsDate: targetDate },
    });

    let action: "created" | "updated";
    if (existing) {
      await tx.activity.update({
        where: { id: existing.id },
        data: { highlightsJson: json },
      });
      action = "updated";
    } else {
      await tx.activity.create({
        data: {
          type: "DAILY_HIGHLIGHTS",
          highlightsJson: json,
          highlightsDate: targetDate,
        },
      });
      action = "created";
    }

    if (ledgerRows.length > 0) {
      await tx.publishedHighlight.createMany({
        data: ledgerRows,
        skipDuplicates: true,
      });
    }

    return { action };
  });
}

// --- Util ---

export function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
