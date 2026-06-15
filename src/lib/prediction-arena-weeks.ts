/**
 * Pure helpers for the Prediction Arena week selector.
 *
 * No Prisma / IO here so this is fully unit-testable. The page and the
 * `/weeks/[weekId]/detail` route both reuse `mapWeekForView` to turn the raw
 * query shape (events with a per-user `predictions` array) into the shape the
 * client view consumes (`userPrediction`).
 */

export interface WeekOption {
  id: string;
  weekNumber: number;
  status: string;
  nostradamusNickname: string | null;
  isCurrent: boolean;
}

interface WeekLike {
  id: string;
  weekNumber: number;
  status: string;
  nostradamus?: { nickname: string } | null;
}

interface HistoryWeekLike {
  id: string;
  weekNumber: number;
  nostradamus?: { nickname: string } | null;
}

/**
 * Build the dropdown options: the current week (if any) plus every resolved
 * week, deduped by id and sorted most-recent-first (by weekNumber desc).
 * The current week is flagged so the UI can label it "(current)".
 */
export function buildWeekOptions(
  current: WeekLike | null,
  history: HistoryWeekLike[],
): WeekOption[] {
  const byId = new Map<string, WeekOption>();

  for (const w of history) {
    byId.set(w.id, {
      id: w.id,
      weekNumber: w.weekNumber,
      status: "RESOLVED",
      nostradamusNickname: w.nostradamus?.nickname ?? null,
      isCurrent: false,
    });
  }

  if (current) {
    const existing = byId.get(current.id);
    if (existing) {
      existing.isCurrent = true;
    } else {
      byId.set(current.id, {
        id: current.id,
        weekNumber: current.weekNumber,
        status: current.status,
        nostradamusNickname: current.nostradamus?.nickname ?? null,
        isCurrent: true,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.weekNumber - a.weekNumber);
}

/**
 * Collapse the per-user `predictions` array (always 0 or 1 row, scoped to the
 * requesting user by the query) into a single `userPrediction` field.
 */
export function mapWeekForView<
  E extends { predictions: unknown[] },
  W extends { events: E[] },
>(week: W): Omit<W, "events"> & {
  events: (Omit<E, "predictions"> & { userPrediction: unknown })[];
} {
  return {
    ...week,
    events: week.events.map((e) => {
      const { predictions, ...rest } = e;
      return { ...rest, userPrediction: predictions[0] ?? null };
    }),
  };
}
