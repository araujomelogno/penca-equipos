import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVATAR_PRESETS } from "@/lib/avatarPresets";

// PUT /api/profile — update nickname, fullName, avatarPreset
export async function PUT(request: Request) {
  const t = await getTranslations("api");
  const tProfile = await getTranslations("api.profile");
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

  const userId = session.user.id;
  const updates: Record<string, unknown> = {};

  // Nickname
  if (typeof body.nickname === "string") {
    const nickname = body.nickname.trim();
    if (nickname.length < 3 || nickname.length > 30) {
      return NextResponse.json(
        { error: tProfile("nicknameLength") },
        { status: 400 },
      );
    }

    // Check uniqueness (excluding current user)
    const existing = await prisma.user.findFirst({
      where: { nickname, id: { not: userId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: tProfile("nicknameTaken") },
        { status: 409 },
      );
    }
    updates.nickname = nickname;
  }

  // Full name
  if (typeof body.fullName === "string") {
    updates.fullName = body.fullName.trim() || null;
  }

  // Favorite team
  if (typeof body.favoriteTeamId === "string") {
    if (body.favoriteTeamId === "") {
      updates.favoriteTeamId = null;
    } else {
      const team = await prisma.team.findUnique({ where: { id: body.favoriteTeamId }, select: { id: true } });
      if (!team) {
        return NextResponse.json({ error: tProfile("invalidTeam") }, { status: 400 });
      }
      updates.favoriteTeamId = team.id;
    }
  }

  // Avatar preset
  if (typeof body.avatarPreset === "string") {
    const preset = AVATAR_PRESETS.find((p) => p.id === body.avatarPreset);
    if (!preset) {
      return NextResponse.json({ error: tProfile("invalidAvatar") }, { status: 400 });
    }
    updates.avatarPreset = preset.id;
    updates.avatarUrl = preset.url;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: tProfile("noFields") }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: {
      nickname: true,
      fullName: true,
      avatarUrl: true,
      avatarPreset: true,
    },
  });

  return NextResponse.json({ user });
}
