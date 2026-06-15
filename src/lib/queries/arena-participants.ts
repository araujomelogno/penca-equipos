import { prisma } from "@/lib/prisma";

export interface ParticipantUser {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  avatarPreset: string | null;
}

export interface ParticipantPrediction {
  userId: string;
  points: number | null;
  createdAt: Date | string;
  user: ParticipantUser;
}

export interface ArenaParticipant {
  user: ParticipantUser;
  predicted: number;
  weekPoints: number;
  earliest: number;
}

/**
 * Group a week's predictions by user into a sorted participant list.
 *
 * Order: most predictions first (progress N/6), tie-broken by weekly points
 * (relevant once a week is resolved), then by who predicted first.
 *
 * Pure function — no DB access, fully unit-testable.
 */
export function shapeParticipants(predictions: ParticipantPrediction[]): ArenaParticipant[] {
  const byUser = new Map<string, ArenaParticipant>();

  for (const p of predictions) {
    const ts = new Date(p.createdAt).getTime();
    const existing = byUser.get(p.userId);
    if (existing) {
      existing.predicted += 1;
      existing.weekPoints += p.points ?? 0;
      if (ts < existing.earliest) existing.earliest = ts;
    } else {
      byUser.set(p.userId, {
        user: p.user,
        predicted: 1,
        weekPoints: p.points ?? 0,
        earliest: ts,
      });
    }
  }

  return Array.from(byUser.values()).sort(
    (a, b) =>
      b.predicted - a.predicted ||
      b.weekPoints - a.weekPoints ||
      a.earliest - b.earliest,
  );
}

/**
 * Participants of the active arena week: every user with at least one prediction.
 */
export async function getArenaParticipants(weekId: string): Promise<ArenaParticipant[]> {
  const predictions = await prisma.weeklyHitsPrediction.findMany({
    where: { event: { weekId } },
    select: {
      userId: true,
      points: true,
      createdAt: true,
      user: { select: { id: true, nickname: true, avatarUrl: true, avatarPreset: true } },
    },
  });

  return shapeParticipants(predictions);
}
