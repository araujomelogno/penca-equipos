"use server";

import { cookies } from "next/headers";
import { TZ_COOKIE, isValidTimeZone } from "@/lib/timezone";

export async function setTimeZone(tz: string) {
  if (!isValidTimeZone(tz)) return;

  const store = await cookies();
  store.set(TZ_COOKIE, tz, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
