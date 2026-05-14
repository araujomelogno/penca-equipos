import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";

// PUT /api/profile/password — change password
export async function PUT(request: Request) {
  const t = await getTranslations("api");
  const tPwd = await getTranslations("api.password");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const rl = rateLimit(`password:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: t("rateLimited") },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("invalidJson") }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: tPwd("bothRequired") }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: tPwd("tooShort") }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ error: tPwd("userNotFound") }, { status: 404 });
  }

  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: tPwd("currentIncorrect") }, { status: 400 });
  }

  const passwordHash = await hash(newPassword, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ success: true });
}
