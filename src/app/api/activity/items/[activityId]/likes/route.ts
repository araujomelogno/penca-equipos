import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getActivityLikers } from "@/lib/queries/likers";

// GET /api/activity/items/[activityId]/likes — who liked this activity
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { activityId } = await params;
  const likers = await getActivityLikers(activityId);
  return NextResponse.json({ likers });
}
