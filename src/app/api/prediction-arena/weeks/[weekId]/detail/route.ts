import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getWeekDetail, getCommunityVotes } from "@/lib/queries/prediction-arena";
import { getArenaParticipants } from "@/lib/queries/arena-participants";
import { mapWeekForView } from "@/lib/prediction-arena-weeks";

/**
 * Full detail for a single arena week, used by the history selector to swap
 * the main view to a past week on demand. Returns the week's events (with
 * results + the requesting user's own prediction), the participants list and
 * the community-vote breakdown — the same data the page SSRs for the current
 * week, so the client renders any week with the same components.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ weekId: string }> },
) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { weekId } = await params;
  const week = await getWeekDetail(weekId, session.user.id);
  if (!week) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }

  const [participants, communityVotes] = await Promise.all([
    getArenaParticipants(weekId),
    getCommunityVotes(weekId),
  ]);

  return NextResponse.json({
    week: mapWeekForView(week),
    participants,
    communityVotes,
  });
}
