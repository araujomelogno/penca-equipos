import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { recalculateMatchPoints } from "@/lib/scoring";

interface ScoreOverride {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { scores } = body as { scores?: ScoreOverride[] };

  if (!Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json(
      { error: "scores array is required" },
      { status: 400 },
    );
  }

  for (const s of scores) {
    if (
      !s.matchId ||
      typeof s.homeScore !== "number" ||
      typeof s.awayScore !== "number" ||
      s.homeScore < 0 ||
      s.awayScore < 0
    ) {
      return NextResponse.json(
        { error: "matchId, homeScore and awayScore required (scores >= 0)" },
        { status: 400 },
      );
    }
  }

  let totalRecalculated = 0;

  for (const s of scores) {
    const match = await prisma.match.findUnique({
      where: { id: s.matchId },
      select: { id: true, status: true },
    });

    if (!match) {
      return NextResponse.json(
        { error: `Match not found: ${s.matchId}` },
        { status: 404 },
      );
    }

    await prisma.match.update({
      where: { id: s.matchId },
      data: {
        homeScore: s.homeScore,
        awayScore: s.awayScore,
        status: "FINISHED",
        scoreSource: "MANUAL",
        lastSyncedAt: new Date(),
      },
    });

    if (match.status !== "FINISHED") {
      await prisma.activity.upsert({
        where: { type_matchId: { type: "MATCH_RESULT", matchId: s.matchId } },
        create: { type: "MATCH_RESULT", matchId: s.matchId },
        update: {},
      });
    }

    const count = await recalculateMatchPoints(
      s.matchId,
      s.homeScore,
      s.awayScore,
    );
    totalRecalculated += count;
  }

  return NextResponse.json({
    updated: scores.length,
    recalculated: totalRecalculated,
  });
}
