import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getWeekHistory } from "@/lib/queries/prediction-arena";

export async function GET() {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const history = await getWeekHistory(session.user.id);
  return NextResponse.json({ weeks: history });
}
