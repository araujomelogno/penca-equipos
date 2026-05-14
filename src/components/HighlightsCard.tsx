import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BoldText } from "@/components/ui/BoldText";

interface Nugget {
  type: string;
  text: string;
  priority: number;
  matchIds?: string[];
}

const ICON_MAP: Record<string, string> = {
  rank_change: "trending_up",
  exact_score: "target",
  streak: "local_fire_department",
  global_stat: "groups",
  day_leader: "emoji_events",
  all_predicted: "task_alt",
  bold_call: "casino",
  lone_wolf: "person_alert",
};

const COLOR_MAP: Record<string, string> = {
  rank_change: "#818cf8",
  exact_score: "#e9c46a",
  streak: "#f97316",
  global_stat: "#4ea8de",
  day_leader: "#e9c46a",
  all_predicted: "#4ade80",
  bold_call: "#f472b6",
  lone_wolf: "#c084fc",
};

export async function HighlightsCard({ nuggets }: { nuggets: Nugget[] }) {
  const t = await getTranslations("home.highlights");
  return (
    <div
      className="flex flex-col gap-3"
      style={{
        padding: 24,
        borderRadius: 16,
        background: "var(--color-bg-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: "var(--color-accent-amber)" }}
          >
            auto_awesome
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--color-accent-amber)",
              letterSpacing: 1,
            }}
          >
            {t("title")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {nuggets.slice(0, 4).map((n, i) => {
          const matchId = n.matchIds?.[0];
          const row = (
            <div className="flex items-start gap-2">
              <span
                className="material-symbols-outlined shrink-0"
                style={{
                  fontSize: 14,
                  color: COLOR_MAP[n.type] ?? "#d0c5b2",
                  marginTop: 2,
                }}
              >
                {ICON_MAP[n.type] ?? "info"}
              </span>
              <BoldText
                text={n.text}
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  color: "#d0c5b2",
                }}
              />
            </div>
          );
          return matchId ? (
            <Link key={i} href={`/matches/${matchId}`} style={{ textDecoration: "none" }} className="hover:bg-white/[0.03] rounded-md -mx-1 px-1 transition-colors">
              {row}
            </Link>
          ) : (
            <div key={i}>{row}</div>
          );
        })}
      </div>

      <Link
        href="/activity"
        style={{
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "var(--font-body)",
          color: "#e9c46a",
          textDecoration: "none",
          letterSpacing: 0.5,
        }}
      >
        {t("viewInFeed")}
      </Link>
    </div>
  );
}
