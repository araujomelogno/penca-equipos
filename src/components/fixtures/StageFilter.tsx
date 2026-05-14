"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { StageTab } from "@/lib/queries/fixtures";

interface Props {
  stages: StageTab[];
  activeStage: string;
}

type StageKey = "GROUP" | "R32" | "R16" | "QF" | "SF" | "FINAL";
const STAGE_KEYS: readonly StageKey[] = ["GROUP", "R32", "R16", "QF", "SF", "FINAL"];

export function StageFilter({ stages, activeStage }: Props) {
  const t = useTranslations("standings.stage");
  const labelFor = (stage: StageTab): string => {
    if ((STAGE_KEYS as readonly string[]).includes(stage.value)) {
      return t(stage.value as StageKey);
    }
    return stage.label;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stages.map((stage) => {
        const isActive = stage.value === activeStage;
        return (
          <Link
            key={stage.value}
            href={stage.value === "GROUP" ? "/standings" : `/standings?stage=${stage.value}`}
            className="no-underline transition-colors"
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              letterSpacing: 0.5,
              textDecoration: "none",
              background: isActive ? "var(--color-accent-gold)" : "transparent",
              color: isActive ? "var(--color-text-accent-dark)" : "var(--color-accent-silver)",
              border: isActive ? "none" : "1px solid var(--color-border-light)",
            }}
          >
            {labelFor(stage)}
          </Link>
        );
      })}
    </div>
  );
}
