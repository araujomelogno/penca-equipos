import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { NextFavoriteTeamMatch } from "@/lib/queries/home";
import { KickoffTime } from "@/components/ui/KickoffTime";
import { TeamName } from "@/components/ui/TeamName";

interface Props {
  match: NextFavoriteTeamMatch;
}

function TeamSide({ team, flagUrl, highlighted }: {
  team: { code: string; name: string };
  flagUrl: string | null;
  highlighted: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: 80 }}>
      {flagUrl ? (
        <img
          src={flagUrl}
          alt={team.code}
          width={36}
          height={26}
          style={{ borderRadius: 4, objectFit: "cover" }}
        />
      ) : (
        <div style={{ width: 36, height: 26, borderRadius: 4, background: "#353151" }} />
      )}
      <span
        style={{
          fontSize: 12,
          fontWeight: highlighted ? 800 : 600,
          fontFamily: "var(--font-body)",
          color: highlighted ? "var(--color-accent-gold)" : "var(--color-text-primary)",
          textAlign: "center",
        }}
      >
        <TeamName team={team} />
      </span>
    </div>
  );
}

export async function NextFavoriteMatchCard({ match }: Props) {
  const t = await getTranslations("home.nextMatch");
  const tStage = await getTranslations("home.stage");
  const stageText = match.stage === "GROUP" && match.group
    ? tStage("groupLabel", { name: match.group })
    : (["GROUP", "R16", "QF", "SF", "FINAL"].includes(match.stage)
        ? tStage(match.stage as "GROUP" | "R16" | "QF" | "SF" | "FINAL")
        : match.stage);
  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex flex-col gap-4 rounded-xl"
      style={{
        background: "var(--color-bg-card)",
        padding: 20,
        textDecoration: "none",
      }}
    >
      <div className="flex items-center justify-between">
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
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--color-text-muted)",
          }}
        >
          {stageText}
        </span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <TeamSide
          team={match.homeTeam}
          flagUrl={match.homeTeam.flagUrl}
          highlighted={match.isFavoriteHome}
        />

        <div className="flex flex-col items-center gap-1" style={{ textAlign: "center" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--color-text-muted)",
            }}
          >
            {t("vs")}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-accent-gold)",
              whiteSpace: "nowrap",
            }}
          >
            <KickoffTime date={match.kickoffTime} />
          </span>
        </div>

        <TeamSide
          team={match.awayTeam}
          flagUrl={match.awayTeam.flagUrl}
          highlighted={!match.isFavoriteHome}
        />
      </div>
    </Link>
  );
}
