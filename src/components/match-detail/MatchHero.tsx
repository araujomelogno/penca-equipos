import { getTranslations } from "next-intl/server";
import type { MatchDetailData } from "@/lib/queries/matchDetail";
import { KickoffTime } from "@/components/ui/KickoffTime";
import { getTeamNameLookup } from "@/lib/team-i18n";
import { PredictionBadge } from "./PredictionBadge";

interface Props {
  data: MatchDetailData;
}

function TeamColumn({
  team,
  side,
  displayName,
}: {
  team: MatchDetailData["match"]["homeTeam"];
  side: "home" | "away";
  displayName: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-2 shrink-0"
    >
      {team.flagUrl ? (
        <div
          style={{
            width: 88,
            height: 58,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <img
            src={team.flagUrl}
            alt={team.code}
            width={88}
            height={58}
            className="object-cover"
            style={{ width: 88, height: 58 }}
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            width: 88,
            height: 58,
            borderRadius: 4,
            background: "var(--color-bg-card-secondary)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--color-text-muted)",
          }}
        >
          {team.code}
        </div>
      )}
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          letterSpacing: 1,
          color: side === "home" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        }}
      >
        {displayName.toUpperCase()}
      </span>
    </div>
  );
}

function ScoreArea({ match, vsLabel }: { match: MatchDetailData["match"]; vsLabel: string }) {
  const hasScore = match.status === "FINISHED" || match.status === "LIVE" || match.status === "HALFTIME";

  if (hasScore) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span
          style={{
            fontSize: 44,
            fontWeight: 900,
            fontFamily: "var(--font-display)",
            letterSpacing: -2,
            color: "var(--color-accent-gold)",
          }}
        >
          {match.homeScore} - {match.awayScore}
        </span>
        {match.minuteClock && (
          <div
            style={{
              padding: "4px 16px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--color-bg-highlight) 50%, transparent)",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                fontStyle: "italic",
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
              }}
            >
              {match.minuteClock}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        style={{
          fontSize: 32,
          fontWeight: 900,
          fontFamily: "var(--font-display)",
          letterSpacing: 4,
          color: "var(--color-accent-amber)",
        }}
      >
        {vsLabel}
      </span>
    </div>
  );
}


export async function MatchHero({ data }: Props) {
  const t = await getTranslations("matches.detail.hero");
  const tStage = await getTranslations("matches.stage");
  const tHome = await getTranslations("home.stage");
  const teamLookup = await getTeamNameLookup();
  const { match } = data;
  const isOngoing = match.status === "LIVE" || match.status === "HALFTIME";
  const KNOCKOUT = ["R16", "R32", "QF", "SF", "FINAL", "GROUP"] as const;
  const stageLabel = match.group
    ? tHome("groupLabel", { name: match.group })
    : (KNOCKOUT as readonly string[]).includes(match.stage)
      ? tStage(match.stage as (typeof KNOCKOUT)[number])
      : match.stage;

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        padding: "16px clamp(12px, 4vw, 32px)",
        borderRadius: 16,
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-input) 93%, transparent) 0%, color-mix(in srgb, var(--color-bg-input) 73%, transparent) 45%, color-mix(in srgb, var(--color-bg-input) 40%, transparent) 100%), url('/match-hero-bg.jpg') center/cover",
      }}
    >
      {/* Main row: match info (left/center) + prediction (right on desktop, below on mobile) */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8" style={{ width: "100%" }}>
        {/* Left: status, pills, teams — all centered within this column */}
        <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
          {/* Status badge */}
          {/* Top row: date/status + group pill */}
          <div className="flex items-center justify-center gap-2">
            {isOngoing ? (
              <div
                className="flex items-center gap-2"
                style={{
                  padding: "4px 12px",
                  borderRadius: 100,
                  background: "rgba(0, 0, 0, 0.4)",
                }}
              >
                <div
                  className="animate-ongoing"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--color-accent-amber-dark)",
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 900,
                    fontFamily: "var(--font-body)",
                    letterSpacing: 3,
                    color: "white",
                  }}
                >
                  {t("ongoing")}
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5"
                style={{
                  padding: "6px 14px",
                  borderRadius: 100,
                  background: "color-mix(in srgb, var(--color-bg-input) 50%, transparent)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text-primary) 60%, transparent)" }}
                >
                  calendar_today
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    letterSpacing: 1,
                    color: "color-mix(in srgb, var(--color-text-primary) 60%, transparent)",
                  }}
                >
                  <KickoffTime date={match.kickoffTime.toISOString()} />
                </span>
              </div>
            )}

            <div
              className="flex items-center gap-1.5"
              style={{
                padding: "5px 12px",
                borderRadius: 100,
                background: "color-mix(in srgb, var(--color-bg-card) 50%, transparent)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-accent-amber) 50%, transparent)" }}
              >
                groups
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  color: "color-mix(in srgb, var(--color-text-primary) 60%, transparent)",
                }}
              >
                {stageLabel}
              </span>
            </div>
          </div>

          {/* Venue pill (own row) */}
          {match.venue && (
            <div className="flex items-center justify-center" style={{ width: "100%" }}>
              <div
                className="flex items-center gap-1.5"
                style={{
                  padding: "5px 12px",
                  borderRadius: 100,
                  background: "color-mix(in srgb, var(--color-bg-card) 50%, transparent)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-accent-amber) 50%, transparent)" }}
                >
                  stadium
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    color: "color-mix(in srgb, var(--color-text-primary) 60%, transparent)",
                  }}
                >
                  {match.venue}
                </span>
              </div>
            </div>
          )}

          {/* Teams + Score */}
          <div className="flex items-center justify-center gap-4 sm:gap-10" style={{ width: "100%" }}>
            <TeamColumn team={match.homeTeam} side="home" displayName={teamLookup(match.homeTeam)} />
            <ScoreArea match={match} vsLabel={t("vs")} />
            <TeamColumn team={match.awayTeam} side="away" displayName={teamLookup(match.awayTeam)} />
          </div>
        </div>

        {/* Right (desktop) / Below (mobile): prediction */}
        <div className="flex justify-center lg:block">
        <PredictionBadge
          matchId={match.id}
          homeTeamCode={match.homeTeam.code}
          awayTeamCode={match.awayTeam.code}
          kickoffTime={match.kickoffTime.toISOString()}
          matchStatus={match.status}
          userPrediction={data.userPrediction ? {
            homeScore: data.userPrediction.homeScore,
            awayScore: data.userPrediction.awayScore,
            points: data.userPrediction.points,
          } : null}
        />
        </div>
      </div>
    </div>
  );
}
