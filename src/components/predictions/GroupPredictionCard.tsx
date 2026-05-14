"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PredictionMatch } from "@/lib/queries/predictions";

interface ScoreState {
  homeScore: string;
  awayScore: string;
}

interface Props {
  groupName: string;
  matches: PredictionMatch[];
  scores: Map<string, ScoreState>;
  errorMatchIds: Set<string>;
  onScoreChange: (matchId: string, field: "homeScore" | "awayScore", value: string) => void;
}

function TeamBadge({ team }: { team: PredictionMatch["homeTeam"] }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      style={{ width: 60 }}
      title={team.name}
    >
      {team.flagUrl ? (
        <div
          style={{
            width: 44,
            height: 30,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <img
            src={team.flagUrl}
            alt={team.code}
            width={44}
            height={30}
            className="object-cover"
            style={{ width: 44, height: 30 }}
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 30,
            borderRadius: 4,
            background: "var(--color-bg-card-secondary)",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--color-text-muted)",
          }}
        >
          {team.code}
        </div>
      )}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "var(--font-body)",
          color: "var(--color-text-primary)",
        }}
      >
        {team.code}
      </span>
    </div>
  );
}

function ScoreInput({
  value,
  disabled,
  hasError,
  onChange,
}: {
  value: string;
  disabled: boolean;
  hasError?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: "var(--color-bg-input)",
        outline: hasError ? "2px solid var(--color-error, #ef4444)" : undefined,
      }}
    >
      {disabled ? (
        <span
          style={{
            fontSize: 20,
            fontWeight: 900,
            fontFamily: "var(--font-display)",
            color: value ? "var(--color-text-muted)" : "#353151",
          }}
        >
          {value || "-"}
        </span>
      ) : (
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={value}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, "");
            const num = parseInt(cleaned, 10);
            if (cleaned !== "" && (isNaN(num) || num > 20)) return;
            onChange(cleaned);
          }}
          placeholder="-"
          className="border-none outline-none text-center"
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
            fontSize: 20,
            fontWeight: 900,
            fontFamily: "var(--font-display)",
            color: value ? "var(--color-accent-gold)" : "#353151",
            borderRadius: 12,
          }}
        />
      )}
    </div>
  );
}

function MatchRow({
  match,
  scores,
  hasError,
  onScoreChange,
}: {
  match: PredictionMatch;
  scores: ScoreState;
  hasError: boolean;
  onScoreChange: (field: "homeScore" | "awayScore", value: string) => void;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: 16,
        borderRadius: 16,
        background: "#353151",
        opacity: match.hasStarted ? 0.5 : 1,
      }}
    >
      <TeamBadge team={match.homeTeam} />

      <div className="flex items-center gap-2">
        <ScoreInput
          value={scores.homeScore}
          disabled={match.hasStarted}
          hasError={hasError && scores.homeScore === ""}
          onChange={(v) => onScoreChange("homeScore", v)}
        />
        <span
          style={{
            fontSize: 20,
            fontWeight: 900,
            fontFamily: "var(--font-body)",
            color: "var(--color-text-muted)",
          }}
        >
          :
        </span>
        <ScoreInput
          value={scores.awayScore}
          disabled={match.hasStarted}
          hasError={hasError && scores.awayScore === ""}
          onChange={(v) => onScoreChange("awayScore", v)}
        />
      </div>

      <TeamBadge team={match.awayTeam} />

      <Link
        href={`/matches/${match.id}?from=predictions`}
        style={{ flexShrink: 0, lineHeight: 0 }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 16,
            color: "rgba(208, 197, 178, 0.25)",
          }}
        >
          info
        </span>
      </Link>
    </div>
  );
}

export function GroupPredictionCard({
  groupName,
  matches,
  scores,
  errorMatchIds,
  onScoreChange,
}: Props) {
  const t = useTranslations("predictions");
  return (
    <div
      className="flex flex-col"
      style={{
        borderRadius: 24,
        background: "var(--color-bg-card-secondary)",
        border: "1px solid var(--color-border-subtle)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center"
        style={{
          padding: 24,
          borderRadius: "24px 24px 0 0",
          background: "var(--color-bg-card)",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            color: "var(--color-accent-gold)",
          }}
        >
          {t("groupLabel", { name: groupName })}
        </h3>
      </div>

      {/* Match rows */}
      <div
        className="flex flex-col gap-4"
        style={{ padding: 8 }}
      >
        {matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            scores={scores.get(match.id) ?? { homeScore: "", awayScore: "" }}
            hasError={errorMatchIds.has(match.id)}
            onScoreChange={(field, value) =>
              onScoreChange(match.id, field, value)
            }
          />
        ))}
      </div>
    </div>
  );
}
