import { getTranslations } from "next-intl/server";

export interface NamedTeam {
  code: string;
  name: string;
}

/**
 * Server-side helper: returns a localized team name lookup.
 * Falls back to the DB `name` if no translation exists for the team code.
 */
export async function getTeamNameLookup() {
  const t = await getTranslations("teams");
  return (team: NamedTeam): string => {
    // next-intl t.has narrows but the namespace is dynamic — try/catch for safety.
    try {
      const value = t(team.code as never);
      if (typeof value === "string" && value && value !== team.code) return value;
    } catch {
      // Missing key
    }
    return team.name;
  };
}
