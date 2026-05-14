import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const t = await getTranslations("api");
  const tOtp = await getTranslations("api.otp");

  const ip = getClientIp(request);
  const rl = rateLimit(`otp-verify:${ip}`, 20, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: t("rateLimited") },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const { email, code } = (await request.json()) as {
      email?: string;
      code?: string;
    };

    if (!email || !code) {
      return NextResponse.json({ error: tOtp("emailAndCodeRequired") }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: tOtp("invalidCode") }, { status: 401 });
    }

    const MAX_ATTEMPTS = 5;

    // Find active (unused, not expired) OTP
    const otp = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json({ error: tOtp("codeExpired") }, { status: 401 });
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      // Burn the OTP so it can't be retried; force a fresh request.
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      return NextResponse.json({ error: tOtp("codeExpired") }, { status: 401 });
    }

    const valid = await compare(code, otp.codeHash);
    if (!valid) {
      const updated = await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      // If this failure exhausts the budget, invalidate immediately.
      if (updated.attempts >= MAX_ATTEMPTS) {
        await prisma.otpCode.update({
          where: { id: otp.id },
          data: { usedAt: new Date() },
        });
      }
      return NextResponse.json({ error: tOtp("invalidCode") }, { status: 401 });
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    // Create session JWT manually (same shape as NextAuth credentials flow)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true, nickname: true, avatarUrl: true, avatarPreset: true },
    });

    const useSecureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    const cookieName = useSecureCookie
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: dbUser?.nickname,
        image: dbUser?.avatarUrl ?? dbUser?.avatarPreset ?? null,
        isAdmin: dbUser?.isAdmin ?? false,
        nickname: dbUser?.nickname,
        sub: user.id,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      salt: cookieName,
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "OTP verification failed");
    return NextResponse.json({ error: t("unexpected") }, { status: 500 });
  }
}
