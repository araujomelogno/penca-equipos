import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getWeekBounds } from "@/lib/queries/prediction-arena";

interface EventInput {
  emoji: string;
  title: string;
  description: string;
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { events, status } = body as {
    events: EventInput[];
    status?: "DRAFT" | "OPEN";
  };

  if (!Array.isArray(events) || events.length !== 6) {
    return NextResponse.json(
      { error: "Exactly 6 events are required" },
      { status: 400 },
    );
  }

  // Deadline is always Tuesday 23:00 UTC (predictions Mon-Tue, matches Wed-Sun)
  // If we're past this week's deadline, target next week instead
  const now = new Date();
  let { weekStart, weekEnd } = getWeekBounds(now);
  let deadlineDate = new Date(weekStart);
  deadlineDate.setUTCDate(deadlineDate.getUTCDate() + 1); // Tuesday
  deadlineDate.setUTCHours(23, 0, 0, 0);

  if (now > deadlineDate) {
    const nextMonday = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    ({ weekStart, weekEnd } = getWeekBounds(nextMonday));
    deadlineDate = new Date(weekStart);
    deadlineDate.setUTCDate(deadlineDate.getUTCDate() + 1);
    deadlineDate.setUTCHours(23, 0, 0, 0);
  }

  // Check if week already exists
  const existing = await prisma.weeklyHitsWeek.findUnique({
    where: { weekStart },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A week already exists for this period" },
      { status: 400 },
    );
  }

  // Determine week number (count of existing weeks + 1)
  const weekCount = await prisma.weeklyHitsWeek.count();

  const week = await prisma.weeklyHitsWeek.create({
    data: {
      weekStart,
      weekEnd,
      weekNumber: weekCount + 1,
      status: status ?? "OPEN",
      deadline: deadlineDate,
      events: {
        create: events.map((e, i) => ({
          orderIndex: i + 1,
          emoji: e.emoji,
          title: e.title,
          description: e.description,
        })),
      },
    },
    include: { events: { orderBy: { orderIndex: "asc" } } },
  });

  logger.info(
    { weekId: week.id, weekNumber: week.weekNumber, deadline: deadlineDate.toISOString() },
    "Weekly hits week created",
  );

  return NextResponse.json({ week });
}
