"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MatchCardData } from "@/lib/queries/matches";
import { matchCardState } from "@/lib/match-state";
import { KickoffTime } from "@/components/ui/KickoffTime";

interface Props {
  match: MatchCardData;
}

type Translator = (key: string, values?: Record<string, string | number>) => string;

const BADGE_COLORS = {
  EXACT: { color: "var(--color-success)", bg: "color-mix(in srgb, var(--color-accent-green) 20%, transparent)", border: "color-mix(in srgb, var(--color-accent-green) 30%, transparent)", ptsColor: "var(--color-text-accent)" },
  PARTIAL: { color: "var(--color-warning-soft)", bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)", border: "color-mix(in srgb, var(--color-warning) 20%, transparent)", ptsColor: "var(--color-warning-soft)" },
  MISS: { color: "var(--color-error-soft)", bg: "color-mix(in srgb, var(--color-error-soft) 10%, transparent)", border: "color-mix(in srgb, var(--color-error-soft) 20%, transparent)", ptsColor: "var(--color-text-secondary)" },
} as const;

function getBadgeType(points: number | null): keyof typeof BADGE_COLORS | null {
  if (points === null) return null;
  if (points === 5) return "EXACT";
  if (points === 3) return "PARTIAL";
  return "MISS";
}

function badgeLabel(type: keyof typeof BADGE_COLORS, t: Translator): string {
  if (type === "EXACT") return t("exact");
  if (type === "PARTIAL") return t("partial");
  return t("miss");
}

function TeamColumn({ team }: { team: MatchCardData["homeTeam"] }) {
  return (
    <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: 60 }} title={team.name}>
      <span style={{ fontSize: 12, fontWeight: 900, fontFamily: "var(--font-body)", letterSpacing: 2, color: "var(--color-text-secondary)" }}>
        {team.code}
      </span>
      {team.flagUrl ? (
        <div style={{ width: 56, height: 38, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
          <img src={team.flagUrl} alt={team.code} width={56} height={38} className="object-cover" style={{ width: 56, height: 38 }} />
        </div>
      ) : (
        <div className="flex items-center justify-center" style={{ width: 56, height: 38, borderRadius: 4, background: "var(--color-bg-card-secondary)", fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>
          {team.code}
        </div>
      )}
    </div>
  );
}

function ScoreInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const handleChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    const num = parseInt(cleaned, 10);
    if (cleaned !== "" && (isNaN(num) || num > 20)) return;
    onChange(cleaned);
  };

  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="-"
      className="border-none outline-none text-center"
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: "var(--color-bg-input)",
        border: "2px solid var(--color-accent-amber)",
        fontSize: 28,
        fontWeight: 900,
        fontFamily: "var(--font-display)",
        color: value ? "var(--color-accent-gold)" : "var(--color-bg-elevated)",
      }}
    />
  );
}

function ScoreSection({
  match,
  editing,
  homeScore,
  awayScore,
  onHomeChange,
  onAwayChange,
  t,
}: {
  match: MatchCardData;
  editing: boolean;
  homeScore: string;
  awayScore: string;
  onHomeChange: (v: string) => void;
  onAwayChange: (v: string) => void;
  t: Translator;
}) {
  const isFinished = match.status === "FINISHED";
  const isOngoing = match.status === "LIVE" || match.status === "HALFTIME";
  const isScheduled = match.status === "SCHEDULED";
  const hasPrediction = match.userPrediction !== null;

  const scoreColor = isFinished || isOngoing
    ? "var(--color-accent-amber)"
    : "rgba(208, 197, 178, 0.5)";

  return (
    <div className="flex flex-col items-center gap-2">
      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: 1, color: "var(--color-text-secondary)" }}>
        <KickoffTime date={typeof match.kickoffTime === "string" ? match.kickoffTime : match.kickoffTime.toISOString()} timeOnly />
      </span>

      <div className="flex items-center gap-4">
        {editing ? (
          <ScoreInput value={homeScore} onChange={onHomeChange} />
        ) : (
          <span style={{ fontSize: 30, fontWeight: 900, fontFamily: "var(--font-display)", color: scoreColor, lineHeight: 1 }}>
            {isFinished || isOngoing ? match.homeScore : hasPrediction ? match.userPrediction!.homeScore : "-"}
          </span>
        )}

        <div className="flex items-center justify-center" style={{ padding: "0 16px", borderRadius: 4, background: "var(--color-bg-input)", border: "1px solid rgba(233, 196, 106, 0.1)", alignSelf: "stretch" }}>
          <span style={{ fontSize: 10, fontWeight: 900, fontFamily: "var(--font-body)", color: "var(--color-accent-amber)" }}>{t("vs")}</span>
        </div>

        {editing ? (
          <ScoreInput value={awayScore} onChange={onAwayChange} />
        ) : (
          <span style={{ fontSize: 30, fontWeight: 900, fontFamily: "var(--font-display)", color: scoreColor, lineHeight: 1 }}>
            {isFinished || isOngoing ? match.awayScore : hasPrediction ? match.userPrediction!.awayScore : "-"}
          </span>
        )}
      </div>
    </div>
  );
}

