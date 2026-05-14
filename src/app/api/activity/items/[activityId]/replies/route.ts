import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/activity/items/[activityId]/replies — get replies to an activity (event)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { activityId } = await params;

  const replies = await prisma.comment.findMany({
    where: { activityId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      text: true,
      imageUrl: true,
      createdAt: true,
      user: { select: { nickname: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    replies: replies.map((r) => ({
      id: r.id,
      userId: r.userId,
      text: r.text,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
  });
}
