import { getLocale, getTranslations } from "next-intl/server";
import type { DateGroup } from "@/lib/queries/matches";
import { MatchCard } from "./MatchCard";

interface Props {
  dateGroups: DateGroup[];
}

export async function MatchList({ dateGroups }: Props) {
  const t = await getTranslations("matches");
  const locale = await getLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (dateGroups.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          padding: "48px 24px",
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-body)",
          fontSize: 14,
        }}
      >
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {dateGroups.map((group) => {
        const label = dateFormatter
          .format(new Date(group.dateKey + "T12:00:00"))
          .toUpperCase();
        return (
          <div key={group.dateKey} className="flex flex-col gap-4">
            {/* Date header */}
            <div className="flex items-center gap-4">
              <span
                className="whitespace-nowrap"
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  fontFamily: "var(--font-display)",
                  letterSpacing: 6,
                  color: "rgba(255, 225, 158, 0.6)",
                }}
              >
                {label}
              </span>
              <div
                className="flex-1"
                style={{
                  height: 1,
                  background: "var(--color-border-light)",
                }}
              />
            </div>

            {/* Match cards */}
            <div className="flex flex-col gap-4">
              {group.matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
