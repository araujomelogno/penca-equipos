import { getTranslations } from "next-intl/server";

interface Props {
  homeTeamName: string;
  awayTeamName: string;
  analysis?: string | null;
}

export async function AIAnalysis({ homeTeamName, awayTeamName, analysis }: Props) {
  const t = await getTranslations("matches.detail.analysis");
  const analysisText = analysis ?? t("default", { home: homeTeamName, away: awayTeamName });

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
          color: "#e5deffAA",
        }}
      >
        {analysisText}
      </p>

      {/* AI tag */}
      <div className="flex items-center gap-1.5">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 14, color: "#e9c46a80" }}
        >
          smart_toy
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            color: "#e5deff40",
          }}
        >
          {t("source")}
        </span>
      </div>
    </div>
  );
}
