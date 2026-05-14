import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { requireCronSecret } from "@/lib/cron-guard";
import {
  generateHighlights,
  upsertHighlights,
  startOfDayUTC,
} from "@/lib/highlights";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const t = await getTranslations("api");
  const { error } = requireCronSecret(request);
  if (error) return error;

  try {
    const targetDate = startOfDayUTC(new Date());
    const nuggets = await generateHighlights(targetDate);

    if (nuggets.length === 0) {
      logger.info({ date: targetDate.toISOString() }, "Cron highlights: nothing to generate");
      return NextResponse.json({ generated: false, reason: "no_highlights" });
    }

    const { action } = await upsertHighlights(targetDate, nuggets);
    logger.info(
      { date: targetDate.toISOString(), count: nuggets.length, action },
      "Cron highlights generated",
    );

    return NextResponse.json({
      generated: true,
      count: nuggets.length,
      updated: action === "updated",
    });
  } catch (err) {
    logger.error({ err }, "Cron highlights generation failed");
    return NextResponse.json(
      { error: t("unexpected") },
      { status: 500 },
    );
  }
}
