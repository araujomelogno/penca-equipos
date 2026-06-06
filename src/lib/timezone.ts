// Pure, client-safe timezone helpers. MUST NOT import `next/headers`
// (this file is imported by client components). Server-only cookie reading
// lives in `timezone.server.ts`.

export const TZ_COOKIE = "pencachi_tz";

export const defaultTimeZone =
  process.env.DEFAULT_TIMEZONE || "America/Montevideo";

/** True if `tz` is a valid IANA timezone the runtime understands. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "YYYY-MM-DD" of `date` as seen in `tz`. */
export function instantToDateKey(date: Date, tz: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** ms to add to `date.getTime()` so that the wall clock in `tz` reads as UTC. */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = map.hour === "24" ? "0" : map.hour;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUTC - date.getTime();
}

/**
 * UTC instants bounding the calendar day `dateStr` (YYYY-MM-DD) in `tz`.
 *
 * Known limitation: if `tz` springs forward exactly at local midnight (so that
 * 00:00 does not exist that day), the start bound can be off by the DST gap.
 * None of the app's timezones do this (Uruguay has no DST; the configurable
 * default is `America/Montevideo`), so this is documented rather than handled.
 */
export function dayRangeUtc(
  dateStr: string,
  tz: string,
): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const startGuess = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const start = new Date(startGuess - tzOffsetMs(new Date(startGuess), tz));
  const endGuess = Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0);
  const end = new Date(endGuess - tzOffsetMs(new Date(endGuess), tz) - 1);
  return { start, end };
}

/** Today's "YYYY-MM-DD" in `tz`. */
export function todayDateKey(tz: string): string {
  return instantToDateKey(new Date(), tz);
}