function SocialStats({ match, t }: { match: MatchCardData; t: Translator }) {
  const isFinished = match.status === "FINISHED";
  const { stats } = match;

  if (isFinished && stats.totalPredictions > 0) {
    const winnerPct = Math.round(((stats.exactCount + stats.correctWinnerCount) / stats.totalPredictions) * 100);
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body)", color: "rgba(255, 225, 158, 0.5)" }}>
          {t("exactCount", { n: stats.exactCount })}
        </span>
        <span style={{ fontSize: 10, fontWeight: 500, fontFamily: "var(--font-body)", color: "rgba(208, 197, 178, 0.5)" }}>
          {t("winnerPct", { pct: winnerPct })}
        </span>
      </div>
    );
  }

  if (stats.totalPredictions > 0) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body)", color: "rgba(208, 197, 178, 0.5)" }}>
          {t("alreadyPredicted", { n: stats.totalPredictions })}
        </span>
        {stats.avgHomeScore != null && stats.avgAwayScore != null && (
          <span style={{ fontSize: 10, fontWeight: 500, fontFamily: "var(--font-body)", color: "rgba(208, 197, 178, 0.35)" }}>
            {t("avg", { home: Math.round(stats.avgHomeScore), away: Math.round(stats.avgAwayScore) })}
          </span>
        )}
      </div>
    );
  }

  return null;
}

