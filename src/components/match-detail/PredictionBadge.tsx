"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Props {
  matchId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  kickoffTime: string;
  matchStatus: string;
  userPrediction: {
    homeScore: number;
    awayScore: number;
    points: number | null;
  } | null;
}

export function PredictionBadge({
  matchId,
  homeTeamCode,
  awayTeamCode,
  kickoffTime,
  matchStatus,
  userPrediction,
}: Props) {
  const router = useRouter();
  const t = useTranslations("matches.detail.prediction");
  const [editing, setEditing] = useState(false);
  const [homeScore, setHomeScore] = useState(
    userPrediction?.homeScore?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    userPrediction?.awayScore?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const homeInputRef = useRef<HTMLInputElement>(null);

  const isLive = matchStatus === "LIVE" || matchStatus === "HALFTIME";
  const isFinished = matchStatus === "FINISHED";
  const hasStarted = isLive || isFinished || new Date(kickoffTime) <= new Date();

  useEffect(() => {
    if (editing && homeInputRef.current) {
      homeInputRef.current.focus();
      homeInputRef.current.select();
    }
  }, [editing]);

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
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setHomeScore(userPrediction?.homeScore?.toString() ?? "");
    setAwayScore(userPrediction?.awayScore?.toString() ?? "");
    setEditing(false);
  };

  // Determine result badge
  let resultBadge: {
    label: string;
    color: string;
    bg: string;
    border: string;
  } | null = null;
  if (isFinished && userPrediction?.points != null) {
    if (userPrediction.points === 5) {
      resultBadge = {
        label: t("resultExact"),
        color: "var(--color-success)",
        bg: "color-mix(in srgb, var(--color-accent-green) 20%, transparent)",
        border: "color-mix(in srgb, var(--color-accent-green) 30%, transparent)",
      };
    } else if (userPrediction.points === 3) {
      resultBadge = {
        label: t("resultWinner"),
        color: "var(--color-success)",
        bg: "color-mix(in srgb, var(--color-accent-green) 20%, transparent)",
        border: "color-mix(in srgb, var(--color-accent-green) 30%, transparent)",
      };
    } else {
      resultBadge = {
        label: t("resultMiss"),
        color: "var(--color-error-soft)",
        bg: "color-mix(in srgb, var(--color-error-soft) 10%, transparent)",
        border: "color-mix(in srgb, var(--color-error-soft) 20%, transparent)",
      };
    }
  }

  return (
    <div
      className="flex flex-col items-center gap-2 lg:gap-3 shrink-0 w-full lg:w-[160px] lg:p-4 lg:rounded-xl lg:border lg:border-white/5 lg:bg-[color-mix(in_srgb,var(--color-bg-input)_50%,transparent)]"
    >
      {/* Header: title + status */}
      <div className="flex items-center gap-2 lg:flex-col lg:gap-1">
        <span
          className="material-symbols-outlined hidden lg:block"
          style={{ fontSize: 20, color: "var(--color-accent-amber)" }}
        >
          query_stats
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            color: "var(--color-text-primary)",
          }}
        >
          {t("title")}
        </span>
        {/* Status label — hidden on mobile when just "PREDICTED" (redundant) */}
        <span
          className={editing || !userPrediction || hasStarted ? "" : "hidden lg:inline"}
          style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "var(--font-body)",
            letterSpacing: 2,
            color: "var(--color-accent-amber)",
            textAlign: "center",
          }}
        >
          {editing
            ? t("enterScore")
            : !userPrediction
              ? t("notYetPredicted")
              : hasStarted
                ? t("matchInProgress")
                : t("predicted")}
        </span>
      </div>

      {/* Score area: inputs in edit mode, display otherwise */}
      {editing ? (
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--color-bg-input)",
            }}
          >
            <input
              ref={homeInputRef}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={homeScore}
              onChange={(e) => handleChange(e.target.value, setHomeScore)}
              placeholder="-"
              className="border-none outline-none text-center"
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
                fontSize: 20,
                fontWeight: 900,
                fontFamily: "var(--font-display)",
                color: homeScore
                  ? "var(--color-accent-gold)"
                  : "color-mix(in srgb, var(--color-text-primary) 30%, transparent)",
                borderRadius: 12,
              }}
            />
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              fontFamily: "var(--font-body)",
              color: "color-mix(in srgb, var(--color-text-primary) 20%, transparent)",
            }}
          >
            :
          </span>
          <div
            className="flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--color-bg-input)",
            }}
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={awayScore}
              onChange={(e) => handleChange(e.target.value, setAwayScore)}
              placeholder="-"
              className="border-none outline-none text-center"
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
                fontSize: 20,
                fontWeight: 900,
                fontFamily: "var(--font-display)",
                color: awayScore
                  ? "var(--color-accent-gold)"
                  : "color-mix(in srgb, var(--color-text-primary) 30%, transparent)",
                borderRadius: 12,
              }}
            />
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 py-1.5 px-4 lg:py-2 lg:px-5"
          style={{
            borderRadius: 12,
            background: "color-mix(in srgb, var(--color-bg-input) 50%, transparent)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              fontFamily: "var(--font-display)",
              color: userPrediction
                ? "var(--color-accent-gold)"
                : "color-mix(in srgb, var(--color-text-primary) 30%, transparent)",
            }}
          >
            {userPrediction?.homeScore ?? "-"}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              fontFamily: "var(--font-body)",
              color: userPrediction ? "color-mix(in srgb, var(--color-text-primary) 50%, transparent)" : "color-mix(in srgb, var(--color-text-primary) 10%, transparent)",
            }}
          >
            :
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              fontFamily: "var(--font-display)",
              color: userPrediction
                ? "var(--color-accent-gold)"
                : "color-mix(in srgb, var(--color-text-primary) 30%, transparent)",
            }}
          >
            {userPrediction?.awayScore ?? "-"}
          </span>
        </div>
      )}

      {resultBadge && !editing && (
        <div
          style={{
            padding: "4px 12px",
            borderRadius: 100,
            background: resultBadge.bg,
            border: `1px solid ${resultBadge.border}`,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "var(--font-body)",
              letterSpacing: 1,
              color: resultBadge.color,
            }}
          >
            {resultBadge.label}
          </span>
        </div>
      )}

      {/* Action buttons */}
      {editing ? (
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="btn-primary w-full"
            style={{ padding: "10px 24px", borderRadius: 12, fontSize: 10, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? t("saving") : t("save")}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="btn-secondary w-full"
            style={{ padding: "8px 24px", borderRadius: 12, fontSize: 10, letterSpacing: 1 }}
          >
            {t("cancel")}
          </button>
        </div>
      ) : (
        !hasStarted && (
          <button
            onClick={() => setEditing(true)}
            className={userPrediction ? "btn-secondary" : "btn-primary"}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              fontSize: 10,
              ...(userPrediction
                ? { borderColor: "color-mix(in srgb, var(--color-accent-amber) 30%, transparent)", color: "var(--color-accent-amber)" }
                : {}),
            }}
          >
            <span>
              {userPrediction ? t("edit") : t("predict")}
            </span>
          </button>
        )
      )}
    </div>
  );
}
