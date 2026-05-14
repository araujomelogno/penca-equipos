import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  generateHighlights,
  upsertHighlights,
  startOfDayUTC,
} from "@/lib/highlights";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // No body = use today's date
    }

    const targetDate = body.date
      ? startOfDayUTC(new Date(body.date as string))
      : startOfDayUTC(new Date());

    const nuggets = await generateHighlights(targetDate);

    if (nuggets.length === 0) {
      return NextResponse.json({ generated: false, reason: "no_highlights" });
    }

    const { action } = await upsertHighlights(targetDate, nuggets);
    logger.info(
      { date: targetDate.toISOString(), count: nuggets.length, action },
      "Highlights generated",
    );

    return NextResponse.json({
      generated: true,
      count: nuggets.length,
      updated: action === "updated",
    });
  } catch (err) {
    logger.error({ err }, "Highlights generation failed");
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
