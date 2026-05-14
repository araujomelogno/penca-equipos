import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { calculateWeekPoints } from "@/lib/queries/prediction-arena";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { eventId } = await params;
  const body = await request.json();
  const { result, resultTeamId } = body as {
    result: "HAPPENED" | "NO_HAPPENED";
    resultTeamId?: string | null;
  };

  if (!result || !["HAPPENED", "NO_HAPPENED"].includes(result)) {
    return NextResponse.json(
      { error: "result must be HAPPENED or NO_HAPPENED" },
      { status: 400 },
    );
  }

  if (result === "HAPPENED" && !resultTeamId) {
    return NextResponse.json(
      { error: "resultTeamId required when HAPPENED" },
      { status: 400 },
    );
  }

  const event = await prisma.weeklyHitsEvent.findUnique({
    where: { id: eventId },
    include: { week: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    );
  }

  // Update the event result
  const updated = await prisma.weeklyHitsEvent.update({
    where: { id: eventId },
    data: {
      result,
      resultTeamId: result === "HAPPENED" ? resultTeamId : null,
    },
    include: {
      resultTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
    },
  });

  logger.info(
    { eventId, result, resultTeamId: updated.resultTeamId },
    "Weekly hits event resolved",
  );

  // Check if all 6 events are now resolved
  const allEvents = await prisma.weeklyHitsEvent.findMany({
    where: { weekId: event.weekId },
    select: { result: true },
  });

  const allResolved = allEvents.every((e) => e.result !== null);

  if (allResolved) {
    const scoring = await calculateWeekPoints(event.weekId);
    logger.info(
      { weekId: event.weekId, nostradamusId: scoring.nostradamusId, maxScore: scoring.maxScore },
      "Weekly hits week fully resolved",
    );
    return NextResponse.json({ event: updated, weekResolved: true, ...scoring });
  }

  return NextResponse.json({ event: updated, weekResolved: false });
}
