import { getTranslations } from "next-intl/server";
import type { PredictionBadge, ScoreDistribution } from "@/lib/queries/matchDetail";

interface Props {
  predictions: ScoreDistribution[];
  totalUsers: number;
}

export async function CommunityPredictions({ predictions, totalUsers }: Props) {
  const t = await getTranslations("matches.detail.community");

  const badgeLabel = (badge: PredictionBadge): string =>
    badge === "lone_wolf" ? t("loneWolfLabel") : t("boldCallLabel");

  if (totalUsers === 0) {
    return (
      <div
        className="flex flex-col gap-4"
        style={{
          padding: 24,
          borderRadius: 16,
          background: "var(--color-bg-card)",
          height: "100%",
        }}
      >
        <div className="flex items-center justify-between" style={{ width: "100%" }}>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: "var(--color-accent-amber)" }}
            >
              groups
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
        </div>
        <div
          className="flex items-center justify-center flex-1"
          style={{
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-muted)",
          }}
        >
          {t("empty")}
        </div>
      </div>
    );
  }

  const maxCount = predictions.length > 0 ? predictions[0].count : 1;
  const activeBadges = new Set(predictions.flatMap((p) => p.badges));
  const hasBadges = activeBadges.size > 0;

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        padding: 24,
        borderRadius: 16,
        background: "var(--color-bg-card)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ width: "100%" }}>
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 20, color: "var(--color-accent-amber)" }}
          >
            groups
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
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            color: "#e5deff80",
          }}
        >
          {t("users", { n: totalUsers })}
        </span>
      </div>

      {/* Prediction rows */}
      <div className="flex flex-col gap-2" style={{ width: "100%" }}>
        {predictions.map((p) => (
          <div
            key={p.score}
            className="flex items-center gap-4"
            style={{
              position: "relative",
              padding: "12px 16px",
              borderRadius: 12,
              background: "var(--color-bg-input)",
              border: "1px solid #FFFFFF0D",
            }}
          >
            {p.badges.length > 0 && (
              <div
                className="flex items-center gap-0.5"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                }}
              >
                {p.badges.map((badge) => {
                  const emoji = badge === "lone_wolf" ? "🐺" : "🔥";
                  return (
                    <span
                      key={badge}
                      title={badgeLabel(badge)}
                      style={{
                        fontSize: 14,
                        cursor: "default",
                        lineHeight: 1,
                      }}
                    >
                      {emoji}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  padding: "4px 12px",
                  borderRadius: 8,
                  background: "#130f2e",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    fontFamily: "var(--font-display)",
                    color: "var(--color-accent-gold)",
                  }}
                >
                  {p.score}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {t("users", { n: p.count })}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    color: "#e5deff80",
                  }}
                >
                  {p.percentage}%
                </span>
              </div>
            </div>

            {/* Bar */}
            <div
              className="flex-1"
              style={{
                height: 6,
                borderRadius: 4,
                background: "#353151",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round((p.count / maxCount) * 100)}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: "var(--color-accent-gold)",
                }}
              />
            </div>
          </div>
        ))}

        {predictions.length === 0 && (
          <div
            className="flex items-center justify-center"
            style={{
              padding: 24,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              color: "var(--color-text-muted)",
            }}
          >
            {t("empty")}
          </div>
        )}
      </div>

      {/* Badge legend */}
      {hasBadges && (
        <div
          className="flex items-center gap-4"
          style={{
            fontSize: 10,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            color: "#e5deff80",
          }}
        >
          {activeBadges.has("lone_wolf") && (
            <span className="flex items-center gap-1">
              🐺 {t("loneWolf")}
            </span>
          )}
          {activeBadges.has("bold_call") && (
            <span className="flex items-center gap-1">
              🔥 {t("boldCall")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
