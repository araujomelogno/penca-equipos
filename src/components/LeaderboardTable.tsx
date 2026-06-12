import { useTranslations } from "next-intl";
import type { LeaderboardEntry } from "@/lib/queries/leaderboard";

const MEDAL_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

interface Props {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

const COLUMNS = [
  { key: "rank", labelKey: null, width: 48, hideOnMobile: false },
  { key: "user", labelKey: "columns.user", width: undefined, hideOnMobile: false },
  { key: "exactScores", labelKey: "columns.exact", width: 80, hideOnMobile: true },
  { key: "correctWinners", labelKey: "columns.correct", width: 80, hideOnMobile: true },
  { key: "matchesScored", labelKey: "columns.played", width: 80, hideOnMobile: true },
  { key: "totalPoints", labelKey: "columns.points", width: 100, hideOnMobile: false },
] as const;

export function LeaderboardTable({ entries, currentUserId }: Props) {
  const t = useTranslations("leaderboard");
  if (entries.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          padding: "64px 24px",
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
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 12,
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={col.hideOnMobile ? "hidden md:table-cell" : ""}
                style={{
                  textAlign: col.key === "user" ? "left" : "center",
                  padding: "12px 16px",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-muted)",
                  letterSpacing: 2,
                  width: col.width,
                }}
              >
                {col.labelKey ? t(col.labelKey) : "#"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isCurrent = entry.id === currentUserId;
            const isTop3 = entry.rank <= 3;

            return (
              <tr
                key={entry.id}
                style={{
                  borderBottom: "1px solid var(--color-border-subtle)",
                  background: isCurrent ? "rgba(233, 196, 106, 0.08)" : "transparent",
                  borderLeft: isCurrent ? "4px solid var(--color-accent-gold)" : "4px solid transparent",
                }}
              >
                {/* Rank */}
                <td
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    color: isCurrent
                      ? "var(--color-text-accent)"
                      : isTop3
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                  }}
                >
                  {MEDAL_EMOJI[entry.rank] ?? entry.rank}
                </td>

                {/* User */}
                <td style={{ padding: "12px 16px" }}>
                  <div className="flex items-center gap-3">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.nickname}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                        style={{ width: 36, height: 36, flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: 36,
                          height: 36,
                          flexShrink: 0,
                          background: "var(--color-bg-card-secondary)",
                          color: isCurrent ? "var(--color-text-accent)" : "var(--color-text-secondary)",
                          fontFamily: "var(--font-display)",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {entry.nickname.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isCurrent ? 700 : 500,
                        fontFamily: "var(--font-body)",
                        color: isCurrent ? "var(--color-text-accent)" : "var(--color-text-primary)",
                      }}
                    >
                      {entry.nickname}
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "var(--color-text-muted)",
                            marginLeft: 8,
                          }}
                        >
                          {t("you")}
                        </span>
                      )}
                    </span>
                  </div>
                </td>

                {/* Exact scores */}
                <td
                  className="hidden md:table-cell"
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {entry.exactScores}
                </td>

                {/* Correct winners */}
                <td
                  className="hidden md:table-cell"
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {entry.correctWinners}
                </td>

                {/* Matches scored */}
                <td
                  className="hidden md:table-cell"
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {entry.matchesScored}
                </td>

                {/* Total points */}
                <td
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    color: isCurrent || isTop3 ? "var(--color-text-accent)" : "var(--color-text-primary)",
                  }}
                >
                  {entry.totalPoints}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
