import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseImageUrl } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const t = await getTranslations("api");
  const tC = await getTranslations("api.comment");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { commentId } = await params;

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

  const parent = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });

  if (!parent) {
    return NextResponse.json({ error: tC("parentNotFound") }, { status: 404 });
  }

  const reply = await prisma.comment.create({
    data: {
      userId: session.user.id,
      parentId: commentId,
      text: text || "",
      imageUrl,
    },
    select: {
      id: true,
      text: true,
      imageUrl: true,
      createdAt: true,
      user: { select: { nickname: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ reply }, { status: 201 });
}
