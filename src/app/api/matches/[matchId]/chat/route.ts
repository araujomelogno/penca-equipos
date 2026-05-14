import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseImageUrl } from "@/lib/validation";

// GET /api/matches/[matchId]/chat — paginated root comments with replies
export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { matchId } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const comments = await prisma.comment.findMany({
    where: { matchId, parentId: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      text: true,
      imageUrl: true,
      createdAt: true,
      user: { select: { id: true, nickname: true, avatarUrl: true } },
      _count: { select: { likes: true, replies: true } },
      likes: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          text: true,
          imageUrl: true,
          createdAt: true,
          user: { select: { id: true, nickname: true, avatarUrl: true } },
          _count: { select: { likes: true } },
          likes: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        },
      },
    },
  });

  const data = comments.map((c) => ({
    id: c.id,
    text: c.text,
    imageUrl: c.imageUrl,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
    likeCount: c._count.likes,
    replyCount: c._count.replies,
    liked: c.likes.length > 0,
    replies: c.replies.map((r) => ({
      id: r.id,
      text: r.text,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
      likeCount: r._count.likes,
      liked: r.likes.length > 0,
    })),
  }));

  const nextCursor = comments.length === limit ? comments[comments.length - 1].id : null;

  return NextResponse.json({ comments: data, nextCursor });
}

// POST /api/matches/[matchId]/chat — create root comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const t = await getTranslations("api");
  const tC = await getTranslations("api.comment");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const userId = session.user.id;
  const { matchId } = await params;

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

  // Verify match exists
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  });

  if (!match) {
    return NextResponse.json({ error: tC("matchNotFound") }, { status: 404 });
  }

  const comment = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        userId,
        matchId,
        text,
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
    await tx.activity.create({
      data: { type: "COMMENT", commentId: c.id, createdAt: c.createdAt },
    });
    return c;
  });

  return NextResponse.json({
    id: comment.id,
    text: comment.text,
    imageUrl: comment.imageUrl,
    createdAt: comment.createdAt.toISOString(),
    user: comment.user,
    likeCount: 0,
    replyCount: 0,
    liked: false,
    replies: [],
  });
}
