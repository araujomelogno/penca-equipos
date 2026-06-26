/**
 * Weekly Prediction Arena rollover — single source of truth for "create this
 * week's arena". Used by both the cron route (src/app/api/cron/arena/rollover)
 * and the manual script (scripts/rollover-arena-week.ts).
 *
 * Rules:
 *  - The arena week is anchored to Monday 00:00 UTC, deadline Tuesday 23:00 UTC,
 *    ends Sunday 23:59:59.999 UTC (predictions Mon–Tue, matches Wed–Sun).
 *  - Idempotent: if an OPEN/CLOSED week already occupies this week's slot, skip.
 *  - If a RESOLVED week wrongly occupies the slot (created mid-week last time),
 *    shift it back to its true week before creating the new one.
 */
import { getWeekBounds } from "@/lib/queries/prediction-arena";
import { selectWeeklyEventKinds, ARENA_EVENT_TYPES_BY_KIND } from "@/lib/arena-resolution";

const DAY = 24 * 60 * 60 * 1000;

export interface ArenaWeekSlot {
  weekStart: Date;
  weekEnd: Date;
  deadline: Date;
}

/** The Monday-anchored slot (weekStart/weekEnd/deadline) for the given instant. */
export function arenaWeekSlot(now: Date = new Date()): ArenaWeekSlot {
  const { weekStart, weekEnd } = getWeekBounds(now);
  const deadline = new Date(weekStart.getTime() + DAY); // Tuesday
  deadline.setUTCHours(23, 0, 0, 0);
  return { weekStart, weekEnd, deadline };
}

export interface ArenaEventInput {
  orderIndex: number;
  emoji: string;
  title: string;
  description: string;
  kind: string;
}

interface DefaultsMessages {
  arena: { defaults: Record<string, { title: string; description: string }> };
}

/** Materialize the 6 rotated events for the given weekNumber from a locale's messages JSON. */
export function buildDefaultArenaEvents(messages: unknown, weekNumber: number): ArenaEventInput[] {
  const defaults = (messages as DefaultsMessages).arena.defaults;
  return selectWeeklyEventKinds(weekNumber).map((kind, i) => {
    const type = ARENA_EVENT_TYPES_BY_KIND.get(kind)!;
    const text = defaults[type.i18nKey];
    return {
      orderIndex: i + 1,
      emoji: type.emoji,
      title: text.title,
      description: text.description,
      kind,
    };
  });
}

// Structural subset of the Prisma client this module needs — lets the route
// pass the real client and tests pass an in-memory fake.
interface WeekRow {
  id: string;
  weekNumber: number;
  status: string;
  weekStart: Date;
  weekEnd: Date;
  deadline: Date;
}
export interface RolloverPrisma {
  weeklyHitsWeek: {
    findUnique(args: { where: { weekStart: Date } }): Promise<WeekRow | null>;
    count(): Promise<number>;
    create(args: {
      data: {
        weekStart: Date;
        weekEnd: Date;
        weekNumber: number;
        status: "OPEN";
        deadline: Date;
        events: { create: ArenaEventInput[] };
      };
    }): Promise<{ id: string; weekNumber: number }>;
    update(args: {
      where: { id: string };
      data: { weekStart: Date; weekEnd: Date; deadline: Date };
    }): Promise<unknown>;
  };
}

export type RolloverResult =
  | { action: "created"; weekId: string; weekNumber: number; weekStart: Date }
  | { action: "skipped"; reason: string; weekNumber: number; weekStart: Date };

/**
 * Create this week's OPEN arena if absent. Idempotent and installation-agnostic.
 * Builds the rotated events internally after resolving weekNumber = count + 1.
 */
export async function rolloverArenaWeek(
  prisma: RolloverPrisma,
  messages: unknown,
  now: Date = new Date(),
): Promise<RolloverResult> {
  const { weekStart, weekEnd, deadline } = arenaWeekSlot(now);

  const occupant = await prisma.weeklyHitsWeek.findUnique({ where: { weekStart } });
  if (occupant) {
    if (occupant.status !== "RESOLVED") {
      return {
        action: "skipped",
        reason: `slot already occupied by ${occupant.status} week #${occupant.weekNumber}`,
        weekNumber: occupant.weekNumber,
        weekStart,
      };
    }
    // A RESOLVED week mis-occupies the slot (was created mid-week). Shift it
    // back 7 days to its true week to free this slot.
    const shiftedStart = new Date(occupant.weekStart.getTime() - 7 * DAY);
    const collision = await prisma.weeklyHitsWeek.findUnique({ where: { weekStart: shiftedStart } });
    if (collision) {
      throw new Error(
        `Cannot shift resolved week #${occupant.weekNumber} back 7d — a week already exists at ${shiftedStart.toISOString()}.`,
      );
    }
    await prisma.weeklyHitsWeek.update({
      where: { id: occupant.id },
      data: {
        weekStart: shiftedStart,
        weekEnd: new Date(occupant.weekEnd.getTime() - 7 * DAY),
        deadline: new Date(occupant.deadline.getTime() - 7 * DAY),
      },
    });
  }

  const weekCount = await prisma.weeklyHitsWeek.count();
  const weekNumber = weekCount + 1;
  const events = buildDefaultArenaEvents(messages, weekNumber);
  const created = await prisma.weeklyHitsWeek.create({
    data: {
      weekStart,
      weekEnd,
      weekNumber,
      status: "OPEN",
      deadline,
      events: { create: events },
    },
  });

  return { action: "created", weekId: created.id, weekNumber: created.weekNumber, weekStart };
}
