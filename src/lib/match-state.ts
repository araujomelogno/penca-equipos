// Derive "locked" and "presumed finished" purely from kickoffTime + stage,
// as a fallback for when match.status lags behind (the API-Football sync batch
// only flips status periodically). See queries/matches.ts and MatchCard.tsx.

import { KNOCKOUT_STAGES } from "./queries/constants";

// Wall-clock from kickoff after which a match must have ended.
// GROUP: 90' + ~15' halftime + ~15' stoppage ≈ 2h.
// KNOCKOUT: the above + extra time + penalties ≈ 2.5h.
export const GROUP_FINISHED_MARGIN_MS = 2 * 60 * 60 * 1000;
export const KNOCKOUT_FINISHED_MARGIN_MS = 2.5 * 60 * 60 * 1000;

const NON_PLAYABLE_STATUSES = ["POSTPONED", "CANCELLED"] as const;

export function isLocked(match: { kickoffTime: Date }, now: Date): boolean {
  return match.kickoffTime.getTime() <= now.getTime();
}

export function finishedMarginMs(stage: string): number {
  return (KNOCKOUT_STAGES as readonly string[]).includes(stage)
    ? KNOCKOUT_FINISHED_MARGIN_MS
    : GROUP_FINISHED_MARGIN_MS;
}

export function isPresumedFinished(
  match: { kickoffTime: Date; status: string; stage: string },
  now: Date,
): boolean {
  if (match.status === "FINISHED") return true;
  if ((NON_PLAYABLE_STATUSES as readonly string[]).includes(match.status)) return false;
  return match.kickoffTime.getTime() + finishedMarginMs(match.stage) <= now.getTime();
}

export type MatchCardState = "finished" | "editable" | "awaiting" | "ongoing";

// Which render branch a match card should show.
// "awaiting" = kickoff passed but status is still SCHEDULED (sync lag): the
// prediction is locked, so we show a read-only "awaiting result" instead of the
// edit button (which would let the user attempt a write the backend rejects).
export function matchCardState(
  match: { kickoffTime: Date; status: string; stage: string },
  now: Date,
): MatchCardState {
  if (match.status === "FINISHED") return "finished";
  if (match.status === "SCHEDULED") {
    return isLocked(match, now) ? "awaiting" : "editable";
  }
  return "ongoing";
}

// Prisma `OR` clause matching the same logic as isPresumedFinished, so the
// "Terminados" filter can be evaluated in the database (no N+1).
export function presumedFinishedOrWhere(now: Date) {
  return [
    { status: "FINISHED" },
    {
      stage: "GROUP",
      status: { notIn: [...NON_PLAYABLE_STATUSES] },
      kickoffTime: { lt: new Date(now.getTime() - GROUP_FINISHED_MARGIN_MS) },
    },
    {
      stage: { in: [...KNOCKOUT_STAGES] },
      status: { notIn: [...NON_PLAYABLE_STATUSES] },
      kickoffTime: { lt: new Date(now.getTime() - KNOCKOUT_FINISHED_MARGIN_MS) },
    },
  ];
}
