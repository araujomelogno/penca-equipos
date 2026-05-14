import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { commentId } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }

  if (comment.userId !== session.user.id) {
    return NextResponse.json({ error: t("forbidden") }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.commentLike.deleteMany({ where: { comment: { parentId: commentId } } }),
    prisma.comment.deleteMany({ where: { parentId: commentId } }),
    prisma.commentLike.deleteMany({ where: { commentId } }),
    prisma.comment.delete({ where: { id: commentId } }),
  ]);

  return NextResponse.json({ success: true });
}
