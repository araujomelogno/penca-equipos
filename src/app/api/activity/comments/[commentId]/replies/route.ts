import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { commentId } = await params;

  const replies = await prisma.comment.findMany({
    where: { parentId: commentId },
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

  return NextResponse.json({ replies });
}
