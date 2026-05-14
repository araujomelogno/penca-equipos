import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getActivityFeed, type ActivityFilter } from "@/lib/queries/activity";

const VALID_FILTERS = new Set(["all", "comments", "events"]);

export async function GET(request: Request) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all";
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 15, 1), 50) : 15;

  if (!VALID_FILTERS.has(type)) {
    return NextResponse.json({ error: "Invalid filter type" }, { status: 400 }); // TODO: add i18n key for this error
  }

  const data = await getActivityFeed(type as ActivityFilter, cursor, limit, session.user.id);

  return NextResponse.json(data);
}
