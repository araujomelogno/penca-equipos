import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseImageUrl } from "@/lib/validation";

// POST /api/matches/[matchId]/chat/[commentId]/reply — reply to root comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string; commentId: string }> },
) {
  const t = await getTranslations("api");
  const tC = await getTranslations("api.comment");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { matchId, commentId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("invalidJson") }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const imageUrl = parseImageUrl(body.imageUrl);

  if (!text && !imageUrl) {
    return NextResponse.json({ error: tC("messageEmpty") }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: tC("maxChars") }, { status: 400 });
  }

  // Verify parent comment exists and is a root comment
  const parent = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, parentId: true, matchId: true },
  });

  if (!parent) {
    return NextResponse.json({ error: tC("notFound") }, { status: 404 });
  }

  if (parent.parentId !== null) {
    return NextResponse.json(
      { error: "Cannot reply to a reply" }, // TODO: add i18n key for this error
      { status: 400 },
    );
  }

  if (parent.matchId !== matchId) {
    return NextResponse.json({ error: "Comment does not belong to this match" }, { status: 400 }); // TODO: add i18n key for this error
  }

  const reply = await prisma.comment.create({
    data: {
      userId: session.user.id,
      matchId,
      parentId: commentId,
      text: text || "",
      imageUrl,
    },
    select: {
      id: true,
      text: true,
      imageUrl: true,
      createdAt: true,
      user: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    id: reply.id,
    text: reply.text,
    imageUrl: reply.imageUrl,
    createdAt: reply.createdAt.toISOString(),
    user: reply.user,
    likeCount: 0,
    liked: false,
  });
}
