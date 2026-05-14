import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/matches/[matchId]/chat/[commentId]/like — toggle like
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string; commentId: string }> },
) {
  const t = await getTranslations("api");
  const tC = await getTranslations("api.comment");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { matchId, commentId } = await params;
  const userId = session.user.id;

  // Verify comment belongs to this match
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, matchId },
    select: { id: true },
  });
  if (!comment) {
    return NextResponse.json({ error: tC("notFound") }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await tx.commentLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await tx.commentLike.create({ data: { userId, commentId } });
    return { liked: true };
  });

  return NextResponse.json(result);
}
