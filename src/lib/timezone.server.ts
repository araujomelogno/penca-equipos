import { cookies } from "next/headers";
import { TZ_COOKIE, defaultTimeZone, isValidTimeZone } from "./timezone";

/** Resolve the active timezone from the request cookie, or the default. */
export async function getTimeZone(): Promise<string> {
  const store = await cookies();
  const tz = store.get(TZ_COOKIE)?.value;
  return tz && isValidTimeZone(tz) ? tz : defaultTimeZone;
}
