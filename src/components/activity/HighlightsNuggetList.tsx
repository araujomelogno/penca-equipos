"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

export function HighlightsNuggetList({ nuggets }: { nuggets: Nugget[] }) {
  const t = useTranslations("activity.highlights");
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? nuggets : nuggets.slice(0, 3);
  const hasMore = nuggets.length > 3;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((n, i) => {
        const matchId = n.matchIds?.[0];
        const content = (
          <div key={i} className="flex items-start gap-2">
            <span
              className="material-symbols-outlined shrink-0"
              style={{
                fontSize: 14,
                color: COLOR_MAP[n.type] ?? "#d0c5b2",
                marginTop: 1,
              }}
            >
              {ICON_MAP[n.type] ?? "info"}
            </span>
            <BoldText
              text={n.text}
              className="text-[12px] leading-[1.4]"
              style={{ color: "#d0c5b2" }}
            />
          </div>
        );
        return matchId ? (
          <a key={i} href={`/matches/${matchId}`} style={{ textDecoration: "none" }} className="hover:bg-white/[0.03] rounded-md -mx-1 px-1 transition-colors">
            {content}
          </a>
        ) : (
          content
        );
      })}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            color: "#e9c46a",
          }}
        >
          {expanded ? t("showLess") : t("showMore", { n: nuggets.length - 3 })}
        </button>
      )}
    </div>
  );
}
