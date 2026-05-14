import { getTranslations } from "next-intl/server";
import type { KnockoutMatch } from "@/lib/queries/fixtures";
import { KickoffTime } from "@/components/ui/KickoffTime";
import { TeamName } from "@/components/ui/TeamName";

interface Props {
  matches: KnockoutMatch[];
}

function TeamBadge({ team }: { team: KnockoutMatch["homeTeam"] }) {
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 120 }}>
      {team.flagUrl ? (
        <img
          src={team.flagUrl}
          alt={team.code}
          width={24}
          height={16}
          className="object-cover"
          style={{ borderRadius: 2, flexShrink: 0 }}
        />
      ) : (
        <span
          style={{
            width: 24,
            height: 16,
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 700,
            color: "var(--color-text-muted)",
            background: "var(--color-bg-card-secondary)",
            borderRadius: 2,
          }}
        >
          {team.code}
        </span>
      )}
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-body)",
          color: "var(--color-text-primary)",
        }}
      >
        <TeamName team={team} />
      </span>
    </div>
  );
}

function MatchCard({
  match,
  ongoingLabel,
  ftLabel,
}: {
  match: KnockoutMatch;
  ongoingLabel: string;
  ftLabel: string;
}) {
  const isFinished = match.status === "FINISHED";
  const isOngoing = match.status === "LIVE" || match.status === "HALFTIME";

  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "16px 20px",
        background: "var(--color-bg-card)",
        borderRadius: 12,
      }}
    >
      {/* Home team */}
      <TeamBadge team={match.homeTeam} />

      {/* Score / Time */}
      <div className="flex flex-col items-center gap-1">
        {isFinished || isOngoing ? (
          <>
            <div className="flex items-center gap-3">
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                }}
              >
                {match.homeScore}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-text-muted)",
                }}
              >
                -
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                }}
              >
                {match.awayScore}
              </span>
            </div>
            {isOngoing && (
              <span
                className="animate-ongoing"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--color-accent-green)",
                  letterSpacing: 1,
                }}
              >
                {ongoingLabel}
              </span>
            )}
            {isFinished && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  letterSpacing: 0.5,
                }}
              >
                {ftLabel}
              </span>
            )}
          </>
        ) : (
          <KickoffTime date={match.kickoffTime.toISOString()} />
        )}
      </div>

      {/* Away team */}
      <div className="flex items-center gap-2 justify-end" style={{ minWidth: 120 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-primary)",
            textAlign: "right",
          }}
        >
          <TeamName team={match.awayTeam} />
        </span>
        {match.awayTeam.flagUrl ? (
          <img
            src={match.awayTeam.flagUrl}
            alt={match.awayTeam.code}
            width={24}
            height={16}
            className="object-cover"
            style={{ borderRadius: 2, flexShrink: 0 }}
          />
        ) : (
          <span
            style={{
              width: 24,
              height: 16,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "var(--color-text-muted)",
              background: "var(--color-bg-card-secondary)",
              borderRadius: 2,
            }}
          >
            {match.awayTeam.code}
          </span>
        )}
      </div>
    </div>
  );
}

export async function KnockoutView({ matches }: Props) {
  const t = await getTranslations("standings");
  if (matches.length === 0) {
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
        {t("emptyKnockout")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} ongoingLabel={t("ongoing")} ftLabel={t("ft")} />
      ))}
    </div>
  );
}
