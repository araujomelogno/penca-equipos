"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BracketData, BracketMatch, BracketSlot } from "@/lib/queries/bracket";

interface Props {
  data: BracketData;
}

/** Format bracket labels: "1A" → "1° A", "3rd A/B/C/D/F" → "3° A/B..", "W74" → "W74" */
function formatLabel(label: string): string {
  const pos = label.match(/^([12])([A-L])$/);
  if (pos) return `${pos[1]}° ${pos[2]}`;
  const third = label.match(/^3rd (.+)$/);
  if (third) {
    const groups = third[1];
    return groups.length > 5 ? `3° ${groups.slice(0, 5)}..` : `3° ${groups}`;
  }
  return label;
}

function SlotCell({
  slot,
  isWinner,
  mirrored,
}: {
  slot: BracketSlot;
  isWinner: boolean;
  mirrored?: boolean;
}) {
  const hasTeam = !!slot.teamCode;
  const textColor = hasTeam
    ? isWinner ? "var(--color-accent-gold)" : "var(--color-text-primary)"
    : "var(--color-text-muted)";

  const flag = hasTeam && slot.flagUrl ? (
    <img
      src={slot.flagUrl}
      alt={slot.teamCode}
      width={20}
      height={14}
      style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
    />
  ) : hasTeam ? (
    <div
      style={{
        width: 20,
        height: 14,
        borderRadius: 2,
        background: "var(--color-bg-card-secondary)",
        flexShrink: 0,
      }}
    />
  ) : null;

  const name = (
    <span
      className="truncate hidden sm:inline"
      style={{
        fontSize: 11,
        fontWeight: isWinner ? 800 : 600,
        fontFamily: "var(--font-body)",
        color: textColor,
      }}
    >
      {slot.teamCode ?? formatLabel(slot.label)}
    </span>
  );

  /* Mobile: show short label when no flag */
  const mobileLabel = !flag ? (
    <span
      className="sm:hidden"
      style={{
        fontSize: 8,
        fontWeight: 700,
        fontFamily: "var(--font-body)",
        color: textColor,
      }}
    >
      {slot.teamCode ?? formatLabel(slot.label)}
    </span>
  ) : null;

  const score = slot.score != null ? (
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        fontFamily: "var(--font-display)",
        color: isWinner ? "var(--color-accent-gold)" : "var(--color-text-primary)",
        flexShrink: 0,
      }}
    >
      {slot.score}
    </span>
  ) : null;

  return (
    <div
      className="flex items-center gap-1 sm:gap-2 justify-between"
      style={{
        padding: "4px 6px",
        flexDirection: mirrored ? "row-reverse" : "row",
      }}
    >
      <div
        className="flex items-center gap-1 sm:gap-2 min-w-0"
        style={{ flexDirection: mirrored ? "row-reverse" : "row" }}
      >
        {flag}
        {mobileLabel}
        {name}
      </div>
      {score}
    </div>
  );
}

function MatchCell({
  match,
  mirrored,
  liveLabel,
}: {
  match: BracketMatch;
  mirrored?: boolean;
  liveLabel: string;
}) {
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE" || match.status === "HALFTIME";

  let homeWinner = false;
  let awayWinner = false;
  if (isFinished && match.home.score != null && match.away.score != null) {
    homeWinner = match.home.score > match.away.score;
    awayWinner = match.away.score > match.home.score;
  }

  return (
    <div
      className="flex flex-col bracket-card"
      style={{
        borderRadius: 6,
        overflow: "hidden",
        background: "var(--color-bg-card)",
        border: isLive
          ? "1px solid var(--color-accent-green)"
          : "1px solid var(--color-border-light)",
      }}
    >
      <SlotCell slot={match.home} isWinner={homeWinner} mirrored={mirrored} />
      <div style={{ height: 1, background: "var(--color-border-light)" }} />
      <SlotCell slot={match.away} isWinner={awayWinner} mirrored={mirrored} />
      {isLive && (
        <div
          style={{
            textAlign: "center",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: 1,
            padding: "3px 0",
            background: "var(--color-accent-green)",
            color: "#000",
          }}
        >
          {liveLabel}
        </div>
      )}
    </div>
  );
}

