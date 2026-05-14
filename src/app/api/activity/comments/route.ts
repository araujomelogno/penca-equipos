import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseImageUrl } from "@/lib/validation";

export async function POST(request: Request) {
  const t = await getTranslations("api");
  const tC = await getTranslations("api.comment");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("invalidJson") }, { status: 400 });
  }

  const userId = session.user.id;
  const text = typeof body.text === "string" ? body.text : undefined;
  const imageUrl = parseImageUrl(body.imageUrl);
  const hasImage = !!imageUrl;

  if ((!text || text.trim().length === 0) && !hasImage) {
    return NextResponse.json(
      { error: tC("messageEmpty") },
      { status: 400 },
    );
  }

  if (text && text.trim().length > 500) {
    return NextResponse.json(
      { error: tC("maxChars") },
      { status: 400 },
    );
  }

  const comment = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        userId,
        text: text?.trim() || "",
        ...(hasImage && { imageUrl }),
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        user: { select: { nickname: true, avatarUrl: true } },
      },
    });
    await tx.activity.create({
      data: { type: "COMMENT", commentId: c.id, createdAt: c.createdAt },
    });
    return c;
  });

  return NextResponse.json({ comment }, { status: 201 });
}
