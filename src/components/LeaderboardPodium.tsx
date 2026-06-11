import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface Props {
  leaderboard: Array<{
    id: string;
    rank: number;
    nickname: string;
    avatarUrl: string | null;
    totalPoints: number;
  }>;
  currentUserId: string;
}

const MEDAL_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const PLACE_STYLES = {
  1: {
    avatarSize: 80,
    borderWidth: 4,
    borderColor: "var(--color-accent-gold)",
    badgeSize: 28,
    nameFontSize: 14,
    nameWeight: 900,
    pointsColor: "var(--color-text-accent)",
    pointsFontSize: 12,
    pointsWeight: 900,
  },
  2: {
    avatarSize: 56,
    borderWidth: 2,
    borderColor: "var(--color-accent-silver)",
    badgeSize: 20,
    nameFontSize: 12,
    nameWeight: 700,
    pointsColor: "var(--color-accent-silver)",
    pointsFontSize: 12,
    pointsWeight: 700,
  },
  3: {
    avatarSize: 56,
    borderWidth: 2,
    borderColor: "var(--color-accent-bronze)",
    badgeSize: 20,
    nameFontSize: 12,
    nameWeight: 700,
    pointsColor: "var(--color-accent-bronze)",
    pointsFontSize: 12,
    pointsWeight: 700,
  },
} as const;

export type PodiumEntry = Props["leaderboard"][number];

async function PodiumPedestal({
  entry,
}: {
  entry: PodiumEntry;
}) {
  const t = await getTranslations("home.leaderboard");
  if (entry.rank < 1 || entry.rank > 3) return null;
  const s = PLACE_STYLES[entry.rank as 1 | 2 | 3];
  const isFirst = entry.rank === 1;

  return (
    <div
      className="flex flex-col items-center"
      style={{ paddingBottom: isFirst ? 16 : 0 }}
    >
      {/* Avatar + badge */}
      <div className="relative" style={{ width: s.avatarSize, height: s.avatarSize }}>
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt={entry.nickname}
            width={s.avatarSize}
            height={s.avatarSize}
            className="rounded-full object-cover"
            style={{
              width: s.avatarSize,
              height: s.avatarSize,
              border: `${s.borderWidth}px solid ${s.borderColor}`,
            }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: s.avatarSize,
              height: s.avatarSize,
              border: `${s.borderWidth}px solid ${s.borderColor}`,
              background: "var(--color-bg-card-secondary)",
              color: s.borderColor,
              fontFamily: "var(--font-display)",
              fontSize: s.avatarSize * 0.4,
              fontWeight: 800,
            }}
          >
            {entry.nickname.charAt(0).toUpperCase()}
          </div>
        )}
        <span
          className="absolute flex items-center justify-center"
          style={{
            width: s.badgeSize,
            height: s.badgeSize,
            fontSize: s.badgeSize * 0.65,
            lineHeight: 1,
            bottom: -s.badgeSize / 4,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {MEDAL_EMOJI[entry.rank]}
        </span>
      </div>

      {/* Name */}
      <span
        className="mt-3 text-center truncate max-w-[80px]"
        style={{
          fontSize: s.nameFontSize,
          fontWeight: s.nameWeight,
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-body)",
        }}
      >
        {entry.nickname}
      </span>

      {/* Points */}
      <span
        style={{
          fontSize: s.pointsFontSize,
          fontWeight: s.pointsWeight,
          color: s.pointsColor,
          fontFamily: "var(--font-body)",
        }}
      >
        {t("pts", { n: entry.totalPoints })}
      </span>
    </div>
  );
}

export function getVisibleRows(
  leaderboard: Props["leaderboard"],
  currentUserId: string,
) {
  // Rows beyond top 3
  const rest = leaderboard.filter((e) => e.rank > 3);
  if (rest.length === 0) return [];

  const currentIndex = rest.findIndex((e) => e.id === currentUserId);

  // Current user is in top 3 or not in list at all -> show ranks 4-8
  if (currentIndex === -1) {
    return rest.slice(0, 5);
  }

  // Current user is in top 8 -> show ranks 4-8
  if (currentIndex < 5) {
    return rest.slice(0, 5);
  }

  // Current user is further down -> show contextual window +/- 2
  const start = Math.max(0, currentIndex - 2);
  const end = Math.min(rest.length, currentIndex + 3);
  return rest.slice(start, end);
}