/* SVG connector: merges pairs of matches into the next round */
function Connector({
  count,
  gapBetween,
  mirrored,
}: {
  count: number;
  gapBetween: number;
  mirrored?: boolean;
}) {
  const pairs = Math.floor(count / 2);
  return (
    <div
      className="flex flex-col justify-around bracket-connector"
      style={{}}
    >
      {Array.from({ length: pairs }).map((_, i) => (
        <svg
          key={i}
          width="100%"
          height={gapBetween}
          style={{ display: "block", transform: mirrored ? "scaleX(-1)" : undefined }}
          viewBox={`0 0 20 ${gapBetween}`}
          preserveAspectRatio="none"
        >
          <path
            d={`M0 ${gapBetween * 0.25} H10 V${gapBetween * 0.5} H20 M0 ${gapBetween * 0.75} H10 V${gapBetween * 0.5}`}
            fill="none"
            stroke="var(--color-border-light)"
            strokeWidth={1.5}
          />
        </svg>
      ))}
    </div>
  );
}

function RoundColumn({
  matches,
  label,
  mirrored,
  liveLabel,
}: {
  matches: BracketMatch[];
  label: string;
  mirrored?: boolean;
  liveLabel: string;
}) {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: "var(--color-text-muted)",
          marginBottom: 12,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        className="flex flex-col justify-around flex-1"
        style={{ gap: 6 }}
      >
        {matches.map((m) => (
          <MatchCell key={m.matchNumber} match={m} mirrored={mirrored} liveLabel={liveLabel} />
        ))}
      </div>
    </div>
  );
}

/* ── Desktop: full mirror bracket ── */
function DesktopBracket({ data, liveLabel, finalLabel }: Props & { liveLabel: string; finalLabel: string }) {
  const leftR32 = data.r32.slice(0, 8);
  const rightR32 = data.r32.slice(8, 16);
  const leftR16 = data.r16.slice(0, 4);
  const rightR16 = data.r16.slice(4, 8);
  const leftQF = data.qf.slice(0, 2);
  const rightQF = data.qf.slice(2, 4);
  const leftSF = [data.sf[0]];
  const rightSF = [data.sf[1]];

  return (
    <div className="flex items-stretch" style={{ gap: 0, minHeight: 700 }}>
      <RoundColumn matches={leftR32} label="R32" liveLabel={liveLabel} />
      <Connector count={8} gapBetween={76} />
      <RoundColumn matches={leftR16} label="R16" liveLabel={liveLabel} />
      <Connector count={4} gapBetween={152} />
      <RoundColumn matches={leftQF} label="QF" liveLabel={liveLabel} />
      <Connector count={2} gapBetween={304} />
      <RoundColumn matches={leftSF} label="SF" liveLabel={liveLabel} />

      <div
        className="flex flex-col items-center justify-center"
        style={{ padding: "0 8px", flex: "1 1 0%" }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 2,
            color: "var(--color-accent-gold)",
            marginBottom: 12,
          }}
        >
          {finalLabel}
        </span>
        <MatchCell match={data.final} liveLabel={liveLabel} />
      </div>

      <RoundColumn matches={rightSF} label="SF" mirrored liveLabel={liveLabel} />
      <Connector count={2} gapBetween={304} mirrored />
      <RoundColumn matches={rightQF} label="QF" mirrored liveLabel={liveLabel} />
      <Connector count={4} gapBetween={152} mirrored />
      <RoundColumn matches={rightR16} label="R16" mirrored liveLabel={liveLabel} />
      <Connector count={8} gapBetween={76} mirrored />
      <RoundColumn matches={rightR32} label="R32" mirrored liveLabel={liveLabel} />
    </div>
  );
}

/* ── Mobile: 4-column paginated bracket ── */

interface MobileLevel {
  label: string;
  leftOuter: BracketMatch[];
  leftInner: BracketMatch[];
  rightInner: BracketMatch[];
  rightOuter: BracketMatch[];
  outerGap: number;
  innerGap: number;
}

