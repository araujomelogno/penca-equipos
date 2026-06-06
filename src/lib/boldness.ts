/**
 * Scoreline "boldness" model — single source of truth for the "bold call" badge.
 *
 * A prediction is a bold call when the EXACT predicted scoreline is very
 * unlikely, not merely when the 1X2 outcome (win/draw/loss) is unlikely. This
 * captures both "8-0 is bold even if you pick the winner" and "0-0 is only bold
 * when one side is so dominant that them not scoring is rare".
 *
 * Goals are modelled as independent Poisson variables. Expected goals (lambda)
 * per team are fit from the stored 1X2 probabilities, then the probability of
 * the exact scoreline is Poisson(home; λh) * Poisson(away; λa).
 *
 * Used by both the match-detail badge (computeBadges) and the daily highlights
 * (boldCallNuggets) so the definition stays consistent.
 */

export type OutcomeProbs = {
  home: number | null;
  draw: number | null;
  away: number | null;
};

/** A predicted exact scoreline rarer than this (4%) counts as a bold call. Tunable. */
export const BOLD_CALL_THRESHOLD = 0.04;

// Goals considered when fitting 1X2 probabilities; the tail beyond this is
// negligible for realistic expected-goal values.
const MAX_GOALS = 10;

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  // Compute in log-space for numerical stability at larger k.
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

// Precomputed grid of candidate expected-goal values and their Poisson pmf
// arrays (built once at module load). λ from 0.1 to 5.0 in 0.1 steps.
const GRID_LAMBDAS: number[] = [];
for (let i = 1; i <= 50; i++) GRID_LAMBDAS.push(i / 10);
const GRID_PMF: number[][] = GRID_LAMBDAS.map((l) => {
  const arr: number[] = [];
  for (let g = 0; g <= MAX_GOALS; g++) arr.push(poissonPmf(g, l));
  return arr;
});

function outcomeProbsFromPmf(
  homePmf: number[],
  awayPmf: number[],
): { home: number; away: number } {
  let h = 0;
  let a = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = homePmf[i] * awayPmf[j];
      if (i > j) h += p;
      else if (i < j) a += p;
    }
  }
  return { home: h, away: a };
}

const fitCache = new Map<string, { home: number; away: number }>();

/**
 * Fit independent-Poisson expected goals (λ) to a set of 1X2 probabilities.
 * Probabilities are 0-100; the result is expected goals per team. Memoized per
 * distinct probability triple (boldness is computed for many predictions that
 * share the same match).
 */
export function fitGoalExpectations(probs: {
  home: number;
  draw: number;
  away: number;
}): { home: number; away: number } {
  const key = `${probs.home}|${probs.draw}|${probs.away}`;
  const cached = fitCache.get(key);
  if (cached) return cached;

  const total = probs.home + probs.draw + probs.away;
  const target =
    total > 0
      ? { home: probs.home / total, away: probs.away / total }
      : { home: 1 / 3, away: 1 / 3 };

  let best = { home: 1.3, away: 1.3 };
  let bestErr = Infinity;
  for (let hi = 0; hi < GRID_LAMBDAS.length; hi++) {
    for (let ai = 0; ai < GRID_LAMBDAS.length; ai++) {
      const o = outcomeProbsFromPmf(GRID_PMF[hi], GRID_PMF[ai]);
      const err = (o.home - target.home) ** 2 + (o.away - target.away) ** 2;
      if (err < bestErr) {
        bestErr = err;
        best = { home: GRID_LAMBDAS[hi], away: GRID_LAMBDAS[ai] };
      }
    }
  }

  fitCache.set(key, best);
  return best;
}

/** Probability (0-1) of the exact scoreline given the match's 1X2 probabilities (0-100). */
export function scorelineProbability(
  homeGoals: number,
  awayGoals: number,
  probs: { home: number; draw: number; away: number },
): number {
  const { home: lh, away: la } = fitGoalExpectations(probs);
  return poissonPmf(homeGoals, lh) * poissonPmf(awayGoals, la);
}

/** True when the exact predicted scoreline is rarer than the bold-call threshold. */
export function isBoldCall(
  homeGoals: number,
  awayGoals: number,
  probs: OutcomeProbs,
): boolean {
  if (probs.home == null || probs.draw == null || probs.away == null) return false;
  if (probs.home + probs.draw + probs.away <= 0) return false;
  return (
    scorelineProbability(homeGoals, awayGoals, {
      home: probs.home,
      draw: probs.draw,
      away: probs.away,
    }) <= BOLD_CALL_THRESHOLD
  );
}
