export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "es";
}

/**
 * Default locale for new visitors (no cookie set, no user preference).
 * Set via the `DEFAULT_LOCALE` env var; falls back to "en" if missing or invalid.
 */
export const defaultLocale: Locale = (() => {
  const fromEnv = process.env.DEFAULT_LOCALE;
  return isLocale(fromEnv) ? fromEnv : "en";
})();