function ResultSection({
  match,
  editing,
  canSave,
  saving,
  onEdit,
  onSave,
  onCancel,
  t,
}: {
  match: MatchCardData;
  editing: boolean;
  canSave: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  t: Translator;
}) {
  const state = matchCardState(match, new Date());
  const isFinished = state === "finished";
  const isScheduled = state === "editable";
  const hasPrediction = match.userPrediction !== null;

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  if (isFinished) {
    const badgeType = getBadgeType(match.userPoints);
    const config = badgeType ? BADGE_COLORS[badgeType] : null;
    const ptsText = match.userPoints === null ? null : t("points", { n: match.userPoints });

    return (
      <div className="flex flex-col items-end gap-2 shrink-0">
        {config && badgeType && (
          <div style={{ padding: "6px 16px", borderRadius: 100, background: config.bg, border: `1px solid ${config.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 900, fontFamily: "var(--font-body)", letterSpacing: 2, color: config.color }}>
              {badgeLabel(badgeType, t)}
            </span>
          </div>
        )}
        {match.userPrediction && (
          <div className="flex items-end gap-2">
            <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font-body)", color: "var(--color-text-secondary)" }}>
              {t("predictionLabel", { home: match.userPrediction.homeScore, away: match.userPrediction.awayScore })}
            </span>
            {ptsText && (
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-display)", color: config?.ptsColor ?? "var(--color-text-secondary)" }}>{ptsText}</span>
            )}
          </div>
        )}
        {!match.userPrediction && (
          <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}>{t("notPredicted")}</span>
        )}
      </div>
    );
  }

  if (isScheduled) {
    if (editing) {
      return (
        <div className="flex items-center gap-2 shrink-0" onClick={stop}>
          <button
            onClick={(e) => { stop(e); onCancel(); }}
            className="border-none cursor-pointer flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: 8, background: "var(--color-bg-elevated)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-text-muted)" }}>close</span>
          </button>
          <button
            onClick={(e) => { stop(e); onSave(); }}
            disabled={!canSave || saving}
            className="btn-primary"
            style={{ width: 36, height: 36, padding: 0, borderRadius: 8, opacity: saving ? 0.7 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {saving ? "hourglass_empty" : "check"}
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center shrink-0" onClick={stop}>
        <button
          onClick={(e) => { stop(e); onEdit(); }}
          className={hasPrediction ? "btn-secondary" : "btn-primary"}
          style={{
            width: 140,
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 10,
            ...(hasPrediction
              ? { borderColor: "rgba(233, 196, 106, 0.3)", color: "var(--color-accent-amber)" }
              : {}),
          }}
        >
          {hasPrediction ? t("edit") : t("predict")}
        </button>
      </div>
    );
  }

  // Kickoff passed but status still SCHEDULED (sync lag): read-only, prediction locked.
  if (state === "awaiting") {
    return (
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: 1 }}>{t("awaitingResult")}</span>
        {match.userPrediction && (
          <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font-body)", color: "var(--color-text-secondary)" }}>
            {t("predictionLabel", { home: match.userPrediction.homeScore, away: match.userPrediction.awayScore })}
          </span>
        )}
      </div>
    );
  }

  // ONGOING
  if (match.userPrediction) {
    return (
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="animate-ongoing" style={{ fontSize: 10, fontWeight: 700, color: "var(--color-accent-green)", letterSpacing: 1 }}>{t("ongoing")}</span>
        <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font-body)", color: "var(--color-text-secondary)" }}>
          {t("predictionLabel", { home: match.userPrediction.homeScore, away: match.userPrediction.awayScore })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end shrink-0">
      <span className="animate-ongoing" style={{ fontSize: 10, fontWeight: 700, color: "var(--color-accent-green)", letterSpacing: 1 }}>{t("ongoing")}</span>
    </div>
  );
}

export function MatchCard({ match }: Props) {
  const router = useRouter();
  const t = useTranslations("matches.card");
  const [editing, setEditing] = useState(false);
  const [homeScore, setHomeScore] = useState(match.userPrediction?.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(match.userPrediction?.awayScore?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const canSave = homeScore !== "" && awayScore !== "";

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/predictions/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore: parseInt(homeScore, 10), awayScore: parseInt(awayScore, 10) }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setHomeScore(match.userPrediction?.homeScore?.toString() ?? "");
    setAwayScore(match.userPrediction?.awayScore?.toString() ?? "");
  };

  return (
    <Link
      href={`/matches/${match.id}`}
      className="no-underline flex flex-col sm:flex-row items-center sm:justify-between gap-4"
      onClick={(e) => { if (editing) e.preventDefault(); }}
      style={{
        padding: 20,
        borderRadius: 12,
        background: editing ? "color-mix(in srgb, var(--color-bg-card) 50%, transparent)" : "var(--color-bg-card)",
        border: editing ? "1px solid var(--color-accent-amber)" : "1px solid var(--color-border-subtle)",
        minHeight: 125,
        overflow: "hidden",
        textDecoration: "none",
        cursor: editing ? "default" : "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => { if (!editing) e.currentTarget.style.background = "color-mix(in srgb, var(--color-bg-card) 50%, transparent)"; }}
      onMouseLeave={(e) => { if (!editing) e.currentTarget.style.background = "var(--color-bg-card)"; }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-12 flex-1 min-w-0">
        <div className="flex items-center gap-4 sm:gap-12">
          <TeamColumn team={match.homeTeam} />
          <ScoreSection
            match={match}
            editing={editing}
            homeScore={homeScore}
            awayScore={awayScore}
            onHomeChange={setHomeScore}
            onAwayChange={setAwayScore}
            t={t}
          />
          <TeamColumn team={match.awayTeam} />
        </div>
        <div className="flex items-center justify-center min-w-0">
          <SocialStats match={match} t={t} />
        </div>
      </div>

      <ResultSection
        match={match}
        editing={editing}
        canSave={canSave}
        saving={saving}
        onEdit={() => setEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        t={t}
      />
    </Link>
  );
}
