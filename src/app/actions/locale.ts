"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { language: locale },
      });
    } catch {
      // Schema column may not be applied yet in some environments.
    }
  }

  revalidatePath("/", "layout");
}
