import { prisma } from "@/lib/prisma";
import { POINTS_EXACT, POINTS_CORRECT_WINNER } from "@/lib/queries/constants";

type Winner = "home" | "away" | "draw";

function getWinner(home: number, away: number): Winner {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

export function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): number {
  if (predHome === actualHome && predAway === actualAway) {
    return POINTS_EXACT;
  }
  if (getWinner(predHome, predAway) === getWinner(actualHome, actualAway)) {
    return POINTS_CORRECT_WINNER;
  }
  return 0;
}

export async function recalculateMatchPoints(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<number> {
  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    select: { id: true, homeScore: true, awayScore: true },
  });

  if (predictions.length === 0) return 0;

  await prisma.$transaction(
    predictions.map((p) =>
      prisma.prediction.update({
        where: { id: p.id },
        data: {
          points: calculatePoints(p.homeScore, p.awayScore, homeScore, awayScore),
        },
      }),
    ),
  );

  return predictions.length;
}
