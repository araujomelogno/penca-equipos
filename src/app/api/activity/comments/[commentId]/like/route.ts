import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { commentId } = await params;
  const userId = session.user.id;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await tx.commentLike.delete({ where: { id: existing.id } });
    } else {
      await tx.commentLike.create({
        data: { userId, commentId },
      });
    }

    const likes = await tx.commentLike.count({ where: { commentId } });
    return { liked: !existing, likes };
  });

  return NextResponse.json(result);
}
