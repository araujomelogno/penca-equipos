import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const t = await getTranslations("api");
  const tOtp = await getTranslations("api.otp");
  const locale = await getLocale();

  const ip = getClientIp(request);
  const rl = rateLimit(`otp-request:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: t("rateLimited") },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: tOtp("emailRequired") }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({ success: true });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return successResponse;

    // Rate limit: 1 OTP per user every 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentOtp = await prisma.otpCode.findFirst({
      where: { userId: user.id, createdAt: { gt: twoMinutesAgo } },
    });

    if (recentOtp) {
      return NextResponse.json({ error: tOtp("waitBefore") }, { status: 429 });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (process.env.NODE_ENV !== "production") {
      logger.info({ email, otp: code }, "OTP generated");
    }
    const codeHash = await hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this user
    await prisma.otpCode.deleteMany({ where: { userId: user.id } });

    await prisma.otpCode.create({
      data: { userId: user.id, codeHash, expiresAt },
    });

    // Send email with OTP code — don't block on failure
    try {
      await sendOtpEmail(email, code, locale);
    } catch (err) {
      logger.error({ err, email }, "Failed to send OTP email");
      // OTP is already saved in DB; in dev the user can check server logs
    }

    return successResponse;
  } catch (error) {
    logger.error({ err: error }, "OTP request failed");
    return NextResponse.json({ error: t("unexpected") }, { status: 500 });
  }
}
