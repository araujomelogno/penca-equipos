import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface PredictionInput {
  eventId: string;
  teamId: string | null; // null = "won't happen"
}

export async function PUT(request: Request) {
  const t = await getTranslations("api");
  const tP = await getTranslations("api.prediction");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const body = await request.json();
  const predictions = body.predictions as PredictionInput[];

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return NextResponse.json(
      { error: t("invalidJson") },
      { status: 400 },
    );
  }

  // Validate all events belong to an OPEN week and deadline hasn't passed
  const eventIds = predictions.map((p) => p.eventId);
  const events = await prisma.weeklyHitsEvent.findMany({
    where: { id: { in: eventIds } },
    include: { week: { select: { id: true, status: true, deadline: true } } },
  });

  if (events.length !== eventIds.length) {
    return NextResponse.json(
      { error: t("notFound") },
      { status: 404 },
    );
  }

  const week = events[0].week;
  if (week.status !== "OPEN") {
    return NextResponse.json(
      { error: tP("deadlinePassed") },
      { status: 400 },
    );
  }

  if (new Date() >= week.deadline) {
    return NextResponse.json(
      { error: tP("deadlinePassed") },
      { status: 400 },
    );
  }

  // Upsert all predictions in a transaction
  const userId = session.user!.id!;
  const upserts = predictions.map((p) =>
    prisma.weeklyHitsPrediction.upsert({
      where: {
        userId_eventId: { userId, eventId: p.eventId },
      },
      update: { teamId: p.teamId },
      create: {
        userId,
        eventId: p.eventId,
        teamId: p.teamId,
      },
    }),
  );

  await prisma.$transaction(upserts);

  logger.info(
    { userId: session.user.id, weekId: week.id, eventCount: predictions.length },
    "Weekly hits predictions saved",
  );

  return NextResponse.json({ saved: predictions.length });
}
