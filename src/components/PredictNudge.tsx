import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { PredictNudge as PredictNudgeData } from "@/lib/queries/home";

export async function PredictNudge({ nudge }: { nudge: PredictNudgeData | null }) {
  if (!nudge || nudge.count === 0) return null;
  const t = await getTranslations("home.predictNudge");
  const tStage = await getTranslations("matches.stage");
  const stageLabel = tStage.has(nudge.stage) ? tStage(nudge.stage) : nudge.stage;

  return (
    <Link
      href="/predictions"
      className="flex items-center justify-between gap-4"
      style={{
        padding: "14px 20px",
        borderRadius: 16,
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-accent-gold)",
        textDecoration: "none",
      }}
    >
      <span className="flex items-center gap-2" style={{ minWidth: 0 }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, color: "var(--color-accent-amber)" }}
        >
          sports_soccer
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-primary)",
          }}
        >
          {t("message", { stage: stageLabel, count: nudge.count })}
        </span>
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          color: "var(--color-accent-gold)",
        }}
      >
        {t("cta")} →
      </span>
    </Link>
  );
}