export async function LeaderboardPodium({ leaderboard, currentUserId }: Props) {
  const t = await getTranslations("home.leaderboard");
  if (leaderboard.length === 0) {
    return (
      <div
        className="overflow-hidden"
        style={{
          background: "var(--color-bg-card)",
          borderRadius: 12,
        }}
      >
        <div style={{ padding: 24 }}>
          <h2
            style={{
              color: "var(--color-text-accent)",
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 800,
              margin: 0,
            }}
          >
            {t("title")}
          </h2>
        </div>
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
      </div>
    );
  }

  const top3 = leaderboard.filter((e) => e.rank <= 3);
  const second = top3.find((e) => e.rank === 2);
  const first = top3.find((e) => e.rank === 1);
  const third = top3.find((e) => e.rank === 3);
  const podiumOrder = [second, first, third].filter(Boolean) as Props["leaderboard"];

  const visibleRows = getVisibleRows(leaderboard, currentUserId);

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--color-bg-card)",
        borderRadius: 12,
      }}
    >
      {/* Header */}
      <div style={{ padding: 24 }}>
        <h2
          style={{
            color: "var(--color-text-accent)",
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
          }}
        >
          Leaderboard
        </h2>
      </div>

      {/* Podium zone */}
      {podiumOrder.length > 0 && (
        <div
          className="flex items-end justify-center gap-6"
          style={{ padding: "0 24px 24px" }}
        >
          {podiumOrder.map((entry) => (
            <PodiumPedestal key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Ranking list (hidden on mobile) */}
      {visibleRows.length > 0 && (
        <div
          className="hidden lg:flex flex-col"
          style={{ padding: "0 24px 24px", gap: 4 }}
        >
          {visibleRows.map((entry) => {
            const isCurrent = entry.id === currentUserId;
            return (
              <div
                key={entry.id}
                className="flex items-center"
                style={{
                  padding: 12,
                  borderRadius: 8,
                  gap: 12,
                  background: isCurrent ? "rgba(233,196,106,0.1)" : "transparent",
                  borderLeft: isCurrent ? "4px solid var(--color-accent-gold)" : "4px solid transparent",
                }}
              >
                {/* Rank */}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isCurrent ? "var(--color-text-accent)" : "var(--color-text-secondary)",
                    fontFamily: "var(--font-body)",
                    minWidth: 20,
                  }}
                >
                  {entry.rank}
                </span>

                {/* Avatar */}
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt={entry.nickname}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                    style={{ width: 32, height: 32, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      background: "var(--color-bg-card-secondary)",
                      color: "var(--color-text-secondary)",
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {entry.nickname.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Nickname */}
                <span
                  className="truncate"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isCurrent ? "var(--color-text-accent)" : "var(--color-text-primary)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {entry.nickname}{isCurrent ? t("youSuffix") : ""}
                </span>

                {/* Spacer */}
                <span className="flex-1" />

                {/* Points */}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isCurrent ? "var(--color-text-accent)" : "var(--color-text-primary)",
                    fontFamily: "var(--font-body)",
                    flexShrink: 0,
                  }}
                >
                  {t("pts", { n: entry.totalPoints })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer link */}
      <div className="flex justify-center" style={{ padding: "0 24px 24px" }}>
        <Link
          href="/leaderboard"
          className="flex items-center justify-center no-underline hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-amber)]"
          style={{
            borderRadius: 12,
            border: "1px solid color-mix(in srgb, var(--color-accent-amber) 20%, transparent)",
            padding: "12px 24px",
            color: "var(--color-accent-amber)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.6,
            fontFamily: "var(--font-body)",
            textDecoration: "none",
          }}
        >
          {t("viewFull")}
        </Link>
      </div>
    </div>
  );
}

/** Standalone podium — just the top 3 pedestals, no card/header/ranking list. */
export async function Podium({ entries }: { entries: PodiumEntry[] }) {
  const top3 = entries.filter((e) => e.rank <= 3);
  if (top3.length === 0) return null;

  const second = top3.find((e) => e.rank === 2);
  const first = top3.find((e) => e.rank === 1);
  const third = top3.find((e) => e.rank === 3);
  const podiumOrder = [second, first, third].filter(Boolean) as PodiumEntry[];

  return (
    <div
      className="flex items-end justify-center gap-10"
      style={{ padding: "24px 24px 32px" }}
    >
      {podiumOrder.map((entry) => (
        <PodiumPedestal key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
