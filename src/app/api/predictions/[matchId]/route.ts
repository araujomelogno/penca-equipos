import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/predictions/[matchId] — get user's prediction for a match
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const t = await getTranslations("api");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { matchId } = await params;

  const prediction = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: session.user.id, matchId } },
    select: { homeScore: true, awayScore: true, points: true },
  });

  return NextResponse.json({ prediction });
}

// PUT /api/predictions/[matchId] — upsert single prediction
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const t = await getTranslations("api");
  const tP = await getTranslations("api.prediction");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const { matchId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("invalidJson") }, { status: 400 });
  }

  const { homeScore, awayScore } = body as { homeScore?: number; awayScore?: number };

  if (
    typeof homeScore !== "number" ||
    typeof awayScore !== "number" ||
    homeScore < 0 || homeScore > 20 ||
    awayScore < 0 || awayScore > 20
  ) {
    return NextResponse.json({ error: tP("scoresRange") }, { status: 400 });
  }

  // Verify match exists and hasn't started
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, kickoffTime: true },
  });

  if (!match) {
    return NextResponse.json({ error: tP("matchNotFound") }, { status: 404 });
  }

  if (match.kickoffTime <= new Date()) {
    return NextResponse.json({ error: tP("afterStarted") }, { status: 400 });
  }

  const userId = session.user.id;

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    update: { homeScore, awayScore },
    create: { userId, matchId, homeScore, awayScore },
    select: { homeScore: true, awayScore: true, points: true },
  });

  return NextResponse.json({ prediction });
}
