import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BoldText } from "@/components/ui/BoldText";
import { highlightIcon, highlightColor } from "@/lib/highlight-presentation";

interface Nugget {
  type: string;
  text: string;
  priority: number;
  matchIds?: string[];
}

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
                  color: highlightColor(n.type),
                  marginTop: 2,
                }}
              >
                {highlightIcon(n.type)}
              </span>
              <BoldText
                text={n.text}
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-secondary)",
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
          color: "var(--color-accent-amber)",
          textDecoration: "none",
          letterSpacing: 0.5,
        }}
      >
        {t("viewInFeed")}
      </Link>
    </div>
  );
}
