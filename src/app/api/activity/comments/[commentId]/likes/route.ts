import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getCommentLikers } from "@/lib/queries/likers";

// GET /api/activity/comments/[commentId]/likes — who liked this comment
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
  const likers = await getCommentLikers(commentId);
  return NextResponse.json({ likers });
}
