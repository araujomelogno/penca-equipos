"use client";

import { useTranslations } from "next-intl";

interface Props {
  completed: number;
  total: number;
}

export function ProgressCard({ completed, total }: Props) {
  const t = useTranslations("predictions");
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        width: "100%",
        padding: "20px 24px",
        borderRadius: 16,
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Header row */}
      <div className="flex items-end justify-between">
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            letterSpacing: 2,
            color: "var(--color-accent-gold)",
          }}
        >
          {t("progress")}
        </span>
        <div className="flex items-end gap-0.5">
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            {completed}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 400,
              fontFamily: "var(--font-body)",
              color: "var(--color-text-muted)",
            }}
          >
            /{total}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 8,
          borderRadius: 6,
          background: "var(--color-bg-input)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 6,
            background: "linear-gradient(90deg, #ffe19e, #e9c46a)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
