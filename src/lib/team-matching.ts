/**
 * Maps API-Football team names to the team codes used by our seeded data.
 *
 * The seed (`scripts/seed-worldcup-2026.ts`) stores teams with our own names
 * (e.g. "Czechia", "United States"). API-Football uses different conventions
 * for some countries, so reconciling fixtures by name needs both a normalizer
 * (handles case, whitespace, diacritics, "&" vs "and") and an explicit alias
 * table for the cases normalization can't bridge.
 */

/** Normalize a team name for tolerant comparison. */
export function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (ü→u, ç→c, ã→a)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ") // collapse punctuation to spaces
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Explicit aliases: normalized API-Football name → normalized seed name.
 * Only needed where normalization alone can't bridge the gap.
 */
const ALIASES: Record<string, string> = {
  usa: "united states",
  "czech republic": "czechia",
  turkiye: "turkey",
  "cape verde islands": "cape verde",
  "congo dr": "dr congo",
};

/**
 * Resolve an API-Football team name to the matching seed team's `code`.
 * Returns null when no team can be matched.
 */
export function resolveTeamCode(
  apiName: string,
  dbTeams: { name: string; code: string }[],
): string | null {
  const index = new Map<string, string>();
  for (const t of dbTeams) {
    index.set(normalizeTeamName(t.name), t.code);
  }

  const normalized = normalizeTeamName(apiName);
  const direct = index.get(normalized);
  if (direct) return direct;

  const aliased = ALIASES[normalized];
  if (aliased) {
    const viaAlias = index.get(aliased);
    if (viaAlias) return viaAlias;
  }

  return null;
}
