import { prisma } from "@/lib/prisma";
import { getActivityFeed as getActivityFeedFull, type ActivityItem } from "./activity";
import { getLeaderboardData, type LeaderboardEntry } from "./leaderboard";
import { POINTS_EXACT, POINTS_CORRECT_WINNER } from "./constants";
import type { HighlightNugget, ResolvedNugget } from "@/lib/highlight-templates";
import { resolveNuggets } from "@/lib/highlight-templates";

export type { ActivityItem, LeaderboardEntry };

// --- Exported Types ---

export interface UpcomingMatch {
  id: string;
  kickoffTime: Date;
  stage: string;
  group: string | null;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
  userPrediction: { homeScore: number; awayScore: number } | null;
  avgPrediction: { home: number; away: number } | null;
  totalPredictions: number;
}

export interface UserStats {
  matchesFinished: number;
  accuracy: number;
  streak: number;
}

export interface ParticipationData {
  completed: number;
  pending: number;
  totalMatches: number;
}

export interface TournamentFavorite {
  name: string;
  code: string;
  flagUrl: string | null;
  odds: number;
}

export interface NextFavoriteTeamMatch {
  id: string;
  kickoffTime: string;
  stage: string;
  group: string | null;
  homeTeam: { name: string; code: string; flagUrl: string | null };
  awayTeam: { name: string; code: string; flagUrl: string | null };
  isFavoriteHome: boolean;
}

export interface HomeData {
  hasLeaderboard: boolean;
  leaderboard: LeaderboardEntry[];
  currentUserRank: number | null;
  userStats: UserStats;
  upcomingMatches: UpcomingMatch[];
  activityFeed: ActivityItem[];
  participation: ParticipationData;
  firstKickoff: string | null;
  favorites: TournamentFavorite[];
  nextFavoriteMatch: NextFavoriteTeamMatch | null;
  latestHighlights: ResolvedNugget[] | null;
}

export async function getHomeData(userId: string): Promise<HomeData> {
  // First check if leaderboard is needed before running expensive queries
  const hasLeaderboard = await checkHasLeaderboard();

  const [leaderboardRaw, userPredictions, upcomingMatchesRaw, activityFeed, participation, firstKickoff, favorites, nextFavoriteMatch, latestHighlights] =
    await Promise.all([
      hasLeaderboard ? getLeaderboardData() : Promise.resolve([]),
      getUserPredictions(userId),
      getUpcomingMatches(userId),
      getActivityFeed(userId),
      getParticipation(userId),
      getFirstKickoff(),
      getTopFavorites(),
      getNextFavoriteTeamMatch(userId),
      getLatestHighlights(),
    ]);

  const userStats = calculateUserStats(userPredictions);

  const currentUserRank =
    leaderboardRaw.find((e) => e.id === userId)?.rank ?? null;

  return {
    hasLeaderboard,
    leaderboard: leaderboardRaw,
    currentUserRank,
    userStats,
    upcomingMatches: upcomingMatchesRaw,
    activityFeed,
    participation,
    firstKickoff: firstKickoff?.toISOString() ?? null,
    favorites,
    nextFavoriteMatch,
    latestHighlights,
  };
}

async function checkHasLeaderboard(): Promise<boolean> {
  const count = await prisma.match.count({
    where: { status: "FINISHED" },
  });
  return count > 0;
}


interface PredictionRow {
  points: number | null;
  match: { kickoffTime: Date };
}

async function getUserPredictions(userId: string): Promise<PredictionRow[]> {
  return prisma.prediction.findMany({
    where: { userId, points: { not: null } },
    select: { points: true, match: { select: { kickoffTime: true } } },
    orderBy: { match: { kickoffTime: "asc" } },
  });
}

function calculateUserStats(predictions: PredictionRow[]): UserStats {
  const matchesFinished = predictions.length;
  if (matchesFinished === 0) {
    return { matchesFinished: 0, accuracy: 0, streak: 0 };
  }

  const correct = predictions.filter(
    (p) => (p.points ?? 0) >= POINTS_CORRECT_WINNER,
  ).length;
  const accuracy = Math.round((correct / matchesFinished) * 100);

  let streak = 0;
  for (let i = predictions.length - 1; i >= 0; i--) {
    if (predictions[i].points === POINTS_EXACT) {
      streak++;
    } else {
      break;
    }
  }

  return { matchesFinished, accuracy, streak };
}

