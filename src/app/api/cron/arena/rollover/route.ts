import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { defaultLocale } from "@/i18n/config";
import { rolloverArenaWeek } from "@/lib/prediction-arena-rollover";
import en from "../../../../../../messages/en.json";
import es from "../../../../../../messages/es.json";

// Creates this week's OPEN arena with the default events (in DEFAULT_LOCALE) if
// it does not exist yet. Idempotent — safe to call repeatedly. Intended to run
// every Monday early UTC via the host crontab (see deploy/crontab-additions.txt).
export async function POST(request: Request) {
  const t = await getTranslations("api");
  const { error } = requireCronSecret(request);
  if (error) return error;

  try {
    const messages = defaultLocale === "es" ? es : en;
    const result = await rolloverArenaWeek(prisma, messages);

    if (result.action === "skipped") {
      logger.info(
        { weekStart: result.weekStart.toISOString(), reason: result.reason },
        "Cron arena rollover: skipped",
      );
      return NextResponse.json({ created: false, reason: result.reason });
    }

    logger.info(
      { weekId: result.weekId, weekNumber: result.weekNumber, weekStart: result.weekStart.toISOString() },
      "Cron arena rollover: week created",
    );
    return NextResponse.json({
      created: true,
      weekNumber: result.weekNumber,
      weekId: result.weekId,
    });
  } catch (err) {
    logger.error({ err }, "Cron arena rollover failed");
    return NextResponse.json({ error: t("unexpected") }, { status: 500 });
  }
}
