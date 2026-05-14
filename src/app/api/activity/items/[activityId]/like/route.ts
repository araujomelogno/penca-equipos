import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/activity/items/[activityId]/like — toggle like on an activity (event)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const t = await getTranslations("api");
  const tC = await getTranslations("api.comment");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { activityId } = await params;
  const userId = session.user.id;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true },
  });

  if (!activity) {
    return NextResponse.json({ error: tC("activityNotFound") }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.activityLike.findUnique({
      where: { userId_activityId: { userId, activityId } },
    });

    if (existing) {
      await tx.activityLike.delete({ where: { id: existing.id } });
    } else {
      await tx.activityLike.create({
        data: { userId, activityId },
      });
    }

    const likes = await tx.activityLike.count({ where: { activityId } });
    return { liked: !existing, likes };
  });

  return NextResponse.json(result);
}
