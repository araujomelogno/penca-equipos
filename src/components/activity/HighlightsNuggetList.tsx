"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BoldText } from "@/components/ui/BoldText";
import { highlightIcon, highlightColor } from "@/lib/highlight-presentation";

interface Nugget {
  type: string;
  text: string;
  priority: number;
  matchIds?: string[];
}

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
                color: highlightColor(n.type),
                marginTop: 1,
              }}
            >
              {highlightIcon(n.type)}
            </span>
            <BoldText
              text={n.text}
              className="text-[12px] leading-[1.4]"
              style={{ color: "var(--color-text-secondary)" }}
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
            color: "var(--color-accent-amber)",
          }}
        >
          {expanded ? t("showLess") : t("showMore", { n: nuggets.length - 3 })}
        </button>
      )}
    </div>
  );
}