// S-1: No longer loads all predictions. Fetches only the current user's prediction
// per match, plus aggregate stats (count/sum) via separate queries.
async function getUpcomingMatches(userId: string): Promise<UpcomingMatch[]> {
  const matches = await prisma.match.findMany({
    where: { status: "SCHEDULED", kickoffTime: { gt: new Date() } },
    orderBy: { kickoffTime: "asc" },
    take: 4,
    select: {
      id: true,
      kickoffTime: true,
      stage: true,
      group: true,
      homeTeam: { select: { name: true, code: true, flagUrl: true } },
      awayTeam: { select: { name: true, code: true, flagUrl: true } },
    },
  });

  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => m.id);

  // Fetch only the current user's predictions for these matches
  const userPredictions = await prisma.prediction.findMany({
    where: { userId, matchId: { in: matchIds } },
    select: { matchId: true, homeScore: true, awayScore: true },
  });

  const userPredMap = new Map(userPredictions.map((p) => [p.matchId, p]));

  // Fetch aggregate stats (count + avg) per match — no individual user data leaked
  const aggregates = await prisma.prediction.groupBy({
    by: ["matchId"],
    where: { matchId: { in: matchIds } },
    _count: true,
    _avg: { homeScore: true, awayScore: true },
  });

  const aggMap = new Map(aggregates.map((a) => [a.matchId, a]));

  return matches.map((m) => {
    const userPred = userPredMap.get(m.id);
    const agg = aggMap.get(m.id);

    const avgPrediction =
      agg && agg._count > 0 && agg._avg.homeScore != null && agg._avg.awayScore != null
        ? {
            home: Math.round(agg._avg.homeScore * 10) / 10,
            away: Math.round(agg._avg.awayScore * 10) / 10,
          }
        : null;

    return {
      id: m.id,
      kickoffTime: m.kickoffTime,
      stage: m.stage,
      group: m.group,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      userPrediction: userPred
        ? { homeScore: userPred.homeScore, awayScore: userPred.awayScore }
        : null,
      avgPrediction,
      totalPredictions: agg?._count ?? 0,
    };
  });
}

const HOME_FEED_LIMIT = 5;

async function getActivityFeed(currentUserId: string): Promise<ActivityItem[]> {
  const data = await getActivityFeedFull("all", undefined, HOME_FEED_LIMIT, currentUserId);
  return data.items;
}

// Q-1/DB-3: Fixed participation math.
// totalMatches = ALL matches. pending = SCHEDULED matches without a user prediction.
async function getParticipation(userId: string): Promise<ParticipationData> {
  const [totalMatches, completed, scheduledCount, predictedScheduledCount] =
    await Promise.all([
      prisma.match.count(),
      prisma.prediction.count({ where: { userId } }),
      prisma.match.count({ where: { status: "SCHEDULED" } }),
      prisma.prediction.count({
        where: {
          userId,
          match: { status: "SCHEDULED" },
        },
      }),
    ]);

  return {
    completed,
    pending: scheduledCount - predictedScheduledCount,
    totalMatches,
  };
}

async function getFirstKickoff(): Promise<Date | null> {
  // No status filter: once the first match goes LIVE/HALFTIME its kickoffTime is
  // in the past and calcTimeLeft clamps to 0, which is what we want. Filtering
  // by SCHEDULED would skip the in-progress match and count down to the next one.
  const match = await prisma.match.findFirst({
    orderBy: { kickoffTime: "asc" },
    select: { kickoffTime: true },
  });
  return match?.kickoffTime ?? null;
}

// Top 3 favorites based on tournament odds (American odds → lower = stronger)
const TOURNAMENT_ODDS: Record<string, number> = {
  ESP: 450, ENG: 550, FRA: 750, BRA: 750, ARG: 800,
  POR: 1100, GER: 1200, NED: 2000, NOR: 2500, BEL: 3000,
};

async function getTopFavorites(): Promise<TournamentFavorite[]> {
  const topCodes = Object.entries(TOURNAMENT_ODDS)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([code]) => code);

  const teams = await prisma.team.findMany({
    where: { code: { in: topCodes } },
    select: { name: true, code: true, flagUrl: true },
  });

  return topCodes.map((code) => {
    const team = teams.find((t) => t.code === code);
    return {
      name: team?.name ?? code,
      code,
      flagUrl: team?.flagUrl ?? null,
      odds: TOURNAMENT_ODDS[code],
    };
  });
}

async function getLatestHighlights(): Promise<ResolvedNugget[] | null> {
  const activity = await prisma.activity.findFirst({
    where: { type: "DAILY_HIGHLIGHTS" },
    orderBy: { createdAt: "desc" },
    select: { highlightsJson: true },
  });

  if (!activity?.highlightsJson) return null;

  const nuggets = activity.highlightsJson as unknown as HighlightNugget[];
  const resolved = await resolveNuggets(nuggets);
  return resolved.slice(0, 4);
}

async function getNextFavoriteTeamMatch(userId: string): Promise<NextFavoriteTeamMatch | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { favoriteTeamId: true },
  });

  if (!user?.favoriteTeamId) return null;

  const match = await prisma.match.findFirst({
    where: {
      status: "SCHEDULED",
      kickoffTime: { gt: new Date() },
      OR: [
        { homeTeamId: user.favoriteTeamId },
        { awayTeamId: user.favoriteTeamId },
      ],
    },
    orderBy: { kickoffTime: "asc" },
    select: {
      id: true,
      kickoffTime: true,
      stage: true,
      homeTeamId: true,
      homeTeam: { select: { name: true, code: true, flagUrl: true, group: true } },
      awayTeam: { select: { name: true, code: true, flagUrl: true } },
    },
  });

  if (!match) return null;

  return {
    id: match.id,
    kickoffTime: match.kickoffTime.toISOString(),
    stage: match.stage,
    group: match.homeTeam.group,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    isFavoriteHome: match.homeTeamId === user.favoriteTeamId,
  };
}
