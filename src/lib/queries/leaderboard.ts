import { prisma } from "@/lib/prisma";
import { POINTS_EXACT, POINTS_CORRECT_WINNER } from "./constants";

export interface LeaderboardEntry {
  id: string;
  rank: number;
  nickname: string;
  avatarUrl: string | null;
  totalPoints: number;
  exactScores: number;
  correctWinners: number;
  matchesScored: number;
}

export async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
  const [users, scoredPredictions] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, nickname: true, avatarUrl: true },
    }),
    prisma.prediction.findMany({
      where: { points: { not: null } },
      select: { userId: true, points: true },
    }),
  ]);

  const statsMap = new Map<
    string,
    { totalPoints: number; exactScores: number; correctWinners: number; matchesScored: number }
  >();

  for (const p of scoredPredictions) {
    const pts = p.points ?? 0;
    let entry = statsMap.get(p.userId);
    if (!entry) {
      entry = { totalPoints: 0, exactScores: 0, correctWinners: 0, matchesScored: 0 };
      statsMap.set(p.userId, entry);
    }
    entry.totalPoints += pts;
    entry.matchesScored++;
    if (pts === POINTS_EXACT) entry.exactScores++;
    else if (pts === POINTS_CORRECT_WINNER) entry.correctWinners++;
  }

  const entries: LeaderboardEntry[] = users
    .map((u) => {
      const stats = statsMap.get(u.id) ?? {
        totalPoints: 0,
        exactScores: 0,
        correctWinners: 0,
        matchesScored: 0,
      };
      return {
        id: u.id,
        rank: 0,
        nickname: u.nickname,
        avatarUrl: u.avatarUrl,
        ...stats,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.exactScores - a.exactScores; // tiebreak by exact scores
    });

  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}
