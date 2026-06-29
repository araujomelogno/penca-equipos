/**
 * Selects the match-analysis prose to display for the active locale.
 *
 * Fallback chain: locale-specific curated text → legacy single-language
 * `analysis` column → i18n default string. A whitespace-only string counts as
 * absent so a half-seeded row never renders blank.
 */
function firstNonEmpty(...values: (string | null | undefined)[]): string | null {
  for (const v of values) {
    if (v && v.trim().length > 0) return v;
  }
  return null;
}

export function pickAnalysis(
  locale: string,
  texts: { es: string | null; en: string | null },
  legacy: string | null,
  fallback: string,
): string {
  const localeText = locale.toLowerCase().startsWith("es") ? texts.es : texts.en;
  return firstNonEmpty(localeText, legacy) ?? fallback;
}
