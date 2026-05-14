"use client";

import { useTranslations } from "next-intl";

interface Props {
  team: { code: string; name: string };
}

/** Renders a team name localized to the current locale, falling back to team.name. */
export function TeamName({ team }: Props) {
  const t = useTranslations("teams");
  let label = team.name;
  try {
    const value = t(team.code as never);
    if (typeof value === "string" && value && value !== team.code) {
      label = value;
    }
  } catch {
    // Missing key — keep fallback
  }
  return <>{label}</>;
}

/** Hook variant for use in attributes (alt, title) where JSX isn't valid. */
export function useTeamNameFn() {
  const t = useTranslations("teams");
  return (team: { code: string; name: string }): string => {
    try {
      const value = t(team.code as never);
      if (typeof value === "string" && value && value !== team.code) return value;
    } catch {
      // Missing key
    }
    return team.name;
  };
}
