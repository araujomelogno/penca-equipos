import { getTranslations } from "next-intl/server";
import { TeamName } from "@/components/ui/TeamName";
import type { TournamentFavorite } from "@/lib/queries/home";

interface Props {
  favorites: TournamentFavorite[];
}

const MEDAL_COLORS = ["var(--color-text-accent)", "silver", "var(--color-accent-bronze)"];

export async function FavoritesCard({ favorites }: Props) {
  const t = await getTranslations("home.favorites");
  return (
    <div
      className="flex flex-col gap-4 rounded-xl"
      style={{
        background: "var(--color-bg-card)",
        padding: 20,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          color: "var(--color-text-muted)",
        }}
      >
        {t("title")}
      </span>

      <div className="flex flex-col gap-3">
        {favorites.map((team, i) => (
          <div key={team.code} className="flex items-center gap-3">
            {/* Rank */}
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 900,
                color: MEDAL_COLORS[i] ?? "var(--color-text-muted)",
                width: 20,
                textAlign: "center",
              }}
            >
              {i + 1}
            </span>

            {/* Flag */}
            {team.flagUrl ? (
              <img
                src={team.flagUrl}
                alt={team.code}
                width={28}
                height={20}
                style={{ borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 28, height: 20, borderRadius: 3, background: "var(--color-bg-elevated)", flexShrink: 0 }} />
            )}

            {/* Name */}
            <span
              className="flex-1"
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-primary)",
              }}
            >
              <TeamName team={team} />
            </span>

            {/* Odds */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-muted)",
              }}
            >
              +{team.odds}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
