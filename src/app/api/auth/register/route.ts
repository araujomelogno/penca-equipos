import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { AVATAR_PRESETS, getPresetUrl } from "@/lib/avatarPresets";
import { EMAIL_REGEX, NICKNAME_REGEX } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const t = await getTranslations("api.register");
  const tCommon = await getTranslations("api");

  const ip = getClientIp(request);
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: tCommon("rateLimited") },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: tCommon("invalidJson") }, { status: 400 });
    }

    const { email, password, nickname, invitationCode, favoriteTeamId } = body as {
      email?: string;
      password?: string;
      nickname?: string;
      invitationCode?: string;
      favoriteTeamId?: string;
    };

    if (!email || !password || !nickname || !invitationCode) {
      return NextResponse.json({ error: t("allRequired") }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: t("invalidEmail") }, { status: 400 });
    }

    if (!NICKNAME_REGEX.test(nickname)) {
      return NextResponse.json({ error: t("nicknameChars") }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: t("passwordShort") }, { status: 400 });
    }

    if (nickname.length < 3) {
      return NextResponse.json({ error: t("nicknameShort") }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);

    await prisma.$transaction(async (tx) => {
      // Atomic claim: only succeeds if code is active, unexpired, and under its maxUses cap.
      // Using updateMany with a where guard makes this race-safe against concurrent registrations.
      const claim = await tx.invitationCode.updateMany({
        where: {
          code: invitationCode,
          isActive: true,
          expiresAt: { gt: new Date() },
          usageCount: { lt: tx.invitationCode.fields.maxUses },
        },
        data: { usageCount: { increment: 1 } },
      });

      if (claim.count === 0) {
        throw new Error("INVALID_INVITATION_CODE");
      }

      if (favoriteTeamId) {
        const team = await tx.team.findUnique({ where: { id: favoriteTeamId } });
        if (!team) throw new Error("INVALID_TEAM");
      }

      const randomPreset = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          nickname,
          isActive: true,
          avatarPreset: randomPreset.id,
          avatarUrl: getPresetUrl(randomPreset.id),
          favoriteTeamId: favoriteTeamId || undefined,
        },
      });

      await tx.activity.create({
        data: { type: "USER_JOINED", userId: user.id },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INVITATION_CODE") {
      return NextResponse.json({ error: t("invalidCode") }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INVALID_TEAM") {
      return NextResponse.json({ error: t("invalidTeam") }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[]) ?? [];
      if (target.includes("email")) {
        return NextResponse.json({ error: t("emailTaken") }, { status: 409 });
      }
      if (target.includes("nickname")) {
        return NextResponse.json({ error: t("nicknameTaken") }, { status: 409 });
      }
      return NextResponse.json({ error: t("uniqueViolation") }, { status: 409 });
    }

    logger.error({ err: error }, "Registration failed");
    return NextResponse.json({ error: tCommon("unexpected") }, { status: 500 });
  }
}
