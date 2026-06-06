"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE } from "@/lib/timezone";
import { setTimeZone } from "@/app/actions/timezone";

function readCookie(name: string): string | undefined {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="))
    ?.split("=")[1];
  // Next serializes the cookie value URL-encoded (e.g. "America%2FMontevideo"),
  // so decode before comparing against the decoded IANA name from Intl —
  // otherwise the check never matches and we refresh on every navigation.
  return raw ? decodeURIComponent(raw) : undefined;
}

/** Detects the browser timezone once and, if it differs from the cookie,
 *  persists it and refreshes so server-rendered days match the user's TZ. */
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    if (readCookie(TZ_COOKIE) === tz) return;
    setTimeZone(tz).then(() => router.refresh());
  }, [router]);

  return null;
}
