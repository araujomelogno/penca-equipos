// Shared constants across query modules

export const POINTS_EXACT = 5;
export const POINTS_CORRECT_WINNER = 3;

export const KNOCKOUT_STAGES = ["R32", "R16", "QF", "SF", "FINAL"] as const;

export const STAGE_LABELS: Record<string, string> = {
  GROUP: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter Finals",
  SF: "Semi Finals",
  FINAL: "Final",
};
