import { prisma } from "@/lib/prisma";

// --- Exported Types ---

export interface MatchDetailTeam {
  id: string;
  name: string;
  code: string;
  flagUrl: string | null;
}

export interface CommunityOdds {
  homeWin: number; // 0-100
  draw: number;    // 0-100
  awayWin: number; // 0-100
  total: number;   // total predictions counted
}

export interface MatchDetailData {
  match: {
    id: string;
    kickoffTime: Date;
    stage: string;
    group: string | null;
    venue: string | null;
    status: string;
    minuteClock: string | null;
    lastSyncedAt: Date | null;
    homeTeam: MatchDetailTeam;
    awayTeam: MatchDetailTeam;
    homeScore: number | null;
    awayScore: number | null;
    homeWinProb: number | null;
    drawProb: number | null;
    awayWinProb: number | null;
    analysis: string | null;
  };
  userPrediction: { homeScore: number; awayScore: number; points: number | null } | null;
  communityPredictions: ScoreDistribution[];
  communityOdds: CommunityOdds;
  commentCount: number;
  navigation: {
    prevMatch: { id: string; homeCode: string; awayCode: string } | null;
    nextMatch: { id: string; homeCode: string; awayCode: string } | null;
    currentIndex: number;
    totalMatches: number;
  };
}

export type PredictionBadge = "lone_wolf" | "bold_call";

export interface ScoreDistribution {
  score: string; // "2-0"
  count: number;
  percentage: number;
  badges: PredictionBadge[];
}

// --- Main query ---

export async function getMatchDetailData(
  matchId: string,
  userId: string,
): Promise<MatchDetailData | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      kickoffTime: true,
      stage: true,
      group: true,
      venue: true,
      status: true,
      minuteClock: true,
      lastSyncedAt: true,
      homeTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
      awayTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
      homeScore: true,
      awayScore: true,
      homeWinProb: true,
      drawProb: true,
      awayWinProb: true,
      analysis: true,
    },
  });

  if (!match) return null;

  const hasStarted = match.kickoffTime <= new Date();

  const [userPrediction, allPredictions, commentCount, navigation] = await Promise.all([
    prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
      select: { homeScore: true, awayScore: true, points: true },
    }),
    prisma.prediction.findMany({
      where: { matchId },
      select: { homeScore: true, awayScore: true },
    }),
    prisma.comment.count({ where: { matchId, parentId: null } }),
    getNavigation(match),
  ]);

  // Community predictions: aggregate score distributions
  const scoreCounts = new Map<string, number>();
  for (const p of allPredictions) {
    const key = `${p.homeScore}-${p.awayScore}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }

  const totalPredictions = allPredictions.length;
  const communityPredictions: ScoreDistribution[] = [...scoreCounts.entries()]
    .map(([score, count]) => ({
      score,
      count,
      percentage: totalPredictions > 0 ? Math.round((count / totalPredictions) * 100) : 0,
      badges: [] as PredictionBadge[],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Compute badges for each score row
  const outcomeCounts = countByOutcome(allPredictions);
  const probs = {
    home: match.homeWinProb,
    draw: match.drawProb,
    away: match.awayWinProb,
  };
  for (const p of communityPredictions) {
    p.badges = computeBadges(p.score, outcomeCounts, totalPredictions, probs);
  }

  // Community odds: implied win/draw/loss from predicted scores
  const communityOdds = computeCommunityOdds(allPredictions);

  return {
    match,
    userPrediction,
    communityPredictions,
    communityOdds,
    commentCount,
    navigation,
  };
}

// --- Community odds calculation ---

export function computeCommunityOdds(
  predictions: { homeScore: number; awayScore: number }[],
): CommunityOdds {
  const total = predictions.length;
  if (total === 0) return { homeWin: 0, draw: 0, awayWin: 0, total: 0 };

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  for (const p of predictions) {
    if (p.homeScore > p.awayScore) homeWins++;
    else if (p.homeScore === p.awayScore) draws++;
    else awayWins++;
  }

  return {
    homeWin: Math.round((homeWins / total) * 100),
    draw: Math.round((draws / total) * 100),
    awayWin: Math.round((awayWins / total) * 100),
    total,
  };
}

// --- Prediction badges ---

type Outcome = "home" | "draw" | "away";

function scoreToOutcome(score: string): Outcome {
  const [h, a] = score.split("-").map(Number);
  if (h > a) return "home";
  if (h < a) return "away";
  return "draw";
}

export function countByOutcome(
  predictions: { homeScore: number; awayScore: number }[],
): Record<Outcome, number> {
  const counts: Record<Outcome, number> = { home: 0, draw: 0, away: 0 };
  for (const p of predictions) {
    if (p.homeScore > p.awayScore) counts.home++;
    else if (p.homeScore < p.awayScore) counts.away++;
    else counts.draw++;
  }
  return counts;
}

export function computeBadges(
  score: string,
  outcomeCounts: Record<Outcome, number>,
  totalPredictions: number,
  probs: { home: number | null; draw: number | null; away: number | null },
): PredictionBadge[] {
  const badges: PredictionBadge[] = [];
  const outcome = scoreToOutcome(score);

  // Lone wolf: exactly 1 user predicted this outcome, at least 3 total predictions
  if (outcomeCounts[outcome] === 1 && totalPredictions >= 3) {
    badges.push("lone_wolf");
  }

  // Bold call: bookmaker probability for this outcome <= 15%
  const prob = probs[outcome];
  if (prob != null && prob > 0 && prob <= 15) {
    badges.push("bold_call");
  }

  return badges;
}

// --- Navigation: prev/next match in same group/stage ---

async function getNavigation(match: {
  id: string;
  stage: string;
  group: string | null;
  kickoffTime: Date;
}) {
  const allMatches = await prisma.match.findMany({
    orderBy: [{ kickoffTime: "asc" }, { group: "asc" }],
    select: {
      id: true,
      homeTeam: { select: { code: true } },
      awayTeam: { select: { code: true } },
    },
  });

  const idx = allMatches.findIndex((m) => m.id === match.id);
  const prev = idx > 0 ? allMatches[idx - 1] : null;
  const next = idx < allMatches.length - 1 ? allMatches[idx + 1] : null;

  return {
    prevMatch: prev
      ? { id: prev.id, homeCode: prev.homeTeam.code, awayCode: prev.awayTeam.code }
      : null,
    nextMatch: next
      ? { id: next.id, homeCode: next.homeTeam.code, awayCode: next.awayTeam.code }
      : null,
    currentIndex: idx,
    totalMatches: allMatches.length,
  };
}

// --- Chat types (used by API routes and ChatPanel) ---

export interface ChatComment {
  id: string;
  text: string;
  imageUrl: string | null;
  createdAt: string; // ISO
  user: { id: string; nickname: string; avatarUrl: string | null };
  likeCount: number;
  replyCount: number;
  liked: boolean;
  replies: ChatReply[];
}

export interface ChatReply {
  id: string;
  text: string;
  imageUrl: string | null;
  createdAt: string;
  user: { id: string; nickname: string; avatarUrl: string | null };
  likeCount: number;
  liked: boolean;
}
