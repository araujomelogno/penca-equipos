import { getLocale, getTranslations } from "next-intl/server";
import { pickAnalysis } from "@/lib/match-analysis";

interface Props {
  homeTeamName: string;
  awayTeamName: string;
  analysis?: string | null;
  analysisEs?: string | null;
  analysisEn?: string | null;
}

export async function AIAnalysis({
  homeTeamName,
  awayTeamName,
  analysis,
  analysisEs,
  analysisEn,
}: Props) {
  const t = await getTranslations("matches.detail.analysis");
  const locale = await getLocale();
  const analysisText = pickAnalysis(
    locale,
    { es: analysisEs ?? null, en: analysisEn ?? null },
    analysis ?? null,
    t("default", { home: homeTeamName, away: awayTeamName }),
  );

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        padding: "20px 24px",
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
          neurology
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

      {/* Analysis text */}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 400,
          fontFamily: "var(--font-body)",
          lineHeight: 1.5,
          color: "color-mix(in srgb, var(--color-text-primary) 67%, transparent)",
        }}
      >
        {analysisText}
      </p>

      {/* AI tag */}
      <div className="flex items-center gap-1.5">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-accent-amber) 50%, transparent)" }}
        >
          smart_toy
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            color: "color-mix(in srgb, var(--color-text-primary) 25%, transparent)",
          }}
        >
          {t("source")}
        </span>
      </div>
    </div>
  );
}
