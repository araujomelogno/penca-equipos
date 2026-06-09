import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-guard";
import { syncMatchResults } from "@/lib/match-sync";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const { error } = requireCronSecret(request);
  if (error) return error;

  try {
    const result = await syncMatchResults({ finishedOnly: true });
    logger.info(result, "Cron match sync completed");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Cron match sync failed");
    return NextResponse.json(
      { error: `Sync failed: ${message}` },
      { status: 500 },
    );
  }
}
