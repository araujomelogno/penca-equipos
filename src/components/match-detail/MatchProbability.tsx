import { getTranslations } from "next-intl/server";
import type { CommunityOdds } from "@/lib/queries/matchDetail";

interface Props {
  homeTeamName: string;
  awayTeamName: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  communityOdds: CommunityOdds;
}

function DualBar({
  label,
  official,
  community,
}: {
  label: string;
  official: number;
  community: number;
}) {
  return (
    <div className="flex flex-col gap-2" style={{ width: "100%" }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "var(--font-body)",
          letterSpacing: 2,
          color: "var(--color-text-primary)",
        }}
      >
        {label}
      </span>

      {/* Official bar */}
      <div className="flex items-center gap-2" style={{ width: "100%" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            color: "var(--color-accent-gold)",
            minWidth: 36,
            textAlign: "right",
          }}
        >
          {official}%
        </span>
        <div
          className="flex-1"
          style={{
            height: 10,
            borderRadius: 5,
            background: "var(--color-bg-input)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${official}%`,
              height: "100%",
              borderRadius: 5,
              background: "linear-gradient(90deg, var(--color-accent-gold), var(--color-accent-amber))",
            }}
          />
        </div>
      </div>

      {/* Community bar */}
      {community > 0 && (
        <div className="flex items-center gap-2" style={{ width: "100%" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
              color: "var(--color-accent-blue)",
              minWidth: 36,
              textAlign: "right",
            }}
          >
            {community}%
          </span>
          <div
            className="flex-1"
            style={{
              height: 10,
              borderRadius: 5,
              background: "var(--color-bg-input)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${community}%`,
                height: "100%",
                borderRadius: 5,
                background: "linear-gradient(90deg, var(--color-accent-blue-light), var(--color-accent-blue))",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export async function MatchProbability({
  homeTeamName,
  awayTeamName,
  homeWin,
  draw,
  awayWin,
  communityOdds,
}: Props) {
  const t = await getTranslations("matches.detail.probability");
  const hasCommunity = communityOdds.total > 0;

  return (
    <div
      className="flex flex-col gap-5"
      style={{
        padding: 24,
        borderRadius: 16,
        background: "var(--color-bg-card)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, color: "var(--color-accent-amber)" }}
        >
          bar_chart
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--color-accent-amber)",
          }}
        >
          {t("title")}
        </span>
      </div>

      <DualBar
        label={homeTeamName.toUpperCase()}
        official={homeWin}
        community={communityOdds.homeWin}
      />
      <DualBar
        label={t("draw")}
        official={draw}
        community={communityOdds.draw}
      />
      <DualBar
        label={awayTeamName.toUpperCase()}
        official={awayWin}
        community={communityOdds.awayWin}
      />

      {/* Legend */}
      {hasCommunity && (
        <div className="flex items-center gap-4" style={{ marginTop: 4 }}>
          <div className="flex items-center gap-1.5">
            <div
              style={{
                width: 12,
                height: 8,
                borderRadius: 4,
                background: "linear-gradient(90deg, var(--color-accent-gold), var(--color-accent-amber))",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-muted)",
              }}
            >
              {t("legendOdds")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              style={{
                width: 12,
                height: 8,
                borderRadius: 4,
                background: "linear-gradient(90deg, var(--color-accent-blue-light), var(--color-accent-blue))",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                color: "var(--color-text-muted)",
              }}
            >
              {t("legendCommunity", { total: communityOdds.total })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
