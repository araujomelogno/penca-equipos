import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { UpcomingMatch } from "@/lib/queries/home";
import { KickoffTime } from "@/components/ui/KickoffTime";

interface Props {
  matches: UpcomingMatch[];
}

type StageKey = "GROUP" | "R16" | "QF" | "SF" | "FINAL";
const STAGE_KEYS: StageKey[] = ["GROUP", "R16", "QF", "SF", "FINAL"];

function TeamBadge({ team }: { team: UpcomingMatch["homeTeam"] }) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 56 }}>
      {team.flagUrl ? (
        <img
          src={team.flagUrl}
          alt={team.name}
          width={32}
          height={32}
          style={{ width: 32, height: 32, objectFit: "contain" }}
        />
      ) : (
        <span
          className="flex items-center justify-center font-bold"
          style={{
            width: 32,
            height: 32,
            fontSize: 12,
            borderRadius: 6,
            background: "var(--color-bg-card)",
            color: "var(--color-text-secondary)",
          }}
        >
          {team.code}
        </span>
      )}
      <span
        className="font-bold"
        style={{
          fontSize: 13,
          fontFamily: "var(--font-display)",
          color: "var(--color-text-primary)",
          letterSpacing: "0.5px",
        }}
      >
        {team.code}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  stageText,
  t,
}: {
  match: UpcomingMatch;
  stageText: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const hasPrediction = match.userPrediction !== null;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex flex-col no-underline overflow-hidden"
      style={{
        borderRadius: 12,
        background: "var(--color-bg-card-secondary)",
        border: "1px solid var(--color-border-subtle)",
        textDecoration: "none",
      }}
    >
      {/* Header row: stage + date */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "8px 14px",
          background: "var(--color-bg-primary)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {stageText}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-display)",
          }}
        >
          <KickoffTime date={match.kickoffTime.toISOString()} />
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2" style={{ padding: "10px 14px" }}>
        {/* Teams row */}
        <div className="flex items-center justify-center gap-6">
          <TeamBadge team={match.homeTeam} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "var(--color-text-muted)",
            }}
          >
            {t("vs")}
          </span>
          <TeamBadge team={match.awayTeam} />
        </div>

        {/* User prediction */}
        <div
          className="flex items-center justify-center"
          style={{
            fontSize: 11,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
          }}
        >
          {hasPrediction ? (
            <span style={{ color: "var(--color-accent-amber)" }}>
              {t("yourPrediction", {
                home: match.userPrediction!.homeScore,
                away: match.userPrediction!.awayScore,
              })}
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                color: "var(--color-text-accent-dark)",
                background: "linear-gradient(to right, var(--color-accent-gold), var(--color-accent-amber))",
                padding: "4px 14px",
                borderRadius: 100,
              }}
            >
              {t("predict")}
            </span>
          )}
        </div>

        {/* Community prediction */}
        <div
          className="flex flex-col items-center"
          style={{
            fontSize: 10,
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-display)",
          }}
        >
          {match.avgPrediction && match.totalPredictions > 0 ? (
            <>
              <span>
                {t("avg", {
                  home: match.avgPrediction.home.toFixed(1),
                  away: match.avgPrediction.away.toFixed(1),
                })}
              </span>
              <span style={{ opacity: 0.5, fontSize: 9 }}>
                {t("count", { n: match.totalPredictions })}
              </span>
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>{t("beFirst")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export async function UpcomingMatches({ matches }: Props) {
  const t = await getTranslations("home.upcoming");
  const tStage = await getTranslations("home.stage");

  const stageFor = (stage: string, group: string | null | undefined) => {
    if (stage === "GROUP" && group) return tStage("groupLabel", { name: group });
    if ((STAGE_KEYS as readonly string[]).includes(stage)) return tStage(stage as StageKey);
    return stage;
  };

  return (
    <div
      className="flex flex-col"
      style={{
        borderRadius: 12,
        background: "var(--color-bg-card)",
        padding: 24,
        gap: 16,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <span
        className="font-extrabold"
        style={{
          fontSize: 18,
          fontFamily: "var(--font-display)",
          color: "var(--color-text-primary)",
          fontWeight: 800,
        }}
      >
        {t("title")}
      </span>

      {/* Match list or empty state */}
      {matches.length === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{
            padding: "32px 0",
            fontSize: 14,
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-display)",
          }}
        >
          {t("empty")}
        </div>
      ) : (
        matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            stageText={stageFor(match.stage, match.group)}
            t={t}
          />
        ))
      )}

      {/* Footer link */}
      <Link
        href="/matches"
        className="no-underline text-center"
        style={{
          fontSize: 13,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
        }}
      >
        {t("viewAll")}
      </Link>
    </div>
  );
}
