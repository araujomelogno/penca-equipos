import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface EventUpdate {
  id?: string;
  emoji: string;
  title: string;
  description: string;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { weekId } = await params;
  const body = await request.json();
  const { events, status } = body as {
    events?: EventUpdate[];
    status?: "DRAFT" | "OPEN" | "CLOSED";
  };

  const week = await prisma.weeklyHitsWeek.findUnique({
    where: { id: weekId },
  });

  if (!week) {
    return NextResponse.json(
      { error: "Week not found" },
      { status: 404 },
    );
  }

  // Can only edit events in DRAFT or OPEN
  if (events && week.status !== "DRAFT" && week.status !== "OPEN") {
    return NextResponse.json(
      { error: "Cannot edit events of a closed week" },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};

  if (status) {
    updateData.status = status;
  }

  // Update events if provided
  if (events && events.length === 6) {
    // Delete existing events and recreate
    await prisma.weeklyHitsEvent.deleteMany({ where: { weekId } });
    await prisma.weeklyHitsEvent.createMany({
      data: events.map((e, i) => ({
        weekId,
        orderIndex: i + 1,
        emoji: e.emoji,
        title: e.title,
        description: e.description,
      })),
    });
  }

  const updated = await prisma.weeklyHitsWeek.update({
    where: { id: weekId },
    data: updateData,
    include: { events: { orderBy: { orderIndex: "asc" } } },
  });

  logger.info({ weekId, status: updated.status }, "Weekly hits week updated");

  return NextResponse.json({ week: updated });
}