function MobileBracket({
  data,
  liveLabel,
  finalLabel,
  levelLabels,
}: Props & {
  liveLabel: string;
  finalLabel: string;
  levelLabels: { r32: string; qf: string; sfFinal: string };
}) {
  const [levelIdx, setLevelIdx] = useState(0);

  const leftR32 = data.r32.slice(0, 8);
  const rightR32 = data.r32.slice(8, 16);
  const leftR16 = data.r16.slice(0, 4);
  const rightR16 = data.r16.slice(4, 8);
  const leftQF = data.qf.slice(0, 2);
  const rightQF = data.qf.slice(2, 4);
  const leftSF = [data.sf[0]];
  const rightSF = [data.sf[1]];

  // Card height ~36px. Gap between cards scales so the bracket looks proportional.
  const cardH = 36;
  const baseGap = 6;

  // Each level: outerGap = space for connector to merge pairs of outer matches
  // innerGap = space for connector to merge pairs of inner matches
  // Height driven by outer count: (count * cardH) + ((count-1) * gap)
  function computeGaps(outerCount: number, innerCount: number) {
    // outer gap: just enough to space outer cards evenly
    const outerGap = cardH + baseGap;
    // inner gap: each inner match spans 2 outer matches, so double the outer slot height
    const innerSlotH = (outerCount / innerCount) * (cardH + baseGap);
    const innerGap = innerSlotH;
    return { outerGap, innerGap };
  }

  const g0 = computeGaps(8, 4);
  const g1 = computeGaps(4, 2);
  const g2 = computeGaps(2, 1);

  const levels: MobileLevel[] = [
    {
      label: levelLabels.r32,
      leftOuter: leftR32,
      leftInner: leftR16,
      rightInner: rightR16,
      rightOuter: rightR32,
      outerGap: g0.outerGap,
      innerGap: g0.innerGap,
    },
    {
      label: levelLabels.qf,
      leftOuter: leftR16,
      leftInner: leftQF,
      rightInner: rightQF,
      rightOuter: rightR16,
      outerGap: g1.outerGap,
      innerGap: g1.innerGap,
    },
    {
      label: levelLabels.sfFinal,
      leftOuter: leftQF,
      leftInner: leftSF,
      rightInner: rightSF,
      rightOuter: rightQF,
      outerGap: g2.outerGap,
      innerGap: g2.innerGap,
    },
  ];

  const level = levels[levelIdx];
  const hasPrev = levelIdx > 0;
  const hasNext = levelIdx < levels.length - 1;
  const showFinal = levelIdx === levels.length - 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Level nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setLevelIdx((i) => i - 1)}
          disabled={!hasPrev}
          className="btn-icon"
          style={{ opacity: hasPrev ? 1 : 0.3 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-text-secondary)" }}>
            chevron_left
          </span>
        </button>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            color: "var(--color-accent-gold)",
            fontFamily: "var(--font-display)",
          }}
        >
          {level.label}
        </span>
        <button
          onClick={() => setLevelIdx((i) => i + 1)}
          disabled={!hasNext}
          className="btn-icon"
          style={{ opacity: hasNext ? 1 : 0.3 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-text-secondary)" }}>
            chevron_right
          </span>
        </button>
      </div>

      {/* Level dots */}
      <div className="flex items-center justify-center gap-2">
        {levels.map((_, i) => (
          <button
            key={i}
            onClick={() => setLevelIdx(i)}
            className="border-none cursor-pointer p-0"
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: i === levelIdx ? "var(--color-accent-gold)" : "var(--color-bg-card)",
            }}
          />
        ))}
      </div>

      {/* 4-column bracket */}
      <div className="flex items-stretch" style={{ gap: 0 }}>
        <RoundColumn matches={level.leftOuter} label="" liveLabel={liveLabel} />
        <Connector count={level.leftOuter.length} gapBetween={level.outerGap} />
        <RoundColumn matches={level.leftInner} label="" liveLabel={liveLabel} />
        <Connector count={level.leftInner.length} gapBetween={level.innerGap} />
        <Connector count={level.rightInner.length} gapBetween={level.innerGap} mirrored />
        <RoundColumn matches={level.rightInner} label="" mirrored liveLabel={liveLabel} />
        <Connector count={level.rightOuter.length} gapBetween={level.outerGap} mirrored />
        <RoundColumn matches={level.rightOuter} label="" mirrored liveLabel={liveLabel} />
      </div>

      {/* Final (only on last level) */}
      {showFinal && (
        <div className="flex flex-col items-center gap-2" style={{ paddingTop: 8 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 2,
              color: "var(--color-accent-gold)",
            }}
          >
            {finalLabel}
          </span>
          <MatchCell match={data.final} liveLabel={liveLabel} />
        </div>
      )}
    </div>
  );
}

export function BracketView({ data }: Props) {
  const t = useTranslations("fixture");
  const liveLabel = t("live");
  const finalLabel = t("final");
  const levelLabels = {
    r32: t("roundOf32"),
    qf: t("quarterFinals"),
    sfFinal: t("semisAndFinal"),
  };
  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Desktop: full mirror bracket */}
      <div className="hidden sm:block">
        <DesktopBracket data={data} liveLabel={liveLabel} finalLabel={finalLabel} />
      </div>

      {/* Mobile: paginated 4-column bracket */}
      <div className="sm:hidden">
        <MobileBracket
          data={data}
          liveLabel={liveLabel}
          finalLabel={finalLabel}
          levelLabels={levelLabels}
        />
      </div>
    </div>
  );
}
