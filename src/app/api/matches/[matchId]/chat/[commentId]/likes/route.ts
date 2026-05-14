import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCommentLikers } from "@/lib/queries/likers";

// GET /api/matches/[matchId]/chat/[commentId]/likes — who liked this comment
export async function GET(
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

  // Verify comment belongs to this match
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, matchId },
    select: { id: true },
  });
  if (!comment) {
    return NextResponse.json({ error: tC("notFound") }, { status: 404 });
  }

  const likers = await getCommentLikers(commentId);
  return NextResponse.json({ likers });
}
