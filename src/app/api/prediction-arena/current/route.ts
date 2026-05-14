import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getCurrentWeek } from "@/lib/queries/prediction-arena";

export async function GET() {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const week = await getCurrentWeek(session.user.id);

  if (!week) {
    return NextResponse.json({ week: null });
  }

  // Hide other users' predictions before deadline
  const isPastDeadline = new Date() >= week.deadline;
  const isResolved = week.status === "RESOLVED";

  return NextResponse.json({
    week: {
      id: week.id,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      weekNumber: week.weekNumber,
      status: week.status,
      deadline: week.deadline,
      nostradamus: isResolved ? week.nostradamus : null,
      events: week.events.map((e) => ({
        id: e.id,
        orderIndex: e.orderIndex,
        emoji: e.emoji,
        title: e.title,
        description: e.description,
        result: isPastDeadline || isResolved ? e.result : null,
        resultTeam: isPastDeadline || isResolved ? e.resultTeam : null,
        userPrediction: e.predictions[0] ?? null,
      })),
    },
  });
}
