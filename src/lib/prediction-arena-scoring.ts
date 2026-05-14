type EventResult = "HAPPENED" | "NO_HAPPENED";

interface EventForScoring {
  result: EventResult | null;
  resultTeamId: string | null;
}

interface PredictionForScoring {
  teamId: string | null; // null = predicted "won't happen"
}

/**
 * Calculate points for a single event prediction.
 * - Predicted "won't happen" + didn't happen → 1pt
 * - Predicted "won't happen" + happened → 0pt
 * - Predicted team + didn't happen → 0pt
 * - Predicted team + happened with different team → 2pt
 * - Predicted team + happened with correct team → 5pt
 */
export function calculateEventPoints(
  prediction: PredictionForScoring,
  event: EventForScoring,
): number {
  if (event.result === null) return 0; // not resolved yet

  const predictedNoHappen = prediction.teamId === null;
  const didNotHappen = event.result === "NO_HAPPENED";

  if (predictedNoHappen && didNotHappen) return 1;
  if (predictedNoHappen && !didNotHappen) return 0;
  if (!predictedNoHappen && didNotHappen) return 0;

  // Predicted a team and event happened
  if (prediction.teamId === event.resultTeamId) return 5;
  return 2;
}

export const POINTS_NO_HAPPEN = 1;
export const POINTS_HAPPENED_WRONG_TEAM = 2;
export const POINTS_HAPPENED_CORRECT_TEAM = 5;
