"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Props {
  matchId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  currentPrediction: { homeScore: number; awayScore: number } | null;
}

export function PredictionModal({
  matchId,
  homeTeamCode,
  awayTeamCode,
  currentPrediction,
}: Props) {
  const router = useRouter();
  const t = useTranslations("matches.detail.prediction");
  const [homeScore, setHomeScore] = useState(currentPrediction?.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(currentPrediction?.awayScore?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const handleChange = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/\D/g, "");
    const num = parseInt(cleaned, 10);
    if (cleaned !== "" && (isNaN(num) || num > 20)) return;
    setter(cleaned);
  };

  const canSave = homeScore !== "" && awayScore !== "";

  const handleSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/predictions/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore: parseInt(homeScore, 10),
          awayScore: parseInt(awayScore, 10),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || t("failedSave"));
        return;
      }

      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="predict"
      className="flex flex-col gap-4"
      style={{
        padding: 24,
        borderRadius: 16,
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, color: "var(--color-accent-amber)" }}
        >
          edit_note
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--color-accent-amber)",
          }}
        >
          {currentPrediction ? t("editTitle") : t("createTitle")}
        </span>
      </div>

      {/* Score inputs */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
              letterSpacing: 2,
              color: "var(--color-text-secondary)",
            }}
          >
            {homeTeamCode}
          </span>
          <div
            className="flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "var(--color-bg-input)",
            }}
          >
            <input
              type="number"
              min={0}
              max={20}
              value={homeScore}
              onChange={(e) => handleChange(e.target.value, setHomeScore)}
              placeholder="-"
              className="border-none outline-none text-center"
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
                fontSize: 28,
                fontWeight: 900,
                fontFamily: "var(--font-display)",
                color: homeScore ? "var(--color-accent-gold)" : "var(--color-bg-elevated)",
                borderRadius: 16,
              }}
            />
          </div>
        </div>

        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-muted)",
            paddingTop: 24,
          }}
        >
          :
        </span>

        <div className="flex flex-col items-center gap-2">
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
              letterSpacing: 2,
              color: "var(--color-text-secondary)",
            }}
          >
            {awayTeamCode}
          </span>
          <div
            className="flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "var(--color-bg-input)",
            }}
          >
            <input
              type="number"
              min={0}
              max={20}
              value={awayScore}
              onChange={(e) => handleChange(e.target.value, setAwayScore)}
              placeholder="-"
              className="border-none outline-none text-center"
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
                fontSize: 28,
                fontWeight: 900,
                fontFamily: "var(--font-display)",
                color: awayScore ? "var(--color-accent-gold)" : "var(--color-bg-elevated)",
                borderRadius: 16,
              }}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="btn-primary w-full"
        style={{ padding: "14px 24px", borderRadius: 12, opacity: saving ? 0.7 : 1 }}
      >
        {saving ? t("saving") : currentPrediction ? t("updateAction") : t("saveAction")}
      </button>
    </div>
  );
}
