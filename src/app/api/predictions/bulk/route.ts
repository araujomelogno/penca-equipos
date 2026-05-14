import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface PredictionInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export async function PUT(request: Request) {
  const t = await getTranslations("api");
  const tP = await getTranslations("api.prediction");
  try {
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

    const { predictions } = body as { predictions?: PredictionInput[] };

    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json({ error: tP("scoresRange") }, { status: 400 });
    }

    // Validate score ranges
    for (const p of predictions) {
      if (
        typeof p.homeScore !== "number" ||
        typeof p.awayScore !== "number" ||
        p.homeScore < 0 || p.homeScore > 20 ||
        p.awayScore < 0 || p.awayScore > 20
      ) {
        return NextResponse.json({ error: tP("scoresRange") }, { status: 400 });
      }
    }

    const userId = session.user.id;
    const matchIds = predictions.map((p) => p.matchId);

    // Fetch matches to validate they exist and haven't started
    const matches = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true, kickoffTime: true },
    });

    const matchMap = new Map(matches.map((m) => [m.id, m]));
    const now = new Date();
    const errors: { matchId: string; error: string }[] = [];
    const validPredictions: PredictionInput[] = [];

    for (const p of predictions) {
      const match = matchMap.get(p.matchId);
      if (!match) {
        errors.push({ matchId: p.matchId, error: "Match not found" });
        continue;
      }
      if (match.kickoffTime <= now) {
        errors.push({
          matchId: p.matchId,
          error: `Cannot predict match ${p.matchId}: already started`,
        });
        continue;
      }
      validPredictions.push(p);
    }

    // Save valid predictions atomically
    let saved = 0;
    if (validPredictions.length > 0) {
      await prisma.$transaction(
        validPredictions.map((p) =>
          prisma.prediction.upsert({
            where: {
              userId_matchId: { userId, matchId: p.matchId },
            },
            update: {
              homeScore: p.homeScore,
              awayScore: p.awayScore,
            },
            create: {
              userId,
              matchId: p.matchId,
              homeScore: p.homeScore,
              awayScore: p.awayScore,
            },
          }),
        ),
      );
      saved = validPredictions.length;
    }

    return NextResponse.json({
      saved,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error({ err: error }, "Bulk prediction save failed");
    return NextResponse.json({ error: t("unexpected") }, { status: 500 });
  }
}
